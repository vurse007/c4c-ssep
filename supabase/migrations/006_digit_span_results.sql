-- ============================================================
-- Digit span detail results + allow digit-span in workflows
-- Run this once after 005_challenge_workflows.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS digit_span_results (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  result_id             uuid        REFERENCES challenge_results(id) ON DELETE CASCADE NOT NULL UNIQUE,
  direction             text        NOT NULL CHECK (direction IN ('forward', 'backward')),
  rounds_total          integer     NOT NULL CHECK (rounds_total = 5),
  rounds_correct        integer     NOT NULL CHECK (rounds_correct BETWEEN 0 AND 5),
  longest_correct_span  integer     NOT NULL CHECK (longest_correct_span BETWEEN 0 AND 8),
  round_details         jsonb       NOT NULL,
  duration_seconds      integer     NOT NULL CHECK (duration_seconds >= 1),
  played_at             timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE digit_span_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digit span results"
  ON digit_span_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digit span results"
  ON digit_span_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS digit_span_results_user_idx
  ON digit_span_results (user_id, played_at DESC);

GRANT SELECT, INSERT ON digit_span_results TO authenticated;

-- Allow digit-span as a selected official challenge
ALTER TABLE official_challenge_workflows
  DROP CONSTRAINT IF EXISTS official_challenge_workflows_selected_challenge_check;

ALTER TABLE official_challenge_workflows
  ADD CONSTRAINT official_challenge_workflows_selected_challenge_check
  CHECK (
    selected_challenge IS NULL
    OR selected_challenge IN (
      'wordle',
      'stroop',
      'serial-subtraction',
      'digit-span'
    )
  );
