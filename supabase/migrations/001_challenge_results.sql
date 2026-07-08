-- ============================================================
-- Run this once in the Supabase dashboard SQL editor.
-- ============================================================

-- ── 1. Summary table (feeds the performance graph) ──────────
-- One row per attempt, per challenge. Stores only the
-- normalised 0-100 score so the graph query stays simple.

CREATE TABLE IF NOT EXISTS challenge_results (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge   text        NOT NULL,
  score       numeric     NOT NULL CHECK (score >= 0 AND score <= 100),
  played_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE challenge_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results"
  ON challenge_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own results"
  ON challenge_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS challenge_results_user_idx
  ON challenge_results (user_id, played_at DESC);

GRANT SELECT, INSERT ON challenge_results TO authenticated;


-- ── 2. Wordle detail table ───────────────────────────────────
-- Full per-game metrics. result_id links back to the summary
-- row so you can join them when building detailed stats pages.

CREATE TABLE IF NOT EXISTS wordle_results (
  id                      uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  result_id               uuid        REFERENCES challenge_results(id) ON DELETE CASCADE NOT NULL,
  target_word             text        NOT NULL,
  guesses                 integer     NOT NULL CHECK (guesses >= 1 AND guesses <= 6),
  won                     boolean     NOT NULL,
  completion_time_seconds integer     NOT NULL,
  played_at               timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE wordle_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wordle results"
  ON wordle_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wordle results"
  ON wordle_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wordle_results_user_idx
  ON wordle_results (user_id, played_at DESC);

GRANT SELECT, INSERT ON wordle_results TO authenticated;
