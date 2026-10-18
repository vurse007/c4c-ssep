-- ============================================================
-- Data integrity fixes (see "Data integrity fixes" in README.md).
--
--   1. admin_participant_progress: days_completed was inflated.
--   2. Participants could rewrite or delete their own study rows by
--      calling the Supabase API directly (bypassing the app's
--      validation). Writes are now limited to the steps the app itself
--      performs, in order, and the completion day is set server-side.
--
-- No existing rows are modified or deleted by this migration.
-- ============================================================

-- ── 1. Fix days_completed in admin_participant_progress ──────
-- Since migration 017, the progress CTE joined every completed day to
-- every one of the participant's streaks before COUNT(*), so
-- days_completed came out as (days x number of separate streaks) - e.g.
-- 12 real days split into 4 runs showed as 48. best_streak, first_day,
-- last_day and finished_trial were unaffected (MAX/MIN ignore the
-- duplicated rows). Only this read-only report was wrong; no stored
-- data was changed. Best streak is now aggregated on its own and joined
-- after the day count.
--
-- Same signature and return type as migration 020, so CREATE OR REPLACE
-- keeps the existing grant.

CREATE OR REPLACE FUNCTION admin_participant_progress(
  p_cohort text DEFAULT NULL,
  p_tier   text DEFAULT NULL
)
RETURNS TABLE (
  user_id         uuid,
  first_name      text,
  last_name       text,
  email           text,
  cohort          text,
  tier            text,
  days_completed  bigint,
  best_streak     bigint,
  finished_trial  boolean,
  first_day       date,
  last_day        date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF NOT is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT DISTINCT
      w.user_id AS day_user_id,
      w.completion_local_date AS day_date
    FROM official_challenge_workflows w
    WHERE w.status = 'completed'
      AND w.completion_local_date IS NOT NULL
      AND study_cohort(w.user_id, w.deleted_account_cohort) <> 'admin'
      AND (p_cohort IS NULL OR study_cohort(w.user_id, w.deleted_account_cohort) = p_cohort)
  ),
  ordered AS (
    SELECT
      d.day_user_id,
      d.day_date,
      d.day_date - (ROW_NUMBER() OVER (
        PARTITION BY d.day_user_id ORDER BY d.day_date
      ))::int AS grp
    FROM days d
  ),
  streaks AS (
    SELECT
      o.day_user_id,
      COUNT(*) AS streak_len
    FROM ordered o
    GROUP BY o.day_user_id, o.grp
  ),
  best AS (
    SELECT
      s.day_user_id AS b_user_id,
      MAX(s.streak_len) AS b_best_streak
    FROM streaks s
    GROUP BY s.day_user_id
  ),
  progress AS (
    SELECT
      d.day_user_id AS p_user_id,
      COUNT(*) AS p_days_completed,
      MIN(d.day_date) AS p_first_day,
      MAX(d.day_date) AS p_last_day,
      COALESCE(MAX(b.b_best_streak), 0) AS p_best_streak
    FROM days d
    LEFT JOIN best b ON b.b_user_id = d.day_user_id
    GROUP BY d.day_user_id
  )
  SELECT
    p.p_user_id::uuid,
    (u.raw_user_meta_data->>'first_name')::text,
    (u.raw_user_meta_data->>'last_name')::text,
    u.email::text,
    study_cohort(p.p_user_id)::text,
    streak_tier(p.p_best_streak)::text,
    p.p_days_completed::bigint,
    p.p_best_streak::bigint,
    (p.p_best_streak >= 7)::boolean,
    p.p_first_day::date,
    p.p_last_day::date
  FROM progress p
  JOIN auth.users u ON u.id = p.p_user_id
  WHERE p_tier IS NULL OR streak_tier(p.p_best_streak) = p_tier
  ORDER BY (p.p_best_streak >= 7) DESC, p.p_days_completed DESC, p.p_last_day DESC;
END;
$$;

-- ── 2. Lock down participant writes ──────────────────────────
-- The authenticated role has direct INSERT/UPDATE/DELETE grants (the API
-- routes use the participant's own session), and the old policies only
-- checked auth.uid() = user_id. So anyone with the public key and their
-- own login could, outside the app: edit completed surveys, set any
-- completion_local_date (faking streaks), insert official results with
-- any score, or delete their official results. The policies and trigger
-- below allow exactly the writes the API routes make, in workflow order:
--
--   POST  /api/challenge-workflow   insert active workflow + coping result
--                                   (delete the workflow if that fails)
--   PATCH select_challenge          challenge_selection -> challenge_play
--   POST  /api/challenge-result     insert result + detail row (delete the
--                                   result if the detail fails), then
--                                   challenge_play -> post_survey
--   PATCH complete_post_survey      post_survey -> completed
--
-- Only requests running as the "authenticated" role are restricted. The
-- SQL editor, SECURITY DEFINER functions (e.g. the cohort freeze on
-- account deletion) and FK ON DELETE SET NULL actions are unaffected.

-- 2a. official_challenge_workflows policies
DROP POLICY IF EXISTS "Users can create own challenge workflows"
  ON official_challenge_workflows;
CREATE POLICY "Users can create own challenge workflows"
  ON official_challenge_workflows FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'active'
    AND checkpoint = 'challenge_selection'
  );

-- Completed runs can no longer be edited by participants.
DROP POLICY IF EXISTS "Users can update own challenge workflows"
  ON official_challenge_workflows;
CREATE POLICY "Users can update own challenge workflows"
  ON official_challenge_workflows FOR UPDATE
  USING (auth.uid() = user_id AND status = 'active')
  WITH CHECK (auth.uid() = user_id);

-- Only the rollback of a just-created run (before its coping exercise
-- row exists) is allowed.
DROP POLICY IF EXISTS "Users can delete own active challenge workflows"
  ON official_challenge_workflows;
CREATE POLICY "Users can delete own active challenge workflows"
  ON official_challenge_workflows FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'active'
    AND checkpoint = 'challenge_selection'
    AND NOT EXISTS (
      SELECT 1 FROM coping_exercise_results c
      WHERE c.workflow_id = official_challenge_workflows.id
    )
  );

-- 2b. Workflow transition guard
CREATE OR REPLACE FUNCTION guard_participant_workflow_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_rank_old integer;
  v_rank_new integer;
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.started_at := v_now;
    NEW.updated_at := v_now;
    NEW.selected_challenge := NULL;
    NEW.completion_local_date := NULL;
    NEW.completion_time_zone := NULL;
    NEW.deleted_account_cohort := NULL;
    RETURN NEW;
  END IF;

  -- Pre-survey answers and identity are fixed once the run starts.
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.started_at IS DISTINCT FROM OLD.started_at
    OR NEW.stress_management_technique IS DISTINCT FROM OLD.stress_management_technique
    OR NEW.pre_stress_level IS DISTINCT FROM OLD.pre_stress_level
    OR NEW.pre_current_bpm IS DISTINCT FROM OLD.pre_current_bpm
    OR NEW.pre_day_pace IS DISTINCT FROM OLD.pre_day_pace
    OR NEW.pre_focus_effort IS DISTINCT FROM OLD.pre_focus_effort
    OR NEW.pre_body_feelings IS DISTINCT FROM OLD.pre_body_feelings
    OR NEW.pre_body_other IS DISTINCT FROM OLD.pre_body_other
    OR NEW.deleted_account_cohort IS DISTINCT FROM OLD.deleted_account_cohort
  THEN
    RAISE EXCEPTION 'Pre-survey answers cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.selected_challenge IS DISTINCT FROM OLD.selected_challenge
    AND OLD.checkpoint <> 'challenge_selection'
  THEN
    RAISE EXCEPTION 'The selected challenge cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  v_rank_old := array_position(
    ARRAY['challenge_selection', 'challenge_play', 'post_survey', 'completed'],
    OLD.checkpoint
  );
  v_rank_new := array_position(
    ARRAY['challenge_selection', 'challenge_play', 'post_survey', 'completed'],
    NEW.checkpoint
  );
  IF v_rank_new < v_rank_old OR v_rank_new > v_rank_old + 1 THEN
    RAISE EXCEPTION 'Invalid workflow checkpoint change'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.checkpoint = 'post_survey' AND OLD.checkpoint = 'challenge_play'
    AND NOT EXISTS (
      SELECT 1 FROM challenge_results cr WHERE cr.workflow_id = NEW.id
    )
  THEN
    RAISE EXCEPTION 'The challenge result must be saved first'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status = 'completed' THEN
    -- Completion time and local day come from the database clock, not
    -- the request. The time zone is still the participant's browser zone.
    NEW.completed_at := v_now;
    IF EXISTS (
      SELECT 1 FROM pg_timezone_names WHERE name = NEW.completion_time_zone
    ) THEN
      NEW.completion_local_date :=
        (v_now AT TIME ZONE NEW.completion_time_zone)::date;
    ELSIF NEW.completion_local_date IS NULL
      OR abs(NEW.completion_local_date - (v_now AT TIME ZONE 'UTC')::date) > 1
    THEN
      -- Zone unknown to Postgres: keep the app's date only if plausible.
      RAISE EXCEPTION 'Invalid completion date'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    NEW.completion_local_date := NULL;
    NEW.completion_time_zone := NULL;
  END IF;

  NEW.updated_at := v_now;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_participant_workflow_write
  ON official_challenge_workflows;
CREATE TRIGGER guard_participant_workflow_write
  BEFORE INSERT OR UPDATE ON official_challenge_workflows
  FOR EACH ROW EXECUTE FUNCTION guard_participant_workflow_write();

-- 2c. challenge_results: official results only, for the participant's
-- own run that is waiting on exactly that challenge.
DROP POLICY IF EXISTS "Users can insert own results" ON challenge_results;
CREATE POLICY "Users can insert own results"
  ON challenge_results FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_official = true
    AND EXISTS (
      SELECT 1 FROM official_challenge_workflows w
      WHERE w.id = challenge_results.workflow_id
        AND w.user_id = auth.uid()
        AND w.status = 'active'
        AND w.checkpoint = 'challenge_play'
        AND w.selected_challenge = challenge_results.challenge
        AND w.stress_management_technique
          IS NOT DISTINCT FROM challenge_results.stress_management_technique
    )
  );

-- Only the rollback of a result whose detail row failed to save.
DROP POLICY IF EXISTS "Users can delete own challenge results" ON challenge_results;
CREATE POLICY "Users can delete own challenge results"
  ON challenge_results FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM official_challenge_workflows w
      WHERE w.id = challenge_results.workflow_id
        AND w.user_id = auth.uid()
        AND w.status = 'active'
        AND w.checkpoint = 'challenge_play'
    )
  );

-- 2d. Per-challenge detail rows: must belong to the participant's own
-- result for that challenge, while its run is still in challenge_play.
CREATE OR REPLACE FUNCTION can_insert_challenge_detail(
  p_result_id uuid,
  p_challenge text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM challenge_results cr
    JOIN official_challenge_workflows w ON w.id = cr.workflow_id
    WHERE cr.id = p_result_id
      AND cr.user_id = auth.uid()
      AND cr.challenge = p_challenge
      AND w.status = 'active'
      AND w.checkpoint = 'challenge_play'
  );
$$;

DROP POLICY IF EXISTS "Users can insert own wordle results" ON wordle_results;
CREATE POLICY "Users can insert own wordle results"
  ON wordle_results FOR INSERT
  WITH CHECK (auth.uid() = user_id AND can_insert_challenge_detail(result_id, 'wordle'));

DROP POLICY IF EXISTS "Users can insert own stroop results" ON stroop_results;
CREATE POLICY "Users can insert own stroop results"
  ON stroop_results FOR INSERT
  WITH CHECK (auth.uid() = user_id AND can_insert_challenge_detail(result_id, 'stroop'));

DROP POLICY IF EXISTS "Users can insert own serial subtraction results" ON serial_subtraction_results;
CREATE POLICY "Users can insert own serial subtraction results"
  ON serial_subtraction_results FOR INSERT
  WITH CHECK (auth.uid() = user_id AND can_insert_challenge_detail(result_id, 'serial-subtraction'));

DROP POLICY IF EXISTS "Users can insert own digit span results" ON digit_span_results;
CREATE POLICY "Users can insert own digit span results"
  ON digit_span_results FOR INSERT
  WITH CHECK (auth.uid() = user_id AND can_insert_challenge_detail(result_id, 'digit-span'));

DROP POLICY IF EXISTS "Users can insert own structured list recall results" ON structured_list_recall_results;
CREATE POLICY "Users can insert own structured list recall results"
  ON structured_list_recall_results FOR INSERT
  WITH CHECK (auth.uid() = user_id AND can_insert_challenge_detail(result_id, 'structured-list-recall'));

-- 2e. coping_exercise_results: only for the participant's own run that
-- was just started with the same technique.
DROP POLICY IF EXISTS "Users can insert own coping exercise results" ON coping_exercise_results;
CREATE POLICY "Users can insert own coping exercise results"
  ON coping_exercise_results FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM official_challenge_workflows w
      WHERE w.id = coping_exercise_results.workflow_id
        AND w.user_id = auth.uid()
        AND w.status = 'active'
        AND w.checkpoint = 'challenge_selection'
        AND w.stress_management_technique = coping_exercise_results.technique
    )
  );
