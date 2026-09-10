-- ============================================================
-- Add Self-EmRes as an allowed coping / stress-management technique
-- ============================================================

ALTER TABLE challenge_results
  DROP CONSTRAINT IF EXISTS challenge_results_technique_values;

ALTER TABLE challenge_results
  ADD CONSTRAINT challenge_results_technique_values
  CHECK (
    stress_management_technique IS NULL
    OR stress_management_technique IN (
      'emres',
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
      'emres',
      '54321_grounding',
      'box_breathing',
      'aromatherapy',
      'gratitude_exercise',
      'cold_therapy'
    )
  );

ALTER TABLE coping_exercise_results
  DROP CONSTRAINT IF EXISTS coping_exercise_results_technique_check;

ALTER TABLE coping_exercise_results
  ADD CONSTRAINT coping_exercise_results_technique_check
  CHECK (
    technique IN (
      'emres',
      '54321_grounding',
      'box_breathing',
      'aromatherapy',
      'gratitude_exercise',
      'cold_therapy'
    )
  );
