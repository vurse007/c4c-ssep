-- ============================================================
-- Stroop detail results
-- Run this once after 002_official_attempts.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS stroop_results (
  id                        uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  result_id                 uuid        REFERENCES challenge_results(id) ON DELETE CASCADE NOT NULL UNIQUE,
  duration_seconds          integer     NOT NULL CHECK (duration_seconds = 60),
  total_responses           integer     NOT NULL CHECK (total_responses >= 0),
  correct_responses         integer     NOT NULL CHECK (correct_responses >= 0),
  incorrect_responses       integer     NOT NULL CHECK (incorrect_responses >= 0),
  accuracy                  numeric     NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
  average_response_time_ms  integer     NOT NULL CHECK (average_response_time_ms >= 0),
  congruent_trials          integer     NOT NULL CHECK (congruent_trials >= 0),
  congruent_correct         integer     NOT NULL CHECK (congruent_correct >= 0),
  incongruent_trials        integer     NOT NULL CHECK (incongruent_trials >= 0),
  incongruent_correct       integer     NOT NULL CHECK (incongruent_correct >= 0),
  played_at                 timestamptz DEFAULT now() NOT NULL,
  CHECK (correct_responses + incorrect_responses = total_responses),
  CHECK (congruent_trials + incongruent_trials = total_responses),
  CHECK (congruent_correct + incongruent_correct = correct_responses),
  CHECK (congruent_correct <= congruent_trials),
  CHECK (incongruent_correct <= incongruent_trials)
);

ALTER TABLE stroop_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stroop results"
  ON stroop_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stroop results"
  ON stroop_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allows the API to remove a summary row if its detail insert fails.
CREATE POLICY "Users can delete own challenge results"
  ON challenge_results FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS stroop_results_user_idx
  ON stroop_results (user_id, played_at DESC);

GRANT SELECT, INSERT ON stroop_results TO authenticated;
GRANT DELETE ON challenge_results TO authenticated;
