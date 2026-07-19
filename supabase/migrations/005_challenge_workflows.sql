-- ============================================================
-- Resumable official challenge workflows and survey responses
-- Run this once after 004_serial_subtraction_results.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS official_challenge_workflows (
  id                          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status                      text        DEFAULT 'active' NOT NULL
                                        CHECK (status IN ('active', 'completed')),
  checkpoint                  text        DEFAULT 'challenge_selection' NOT NULL
                                        CHECK (checkpoint IN (
                                          'challenge_selection',
                                          'challenge_play',
                                          'post_survey',
                                          'completed'
                                        )),
  stress_management_technique text        NOT NULL CHECK (
                                          stress_management_technique IN (
                                            'box_breathing',
                                            '54321_grounding',
                                            'emotional_resolution',
                                            'single_sense_anchoring'
                                          )
                                        ),
  pre_stress_level            integer     NOT NULL CHECK (pre_stress_level BETWEEN 1 AND 10),
  pre_day_pace                text        NOT NULL CHECK (pre_day_pace IN (
                                          'very_slow',
                                          'steady',
                                          'busy',
                                          'hectic',
                                          'overwhelming'
                                        )),
  pre_focus_effort            text        NOT NULL CHECK (pre_focus_effort IN (
                                          'very_little',
                                          'a_little',
                                          'moderate',
                                          'a_lot',
                                          'extreme'
                                        )),
  pre_body_feelings           text[]      NOT NULL CHECK (
                                          cardinality(pre_body_feelings) > 0
                                          AND pre_body_feelings <@ ARRAY[
                                            'calm_steady',
                                            'increased_heart_rate',
                                            'restless_energetic',
                                            'tense_muscles',
                                            'feeling_tired',
                                            'difficulty_sitting_still',
                                            'perfectly_normal',
                                            'other'
                                          ]::text[]
                                        ),
  pre_body_other              text,
  selected_challenge          text        CHECK (selected_challenge IN (
                                          'wordle',
                                          'stroop',
                                          'serial-subtraction'
                                        )),
  post_stress_level           integer     CHECK (post_stress_level BETWEEN 1 AND 10),
  post_strategy_confidence    integer     CHECK (post_strategy_confidence BETWEEN 1 AND 10),
  post_noticed_changes        text[]      CHECK (
                                          post_noticed_changes IS NULL
                                          OR (
                                            cardinality(post_noticed_changes) > 0
                                            AND post_noticed_changes <@ ARRAY[
                                              'lower_heart_rate',
                                              'better_focus',
                                              'more_in_control',
                                              'less_overwhelmed',
                                              'approached_task_differently',
                                              'no_change'
                                            ]::text[]
                                          )
                                        ),
  post_future_confidence      text        CHECK (post_future_confidence IN (
                                          'not_confident_at_all',
                                          'slightly_confident',
                                          'moderately_confident',
                                          'very_confident',
                                          'extremely_confident'
                                        )),
  post_strategy_effectiveness integer     CHECK (post_strategy_effectiveness BETWEEN 1 AND 10),
  started_at                  timestamptz DEFAULT now() NOT NULL,
  updated_at                  timestamptz DEFAULT now() NOT NULL,
  completed_at                timestamptz,
  CONSTRAINT workflow_body_other CHECK (
    (
      'other' = ANY(pre_body_feelings)
      AND pre_body_other IS NOT NULL
      AND length(trim(pre_body_other)) > 0
    )
    OR
    (
      NOT ('other' = ANY(pre_body_feelings))
      AND pre_body_other IS NULL
    )
  ),
  CONSTRAINT workflow_normal_exclusive CHECK (
    NOT ('perfectly_normal' = ANY(pre_body_feelings))
    OR cardinality(pre_body_feelings) = 1
  ),
  CONSTRAINT workflow_challenge_checkpoint CHECK (
    checkpoint = 'challenge_selection'
    OR selected_challenge IS NOT NULL
  ),
  CONSTRAINT workflow_no_change_exclusive CHECK (
    post_noticed_changes IS NULL
    OR NOT ('no_change' = ANY(post_noticed_changes))
    OR cardinality(post_noticed_changes) = 1
  ),
  CONSTRAINT workflow_completion_fields CHECK (
    (
      status = 'active'
      AND checkpoint <> 'completed'
      AND completed_at IS NULL
    )
    OR
    (
      status = 'completed'
      AND checkpoint = 'completed'
      AND completed_at IS NOT NULL
      AND post_stress_level IS NOT NULL
      AND post_strategy_confidence IS NOT NULL
      AND post_noticed_changes IS NOT NULL
      AND post_future_confidence IS NOT NULL
      AND post_strategy_effectiveness IS NOT NULL
    )
  )
);

ALTER TABLE official_challenge_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge workflows"
  ON official_challenge_workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own challenge workflows"
  ON official_challenge_workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge workflows"
  ON official_challenge_workflows FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_challenge_workflow_per_user
  ON official_challenge_workflows (user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS challenge_workflows_user_updated_idx
  ON official_challenge_workflows (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE ON official_challenge_workflows TO authenticated;

ALTER TABLE challenge_results
  ADD COLUMN IF NOT EXISTS workflow_id uuid
  REFERENCES official_challenge_workflows(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS challenge_results_workflow_unique
  ON challenge_results (workflow_id)
  WHERE workflow_id IS NOT NULL;
