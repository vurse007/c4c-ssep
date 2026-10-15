-- ============================================================
-- Streak tiers + day-by-day trends for the admin analytics.
--
-- Problem: participants who keep practicing well past the 7-day trial
-- ("returners", e.g. 40 days of practice) would skew the averages of
-- people who did just the standard trial. Participants are therefore
-- split into two tiers by their longest run of consecutive completed days:
--
--   standard   best streak <= 10   (the normal 7-day trial group)
--   extended   best streak  > 10   (returners; analyzed on their own)
--
-- Nothing is wasted on the split: the standard dataset ALSO includes each
-- returner's first 7 consecutive days (see below; same numbering as
-- the trends). Returners keep all of their days in the extended dataset, so
-- those first 7 days appear in both - a copy, not a move. "First 7 days" =
-- the first 7 days of the returner's earliest run of 7+ consecutive completed
-- days (trial_run_workflows() below); scattered days before that run stay in
-- the extended dataset only. In the standard trends those copied days are
-- numbered 1-7 within that run. The 7 must match
-- TRIAL_DAYS in lib/tiers.ts. Participant-level views (progress table,
-- participant counts) are not copied: a returner is listed once, as a returner.
--
-- The threshold (10) must match EXTENDED_MIN_STREAK - 1 in lib/tiers.ts.
-- A participant's tier is derived live, so someone moves from standard to
-- extended the moment they log an 11th consecutive day; nothing is
-- rewritten or deleted. Rows from deleted accounts (user_id IS NULL) cannot
-- be tied to a streak and are counted as standard in the aggregates; they
-- are left out of the day-by-day trends (no way to order them by day).
--
-- Tiers are an additional filter next to the cohort filter from 019 -
-- cohorts are still never pooled.
--
-- Also adds the day-by-day trend functions behind /protected/admin/trends.
-- ============================================================

-- ── 1. Internal helpers (not granted to API roles) ───────────

-- Longest run of consecutive completed local dates per live account.
CREATE OR REPLACE FUNCTION participant_best_streaks()
RETURNS TABLE (
  streak_user_id  uuid,
  streak_best     bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH days AS (
    SELECT DISTINCT
      w.user_id AS day_user_id,
      w.completion_local_date AS day_date
    FROM official_challenge_workflows w
    WHERE w.status = 'completed'
      AND w.completion_local_date IS NOT NULL
      AND w.user_id IS NOT NULL
  ),
  ordered AS (
    SELECT
      d.day_user_id,
      d.day_date - (ROW_NUMBER() OVER (
        PARTITION BY d.day_user_id ORDER BY d.day_date
      ))::int AS grp
    FROM days d
  ),
  streaks AS (
    SELECT o.day_user_id, COUNT(*) AS streak_len
    FROM ordered o
    GROUP BY o.day_user_id, o.grp
  )
  SELECT s.day_user_id, MAX(s.streak_len)::bigint
  FROM streaks s
  GROUP BY s.day_user_id;
$$;

REVOKE ALL ON FUNCTION participant_best_streaks() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION streak_tier(p_best_streak bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN COALESCE(p_best_streak, 0) > 10 THEN 'extended' ELSE 'standard' END;
$$;

REVOKE ALL ON FUNCTION streak_tier(bigint) FROM PUBLIC, anon, authenticated;

-- The workflow behind each of a participant's first 7 consecutive days: the
-- first 7 dates of their earliest run of >= 7 consecutive completed dates.
-- trial_day is 1-7 within that run. Participants with no such run are absent.
CREATE OR REPLACE FUNCTION trial_run_workflows()
RETURNS TABLE (
  trial_workflow_id  uuid,
  trial_user_id      uuid,
  trial_day          integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH days AS (
    SELECT DISTINCT
      w.user_id AS day_user_id,
      w.completion_local_date AS day_date
    FROM official_challenge_workflows w
    WHERE w.status = 'completed'
      AND w.completion_local_date IS NOT NULL
      AND w.user_id IS NOT NULL
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
  runs AS (
    SELECT o.day_user_id, o.grp, MIN(o.day_date) AS run_start
    FROM ordered o
    GROUP BY o.day_user_id, o.grp
    HAVING COUNT(*) >= 7
  ),
  first_run AS (
    SELECT DISTINCT ON (r.day_user_id) r.day_user_id, r.grp, r.run_start
    FROM runs r
    ORDER BY r.day_user_id, r.run_start
  )
  SELECT
    w.id,
    w.user_id,
    (o.day_date - f.run_start + 1)::integer
  FROM first_run f
  JOIN ordered o ON o.day_user_id = f.day_user_id AND o.grp = f.grp
  JOIN official_challenge_workflows w
    ON w.user_id = o.day_user_id
   AND w.completion_local_date = o.day_date
   AND w.status = 'completed'
  WHERE o.day_date - f.run_start < 7;
$$;

REVOKE ALL ON FUNCTION trial_run_workflows() FROM PUBLIC, anon, authenticated;

-- Completed official runs of live accounts, numbered per participant by
-- order of completion date (day_number 1 = their first completed day).
CREATE OR REPLACE FUNCTION trend_base(p_cohort text, p_tier text)
RETURNS TABLE (
  tb_workflow_id  uuid,
  tb_day_number   integer,
  tb_pre_stress   integer,
  tb_post_stress  integer,
  tb_confidence   integer,
  tb_effectiveness integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH numbered AS (
    SELECT
      w.id AS n_id,
      w.user_id AS n_user_id,
      w.pre_stress_level AS n_pre,
      w.post_stress_level AS n_post,
      w.post_strategy_confidence AS n_conf,
      w.post_strategy_effectiveness AS n_eff,
      ROW_NUMBER() OVER (
        PARTITION BY w.user_id
        ORDER BY w.completion_local_date, w.completed_at
      )::int AS n_day
    FROM official_challenge_workflows w
    WHERE w.status = 'completed'
      AND w.completion_local_date IS NOT NULL
      AND w.user_id IS NOT NULL
  )
  SELECT
    n.n_id,
    CASE WHEN streak_tier(b.streak_best) = p_tier THEN n.n_day ELSE t.trial_day END,
    n.n_pre, n.n_post, n.n_conf, n.n_eff
  FROM numbered n
  LEFT JOIN participant_best_streaks() b ON b.streak_user_id = n.n_user_id
  LEFT JOIN trial_run_workflows() t ON t.trial_workflow_id = n.n_id
  WHERE p_cohort <> 'admin'
    AND study_cohort(n.n_user_id) = p_cohort
    AND (
      streak_tier(b.streak_best) = p_tier
      OR (p_tier = 'standard' AND t.trial_workflow_id IS NOT NULL)
    );
$$;

REVOKE ALL ON FUNCTION trend_base(text, text) FROM PUBLIC, anon, authenticated;

-- ── 2. Tier directory for the admin UI ───────────────────────
CREATE OR REPLACE FUNCTION admin_participant_tiers()
RETURNS TABLE (
  user_id      uuid,
  best_streak  bigint,
  tier         text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    u.id,
    COALESCE(b.streak_best, 0)::bigint,
    streak_tier(b.streak_best)
  FROM auth.users u
  LEFT JOIN participant_best_streaks() b ON b.streak_user_id = u.id
  WHERE is_admin();
$$;

GRANT EXECUTE ON FUNCTION admin_participant_tiers() TO authenticated;

-- ── 3. admin_participant_progress(p_cohort, p_tier) ──────────
-- Same as 019, plus a tier column and an optional tier filter
-- (NULL = both tiers). Signature changes, so drop the old one.

DROP FUNCTION IF EXISTS admin_participant_progress(text);

CREATE FUNCTION admin_participant_progress(
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

GRANT EXECUTE ON FUNCTION admin_participant_progress(text, text) TO authenticated;

-- ── 4. admin_technique_effectiveness(p_cohort, p_tier) ───────
-- Same as 019, restricted to one tier (default 'standard', which also
-- includes returners' first 7 consecutive days). Rows from deleted accounts have no
-- streak and count as standard.

DROP FUNCTION IF EXISTS admin_technique_effectiveness(text);

CREATE FUNCTION admin_technique_effectiveness(
  p_cohort text DEFAULT 'in_person',
  p_tier   text DEFAULT 'standard'
)
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
    LEFT JOIN participant_best_streaks() b ON b.streak_user_id = w.user_id
    LEFT JOIN trial_run_workflows() t ON t.trial_workflow_id = w.id
    WHERE w.status = 'completed'
      AND study_cohort(w.user_id, w.deleted_account_cohort) = p_cohort
      AND p_cohort <> 'admin'
      AND (
        streak_tier(b.streak_best) = p_tier
        OR (p_tier = 'standard' AND t.trial_workflow_id IS NOT NULL)
      )
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

GRANT EXECUTE ON FUNCTION admin_technique_effectiveness(text, text) TO authenticated;

-- ── 5. Day-by-day trends ─────────────────────────────────────
-- day_number is each participant's Nth completed day (their first
-- completed day = 1), so the curves line up people who started on
-- different calendar dates. n = completed runs at that day number
-- (= distinct participants, since only one official run counts per day).

CREATE FUNCTION admin_trend_by_day(
  p_cohort text DEFAULT 'in_person',
  p_tier   text DEFAULT 'standard'
)
RETURNS TABLE (
  day_number                   integer,
  n                            bigint,
  avg_pre_stress               numeric,
  avg_post_stress              numeric,
  avg_stress_delta             numeric,
  avg_strategy_confidence      numeric,
  avg_strategy_effectiveness   numeric
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
  SELECT
    t.tb_day_number,
    COUNT(*)::bigint AS row_count,
    ROUND(AVG(t.tb_pre_stress), 1),
    ROUND(AVG(t.tb_post_stress), 1),
    ROUND(AVG(t.tb_post_stress - t.tb_pre_stress), 1),
    ROUND(AVG(t.tb_confidence), 1),
    ROUND(AVG(t.tb_effectiveness), 1)
  FROM trend_base(p_cohort, p_tier) t
  GROUP BY t.tb_day_number
  ORDER BY t.tb_day_number;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_trend_by_day(text, text) TO authenticated;

-- Task score by day, per challenge. Scores are normalized 0-100 within
-- each challenge but are not comparable across challenges, and
-- participants pick a challenge each day, so they are never averaged
-- together.
CREATE FUNCTION admin_score_trend_by_day(
  p_cohort text DEFAULT 'in_person',
  p_tier   text DEFAULT 'standard'
)
RETURNS TABLE (
  day_number  integer,
  challenge   text,
  n           bigint,
  avg_score   numeric
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
  SELECT
    t.tb_day_number,
    cr.challenge::text,
    COUNT(*)::bigint AS row_count,
    ROUND(AVG(cr.score), 1)
  FROM trend_base(p_cohort, p_tier) t
  JOIN challenge_results cr
    ON cr.workflow_id = t.tb_workflow_id AND cr.is_official = true
  GROUP BY t.tb_day_number, cr.challenge
  ORDER BY t.tb_day_number, cr.challenge;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_score_trend_by_day(text, text) TO authenticated;
