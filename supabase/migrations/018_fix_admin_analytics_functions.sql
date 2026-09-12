-- ============================================================
-- Fix admin_participant_progress(): its RETURNS TABLE column
-- names (user_id, days_completed, best_streak, finished_trial,
-- first_day, last_day) are also implicitly declared as PL/pgSQL
-- OUT-parameter variables inside the function body. The original
-- query referenced bare aliases with those same names (notably
-- "ORDER BY finished_trial"), which PL/pgSQL can resolve to the
-- OUT variable instead of the query's own computed column,
-- producing "structure of query does not match function result
-- type" / incorrect ordering.
--
-- Fix: give every intermediate CTE column a distinct, prefixed
-- name so nothing bare in the query text collides with an OUT
-- parameter, and cast every returned column to match its
-- declared type exactly.
-- ============================================================

-- best_streak's declared type changes from integer to bigint below
-- (to match COUNT(*)'s natural type), so CREATE OR REPLACE isn't
-- enough — Postgres refuses to change a function's return type
-- in place.
DROP FUNCTION IF EXISTS admin_participant_progress();

CREATE FUNCTION admin_participant_progress()
RETURNS TABLE (
  user_id         uuid,
  first_name      text,
  last_name       text,
  email           text,
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

GRANT EXECUTE ON FUNCTION admin_participant_progress() TO authenticated;

-- ============================================================
-- Same fix for admin_technique_effectiveness(): "ORDER BY n DESC"
-- bare-referenced the "n" OUT parameter rather than the query's
-- own COUNT(*) column. Not yet hit in the UI, but would fail the
-- same way the first time /protected/admin/insights loads.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_technique_effectiveness()
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

GRANT EXECUTE ON FUNCTION admin_technique_effectiveness() TO authenticated;
