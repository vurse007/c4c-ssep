-- ============================================================
-- Coping / grounding exercise session details
-- Kept separate from official_challenge_workflows so the daily
-- challenge table stays lean. One session per official workflow.
-- ============================================================

CREATE TABLE IF NOT EXISTS coping_exercise_results (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  workflow_id         uuid        REFERENCES official_challenge_workflows(id) ON DELETE SET NULL,
  technique           text        NOT NULL CHECK (
                                    technique IN (
                                      '54321_grounding',
                                      'box_breathing',
                                      'aromatherapy',
                                      'gratitude_exercise',
                                      'cold_therapy'
                                    )
                                  ),
  duration_seconds    integer     NOT NULL CHECK (duration_seconds BETWEEN 1 AND 1800),
  feeling             text        CHECK (
                                    feeling IS NULL
                                    OR feeling IN ('calmer', 'the_same', 'more_activated')
                                  ),
  feeling_note        text        CHECK (
                                    feeling_note IS NULL
                                    OR length(trim(feeling_note)) BETWEEN 1 AND 250
                                  ),
  details             jsonb       NOT NULL,
  completed_at        timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS coping_exercise_results_workflow_unique
  ON coping_exercise_results (workflow_id)
  WHERE workflow_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS coping_exercise_results_user_idx
  ON coping_exercise_results (user_id, completed_at DESC);

ALTER TABLE coping_exercise_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coping exercise results"
  ON coping_exercise_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coping exercise results"
  ON coping_exercise_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON coping_exercise_results TO authenticated;

-- Needed so a failed exercise insert can roll back the new workflow row.
GRANT DELETE ON official_challenge_workflows TO authenticated;

DROP POLICY IF EXISTS "Users can delete own active challenge workflows"
  ON official_challenge_workflows;

CREATE POLICY "Users can delete own active challenge workflows"
  ON official_challenge_workflows FOR DELETE
  USING (auth.uid() = user_id AND status = 'active');
