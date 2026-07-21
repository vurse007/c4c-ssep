-- ============================================================
-- Update allowed coping / stress-management techniques
-- Run this once after 010_survey_sliders_0_100.sql.
-- ============================================================

-- Remap retired techniques so existing rows stay valid
UPDATE challenge_results
SET stress_management_technique = '54321_grounding'
WHERE stress_management_technique IN (
  'emotional_resolution',
  'single_sense_anchoring'
);

UPDATE official_challenge_workflows
SET stress_management_technique = '54321_grounding'
WHERE stress_management_technique IN (
  'emotional_resolution',
  'single_sense_anchoring'
);

ALTER TABLE challenge_results
  DROP CONSTRAINT IF EXISTS challenge_results_technique_values;

ALTER TABLE challenge_results
  ADD CONSTRAINT challenge_results_technique_values
  CHECK (
    stress_management_technique IS NULL
    OR stress_management_technique IN (
      '54321_grounding',
      'box_breathing',
      'aromatherapy',
      'gratitude_exercise',
      'cold_therapy'
    )
  );

ALTER TABLE official_challenge_workflows
  DROP CONSTRAINT IF EXISTS official_challenge_workflows_stress_management_technique_check;

ALTER TABLE official_challenge_workflows
  ADD CONSTRAINT official_challenge_workflows_stress_management_technique_check
  CHECK (
    stress_management_technique IN (
      '54321_grounding',
      'box_breathing',
      'aromatherapy',
      'gratitude_exercise',
      'cold_therapy'
    )
  );
