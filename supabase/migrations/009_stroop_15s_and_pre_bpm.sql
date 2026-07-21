-- ============================================================
-- Stroop 15s duration + pre-challenge BPM
-- Run this once after 008_preserve_data_on_account_delete.sql.
-- ============================================================

ALTER TABLE stroop_results
  DROP CONSTRAINT IF EXISTS stroop_results_duration_seconds_check;

ALTER TABLE stroop_results
  ADD CONSTRAINT stroop_results_duration_seconds_check
  CHECK (duration_seconds = 15);

ALTER TABLE official_challenge_workflows
  ADD COLUMN IF NOT EXISTS pre_current_bpm integer
  CHECK (
    pre_current_bpm IS NULL
    OR (pre_current_bpm >= 30 AND pre_current_bpm <= 220)
  );

-- Existing active/completed workflows may have null BPM (collected going forward).
-- New submissions from the app always send a value.
