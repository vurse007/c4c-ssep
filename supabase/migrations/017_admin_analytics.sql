-- ============================================================
-- Admin "trial progress" view: per-participant completed-day
-- count, longest streak, and whether they've hit the 7-day
-- trial. Wraps the ad-hoc SQL the study team was already running
-- by hand in the Supabase SQL editor into a callable RPC so it
-- can be shown on the admin page.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_participant_progress()
RETURNS TABLE (
  user_id         uuid,
  first_name      text,
  last_name       text,
  email           text,
  days_completed  bigint,
  best_streak     integer,
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
      w.user_id,
      w.completion_local_date AS d
    FROM official_challenge_workflows w
    WHERE w.status = 'completed'
      AND w.completion_local_date IS NOT NULL
  ),
  ordered AS (
    SELECT
      d.user_id,
      d.d,
      d.d - (ROW_NUMBER() OVER (PARTITION BY d.user_id ORDER BY d.d))::int AS grp
    FROM days d
  ),
  streaks AS (
    SELECT
      o.user_id,
      COUNT(*) AS streak_len
    FROM ordered o
    GROUP BY o.user_id, o.grp
  ),
  progress AS (
    SELECT
      d.user_id,
      COUNT(*) AS days_completed,
      MIN(d.d) AS first_day,
      MAX(d.d) AS last_day,
      COALESCE(MAX(s.streak_len), 0) AS best_streak
    FROM days d
    LEFT JOIN streaks s ON s.user_id = d.user_id
    GROUP BY d.user_id
  )
  SELECT
    p.user_id,
    u.raw_user_meta_data->>'first_name' AS first_name,
    u.raw_user_meta_data->>'last_name' AS last_name,
    u.email,
    p.days_completed,
    p.best_streak::integer,
    p.best_streak >= 7 AS finished_trial,
    p.first_day,
    p.last_day
  FROM progress p
  JOIN auth.users u ON u.id = p.user_id
  ORDER BY finished_trial DESC, p.days_completed DESC, p.last_day DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_participant_progress() TO authenticated;

-- ============================================================
-- Admin "technique effectiveness" view: the study's core
-- before/after question, broken out per coping technique —
-- self-reported stress before vs. after, task score, self-rated
-- strategy confidence/effectiveness, and the share of runs where
-- the participant reported a positive change. PRELIMINARY/
-- descriptive only (no significance testing) — the admin UI is
-- responsible for labeling it as such.
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
      c.stress_management_technique,
      c.pre_stress_level,
      c.post_stress_level,
      c.post_strategy_confidence,
      c.post_strategy_effectiveness,
      c.post_noticed_changes,
      cr.score
    FROM completed c
    LEFT JOIN challenge_results cr
      ON cr.workflow_id = c.id AND cr.is_official = true
  )
  SELECT
    s.stress_management_technique AS technique,
    COUNT(*) AS n,
    ROUND(AVG(s.pre_stress_level), 1) AS avg_pre_stress,
    ROUND(AVG(s.post_stress_level), 1) AS avg_post_stress,
    ROUND(AVG(s.post_stress_level - s.pre_stress_level), 1) AS avg_stress_delta,
    ROUND(AVG(s.score), 1) AS avg_score,
    ROUND(AVG(s.post_strategy_confidence), 1) AS avg_strategy_confidence,
    ROUND(AVG(s.post_strategy_effectiveness), 1) AS avg_strategy_effectiveness,
    ROUND(
      100.0 * COUNT(*) FILTER (
        WHERE s.post_noticed_changes IS NOT NULL
          AND NOT ('no_change' = ANY(s.post_noticed_changes))
      ) / NULLIF(COUNT(*) FILTER (WHERE s.post_noticed_changes IS NOT NULL), 0),
      1
    ) AS pct_positive_change
  FROM scored s
  GROUP BY s.stress_management_technique
  ORDER BY n DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_technique_effectiveness() TO authenticated;
