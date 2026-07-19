-- ============================================================
-- Serial subtraction detail results
-- Run this once after 003_stroop_results.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS serial_subtraction_results (
  id                        uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  result_id                 uuid        REFERENCES challenge_results(id) ON DELETE CASCADE NOT NULL UNIQUE,
  starting_number           integer     NOT NULL CHECK (starting_number BETWEEN 300 AND 999),
  subtraction_value         integer     NOT NULL CHECK (subtraction_value IN (4, 6, 7, 8, 9)),
  duration_seconds          integer     NOT NULL CHECK (duration_seconds = 30),
  total_responses           integer     NOT NULL CHECK (total_responses >= 0),
  correct_responses         integer     NOT NULL CHECK (correct_responses >= 0),
  distinct_errors           integer     NOT NULL CHECK (distinct_errors >= 0),
  accuracy                  numeric     NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
  average_response_time_ms  integer     NOT NULL CHECK (average_response_time_ms >= 0),
  final_submitted_value     integer CHECK (
    final_submitted_value IS NULL
    OR final_submitted_value BETWEEN 0 AND 9999
  ),
  played_at                 timestamptz DEFAULT now() NOT NULL,
  CHECK (correct_responses + distinct_errors = total_responses),
  CHECK (
    (total_responses = 0 AND final_submitted_value IS NULL)
    OR
    (total_responses > 0 AND final_submitted_value IS NOT NULL)
  )
);

ALTER TABLE serial_subtraction_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own serial subtraction results"
  ON serial_subtraction_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own serial subtraction results"
  ON serial_subtraction_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS serial_subtraction_results_user_idx
  ON serial_subtraction_results (user_id, played_at DESC);

GRANT SELECT, INSERT ON serial_subtraction_results TO authenticated;
