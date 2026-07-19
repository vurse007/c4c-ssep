-- ============================================================
-- Preserve study data when an auth account is deleted.
-- user_id is nulled instead of cascading deletes.
-- ============================================================

ALTER TABLE challenge_results
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE wordle_results
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE stroop_results
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE serial_subtraction_results
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE digit_span_results
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE structured_list_recall_results
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE official_challenge_workflows
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE challenge_results
  DROP CONSTRAINT IF EXISTS challenge_results_user_id_fkey;
ALTER TABLE challenge_results
  ADD CONSTRAINT challenge_results_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE wordle_results
  DROP CONSTRAINT IF EXISTS wordle_results_user_id_fkey;
ALTER TABLE wordle_results
  ADD CONSTRAINT wordle_results_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE stroop_results
  DROP CONSTRAINT IF EXISTS stroop_results_user_id_fkey;
ALTER TABLE stroop_results
  ADD CONSTRAINT stroop_results_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE serial_subtraction_results
  DROP CONSTRAINT IF EXISTS serial_subtraction_results_user_id_fkey;
ALTER TABLE serial_subtraction_results
  ADD CONSTRAINT serial_subtraction_results_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE digit_span_results
  DROP CONSTRAINT IF EXISTS digit_span_results_user_id_fkey;
ALTER TABLE digit_span_results
  ADD CONSTRAINT digit_span_results_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE structured_list_recall_results
  DROP CONSTRAINT IF EXISTS structured_list_recall_results_user_id_fkey;
ALTER TABLE structured_list_recall_results
  ADD CONSTRAINT structured_list_recall_results_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE official_challenge_workflows
  DROP CONSTRAINT IF EXISTS official_challenge_workflows_user_id_fkey;
ALTER TABLE official_challenge_workflows
  ADD CONSTRAINT official_challenge_workflows_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
