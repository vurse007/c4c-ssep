-- ============================================================
-- Official challenge attempts and pre-challenge technique data
-- Run this once after 001_challenge_results.sql.
-- ============================================================

ALTER TABLE challenge_results
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stress_management_technique text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'challenge_results_technique_values'
  ) THEN
    ALTER TABLE challenge_results
      ADD CONSTRAINT challenge_results_technique_values
      CHECK (
        stress_management_technique IS NULL
        OR stress_management_technique IN (
          'box_breathing',
          '54321_grounding',
          'emotional_resolution',
          'single_sense_anchoring'
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'challenge_results_official_technique'
  ) THEN
    ALTER TABLE challenge_results
      ADD CONSTRAINT challenge_results_official_technique
      CHECK (
        (is_official = false AND stress_management_technique IS NULL)
        OR
        (is_official = true AND stress_management_technique IS NOT NULL)
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS challenge_results_official_idx
  ON challenge_results (user_id, is_official, played_at DESC);
