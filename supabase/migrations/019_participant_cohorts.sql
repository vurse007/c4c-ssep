-- ============================================================
-- Study cohorts: record whether each participant has attended an
-- in-person C4C workshop (asked at sign-up) so remote-only
-- participants can be analyzed separately, and exclude admins from
-- every cohort in the admin analytics.
--
-- Cohorts (see study_cohort() below):
--   in_person    attended_in_person_workshop = true
--   remote       attended_in_person_workshop = false
--   unclassified no answer on file
--   admin        in admin_users — never counted in any cohort
--
-- Every account that exists when this migration runs is recorded as
-- having attended in person (confirmed by the study owner). Rows already
-- orphaned by an earlier account deletion (user_id IS NULL) are treated
-- the same way, since they came from those pre-existing accounts.
--
-- Account deletion: migration 008 keeps a deleted user's data rows with
-- user_id nulled. A BEFORE DELETE trigger below freezes the user's cohort
-- onto their rows (deleted_account_cohort) first, so deleted participants
-- stay in their original cohort.
--
-- To change someone's classification later, run in the SQL editor:
--   INSERT INTO participant_profiles (user_id, attended_in_person_workshop)
--   VALUES ('<auth-uid>', true)   -- or false
--   ON CONFLICT (user_id) DO UPDATE
--     SET attended_in_person_workshop = EXCLUDED.attended_in_person_workshop;
-- ============================================================

-- ── 1. Profile table ─────────────────────────────────────────
-- Participants can read their own row but have no INSERT/UPDATE/DELETE
-- policy, so the answer can't be changed from the client afterwards.
-- (The sign-up answer is also copied into auth user_metadata, which the
-- user CAN edit — never use that copy for analysis.)

CREATE TABLE IF NOT EXISTS participant_profiles (
  user_id                      uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  attended_in_person_workshop  boolean,
  created_at                   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE participant_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own participant_profile"
  ON participant_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all participant_profiles"
  ON participant_profiles FOR SELECT
  USING (is_admin());

-- ── 2. Create the profile row at sign-up ─────────────────────
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO participant_profiles (user_id, attended_in_person_workshop)
  VALUES (
    NEW.id,
    CASE NEW.raw_user_meta_data->>'attended_in_person_workshop'
      WHEN 'true' THEN true
      WHEN 'false' THEN false
      ELSE NULL
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION handle_new_user_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- Everyone who already has an account attended in person.
INSERT INTO participant_profiles (user_id, attended_in_person_workshop)
SELECT u.id, true FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- ── 3. Cohort helper ─────────────────────────────────────────
-- Internal only (not granted to API roles): it would otherwise let any
-- logged-in user probe whether an arbitrary uid is an admin. The admin_*
-- functions below are SECURITY DEFINER and call it as the owner.

-- p_deleted_cohort is the frozen value from rows whose account was deleted
-- (user_id IS NULL); it is ignored while the account still exists.
CREATE OR REPLACE FUNCTION study_cohort(p_user_id uuid, p_deleted_cohort text DEFAULT NULL)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN p_user_id IS NULL THEN COALESCE(p_deleted_cohort, 'unclassified')
    WHEN EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = p_user_id) THEN 'admin'
    ELSE COALESCE(
      (SELECT CASE p.attended_in_person_workshop
                WHEN true THEN 'in_person'
                WHEN false THEN 'remote'
              END
       FROM participant_profiles p
       WHERE p.user_id = p_user_id),
      'unclassified'
    )
  END;
$$;

REVOKE ALL ON FUNCTION study_cohort(uuid, text) FROM PUBLIC, anon, authenticated;

-- ── 3b. Preserve cohort across account deletion ──────────────
-- FK ON DELETE SET NULL actions run as AFTER triggers, so this BEFORE
-- DELETE trigger still sees the user's profile and admin status.

ALTER TABLE challenge_results               ADD COLUMN IF NOT EXISTS deleted_account_cohort text;
ALTER TABLE wordle_results                  ADD COLUMN IF NOT EXISTS deleted_account_cohort text;
ALTER TABLE stroop_results                  ADD COLUMN IF NOT EXISTS deleted_account_cohort text;
ALTER TABLE serial_subtraction_results      ADD COLUMN IF NOT EXISTS deleted_account_cohort text;
ALTER TABLE digit_span_results              ADD COLUMN IF NOT EXISTS deleted_account_cohort text;
ALTER TABLE structured_list_recall_results  ADD COLUMN IF NOT EXISTS deleted_account_cohort text;
ALTER TABLE official_challenge_workflows    ADD COLUMN IF NOT EXISTS deleted_account_cohort text;
ALTER TABLE coping_exercise_results         ADD COLUMN IF NOT EXISTS deleted_account_cohort text;

-- Rows already orphaned by earlier deletions: treat as in-person (see header).
UPDATE challenge_results               SET deleted_account_cohort = 'in_person' WHERE user_id IS NULL AND deleted_account_cohort IS NULL;
UPDATE wordle_results                  SET deleted_account_cohort = 'in_person' WHERE user_id IS NULL AND deleted_account_cohort IS NULL;
UPDATE stroop_results                  SET deleted_account_cohort = 'in_person' WHERE user_id IS NULL AND deleted_account_cohort IS NULL;
UPDATE serial_subtraction_results      SET deleted_account_cohort = 'in_person' WHERE user_id IS NULL AND deleted_account_cohort IS NULL;
UPDATE digit_span_results              SET deleted_account_cohort = 'in_person' WHERE user_id IS NULL AND deleted_account_cohort IS NULL;
UPDATE structured_list_recall_results  SET deleted_account_cohort = 'in_person' WHERE user_id IS NULL AND deleted_account_cohort IS NULL;
UPDATE official_challenge_workflows    SET deleted_account_cohort = 'in_person' WHERE user_id IS NULL AND deleted_account_cohort IS NULL;
UPDATE coping_exercise_results         SET deleted_account_cohort = 'in_person' WHERE user_id IS NULL AND deleted_account_cohort IS NULL;

CREATE OR REPLACE FUNCTION freeze_cohort_before_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cohort text := study_cohort(OLD.id);
BEGIN
  UPDATE challenge_results               SET deleted_account_cohort = v_cohort WHERE user_id = OLD.id;
  UPDATE wordle_results                  SET deleted_account_cohort = v_cohort WHERE user_id = OLD.id;
  UPDATE stroop_results                  SET deleted_account_cohort = v_cohort WHERE user_id = OLD.id;
  UPDATE serial_subtraction_results      SET deleted_account_cohort = v_cohort WHERE user_id = OLD.id;
  UPDATE digit_span_results              SET deleted_account_cohort = v_cohort WHERE user_id = OLD.id;
  UPDATE structured_list_recall_results  SET deleted_account_cohort = v_cohort WHERE user_id = OLD.id;
  UPDATE official_challenge_workflows    SET deleted_account_cohort = v_cohort WHERE user_id = OLD.id;
  UPDATE coping_exercise_results         SET deleted_account_cohort = v_cohort WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION freeze_cohort_before_user_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_deleted_freeze_cohort ON auth.users;
CREATE TRIGGER on_auth_user_deleted_freeze_cohort
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION freeze_cohort_before_user_delete();

-- ── 4. Cohort directory for the admin UI ─────────────────────
CREATE OR REPLACE FUNCTION admin_participant_cohorts()
RETURNS TABLE (
  user_id  uuid,
  cohort   text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id, study_cohort(u.id)
  FROM auth.users u
  WHERE is_admin();
$$;

GRANT EXECUTE ON FUNCTION admin_participant_cohorts() TO authenticated;

-- ── 5. admin_participant_progress(p_cohort) ──────────────────
-- Same logic as migration 018, plus: admins are always excluded, rows are
-- limited to p_cohort (NULL = every non-admin cohort), and the cohort is
-- returned. Return type changes, so the old function must be dropped.

DROP FUNCTION IF EXISTS admin_participant_progress();

CREATE FUNCTION admin_participant_progress(p_cohort text DEFAULT NULL)
RETURNS TABLE (
  user_id         uuid,
  first_name      text,
  last_name       text,
  email           text,
  cohort          text,
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
  progress AS (
    SELECT
      d.day_user_id AS p_user_id,
      COUNT(*) AS p_days_completed,
      MIN(d.day_date) AS p_first_day,
      MAX(d.day_date) AS p_last_day,
      COALESCE(MAX(s.streak_len), 0) AS p_best_streak
    FROM days d
    LEFT JOIN streaks s ON s.day_user_id = d.day_user_id
    GROUP BY d.day_user_id
  )
  SELECT
    p.p_user_id::uuid,
    (u.raw_user_meta_data->>'first_name')::text,
    (u.raw_user_meta_data->>'last_name')::text,
    u.email::text,
    study_cohort(p.p_user_id)::text,
    p.p_days_completed::bigint,
    p.p_best_streak::bigint,
    (p.p_best_streak >= 7)::boolean,
    p.p_first_day::date,
    p.p_last_day::date
  FROM progress p
  JOIN auth.users u ON u.id = p.p_user_id
  ORDER BY (p.p_best_streak >= 7) DESC, p.p_days_completed DESC, p.p_last_day DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_participant_progress(text) TO authenticated;

-- ── 6. admin_technique_effectiveness(p_cohort) ───────────────
-- Same logic as migration 018, restricted to one cohort (default
-- 'in_person') with admins always excluded. Cohorts are never pooled:
-- the remote-only group is meant to be analyzed on its own.

DROP FUNCTION IF EXISTS admin_technique_effectiveness();

CREATE FUNCTION admin_technique_effectiveness(p_cohort text DEFAULT 'in_person')
RETURNS TABLE (
  technique                   text,
  n                            bigint,
  avg_pre_stress               numeric,
  avg_post_stress              numeric,
  avg_stress_delta             numeric,
  avg_score                    numeric,
  avg_strategy_confidence      numeric,
  avg_strategy_effectiveness   numeric,
  pct_positive_change          numeric
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
  WITH completed AS (
    SELECT w.*
    FROM official_challenge_workflows w
    WHERE w.status = 'completed'
      AND study_cohort(w.user_id, w.deleted_account_cohort) = p_cohort
      AND p_cohort <> 'admin'
  ),
  scored AS (
    SELECT
      c.stress_management_technique AS s_technique,
      c.pre_stress_level AS s_pre_stress,
      c.post_stress_level AS s_post_stress,
      c.post_strategy_confidence AS s_confidence,
      c.post_strategy_effectiveness AS s_effectiveness,
      c.post_noticed_changes AS s_noticed_changes,
      cr.score AS s_score
    FROM completed c
    LEFT JOIN challenge_results cr
      ON cr.workflow_id = c.id AND cr.is_official = true
  )
  SELECT
    s.s_technique::text,
    COUNT(*)::bigint AS row_count,
    ROUND(AVG(s.s_pre_stress), 1) AS avg_pre_stress,
    ROUND(AVG(s.s_post_stress), 1) AS avg_post_stress,
    ROUND(AVG(s.s_post_stress - s.s_pre_stress), 1) AS avg_stress_delta,
    ROUND(AVG(s.s_score), 1) AS avg_score,
    ROUND(AVG(s.s_confidence), 1) AS avg_strategy_confidence,
    ROUND(AVG(s.s_effectiveness), 1) AS avg_strategy_effectiveness,
    ROUND(
      100.0 * COUNT(*) FILTER (
        WHERE s.s_noticed_changes IS NOT NULL
          AND NOT ('no_change' = ANY(s.s_noticed_changes))
      ) / NULLIF(COUNT(*) FILTER (WHERE s.s_noticed_changes IS NOT NULL), 0),
      1
    ) AS pct_positive_change
  FROM scored s
  GROUP BY s.s_technique
  ORDER BY row_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_technique_effectiveness(text) TO authenticated;
