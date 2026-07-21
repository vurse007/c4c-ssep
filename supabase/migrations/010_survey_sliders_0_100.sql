-- ============================================================
-- Survey sliders: 1–10 → 0–100 (%)
-- Run this once after 009_stroop_15s_and_pre_bpm.sql.
-- ============================================================

ALTER TABLE official_challenge_workflows
  DROP CONSTRAINT IF EXISTS official_challenge_workflows_pre_stress_level_check;
ALTER TABLE official_challenge_workflows
  DROP CONSTRAINT IF EXISTS official_challenge_workflows_post_stress_level_check;
ALTER TABLE official_challenge_workflows
  DROP CONSTRAINT IF EXISTS official_challenge_workflows_post_strategy_confidence_check;
ALTER TABLE official_challenge_workflows
  DROP CONSTRAINT IF EXISTS official_challenge_workflows_post_strategy_effectiveness_check;

ALTER TABLE official_challenge_workflows
  ADD CONSTRAINT official_challenge_workflows_pre_stress_level_check
    CHECK (pre_stress_level BETWEEN 0 AND 100);
ALTER TABLE official_challenge_workflows
  ADD CONSTRAINT official_challenge_workflows_post_stress_level_check
    CHECK (
      post_stress_level IS NULL
      OR post_stress_level BETWEEN 0 AND 100
    );
ALTER TABLE official_challenge_workflows
  ADD CONSTRAINT official_challenge_workflows_post_strategy_confidence_check
    CHECK (
      post_strategy_confidence IS NULL
      OR post_strategy_confidence BETWEEN 0 AND 100
    );
ALTER TABLE official_challenge_workflows
  ADD CONSTRAINT official_challenge_workflows_post_strategy_effectiveness_check
    CHECK (
      post_strategy_effectiveness IS NULL
      OR post_strategy_effectiveness BETWEEN 0 AND 100
    );
