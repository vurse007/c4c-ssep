-- ============================================================
-- Limit official challenge completion to one local day per user.
-- Existing rows remain NULL so historical duplicate days do not
-- prevent this migration from being applied.
-- ============================================================

ALTER TABLE official_challenge_workflows
  ADD COLUMN IF NOT EXISTS completion_local_date date,
  ADD COLUMN IF NOT EXISTS completion_time_zone text;

CREATE UNIQUE INDEX IF NOT EXISTS one_completed_challenge_per_local_day
  ON official_challenge_workflows (user_id, completion_local_date)
  WHERE status = 'completed' AND completion_local_date IS NOT NULL;
