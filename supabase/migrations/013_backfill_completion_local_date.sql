-- ============================================================
-- Backfill completion_local_date for completed workflows that
-- predate migration 012 (column exists but value is still NULL).
--
-- No original browser time zone was stored for those rows, so
-- we infer the UTC calendar day from completed_at. That can be
-- off by one local day near midnight, but is better than NULL.
--
-- Skips inferred dates that would collide with an existing
-- (user_id, completion_local_date) unique row.
-- ============================================================

WITH ranked AS (
  SELECT
    w.id,
    (w.completed_at AT TIME ZONE 'UTC')::date AS inferred_date,
    ROW_NUMBER() OVER (
      PARTITION BY w.user_id, (w.completed_at AT TIME ZONE 'UTC')::date
      ORDER BY w.completed_at, w.id
    ) AS rn
  FROM official_challenge_workflows w
  WHERE w.status = 'completed'
    AND w.completed_at IS NOT NULL
    AND w.completion_local_date IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM official_challenge_workflows existing
      WHERE existing.user_id IS NOT DISTINCT FROM w.user_id
        AND existing.status = 'completed'
        AND existing.completion_local_date =
          (w.completed_at AT TIME ZONE 'UTC')::date
    )
)
UPDATE official_challenge_workflows w
SET
  completion_local_date = ranked.inferred_date,
  completion_time_zone = COALESCE(w.completion_time_zone, 'UTC')
FROM ranked
WHERE w.id = ranked.id
  AND ranked.rn = 1;
