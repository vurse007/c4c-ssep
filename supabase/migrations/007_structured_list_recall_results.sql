-- ============================================================
-- Structured list recall + digit-span constraint fix
-- Run this once after 006_digit_span_results.sql.
-- ============================================================

-- Fix digit_span_results checks to match current game (5 rounds, lengths 4–8)
ALTER TABLE digit_span_results
  DROP CONSTRAINT IF EXISTS digit_span_results_rounds_total_check;
ALTER TABLE digit_span_results
  DROP CONSTRAINT IF EXISTS digit_span_results_rounds_correct_check;
ALTER TABLE digit_span_results
  DROP CONSTRAINT IF EXISTS digit_span_results_longest_correct_span_check;

ALTER TABLE digit_span_results
  ADD CONSTRAINT digit_span_results_rounds_total_check
    CHECK (rounds_total = 5);
ALTER TABLE digit_span_results
  ADD CONSTRAINT digit_span_results_rounds_correct_check
    CHECK (rounds_correct BETWEEN 0 AND 5);
ALTER TABLE digit_span_results
  ADD CONSTRAINT digit_span_results_longest_correct_span_check
    CHECK (longest_correct_span BETWEEN 0 AND 8);

CREATE TABLE IF NOT EXISTS structured_list_recall_results (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  result_id         uuid        REFERENCES challenge_results(id) ON DELETE CASCADE NOT NULL UNIQUE,
  levels_total      integer     NOT NULL CHECK (levels_total = 2),
  items_total       integer     NOT NULL CHECK (items_total = 21),
  items_correct     integer     NOT NULL CHECK (items_correct BETWEEN 0 AND 21),
  level_details     jsonb       NOT NULL,
  duration_seconds  integer     NOT NULL CHECK (duration_seconds >= 1),
  played_at         timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE structured_list_recall_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own structured list recall results"
  ON structured_list_recall_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own structured list recall results"
  ON structured_list_recall_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS structured_list_recall_results_user_idx
  ON structured_list_recall_results (user_id, played_at DESC);

GRANT SELECT, INSERT ON structured_list_recall_results TO authenticated;

-- Allow structured-list-recall (and keep digit-span) as selected challenges
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
      'digit-span',
      'structured-list-recall'
    )
  );
