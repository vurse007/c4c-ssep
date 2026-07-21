import type { StressTechniqueKey } from "@/lib/stress-techniques";

export const DAY_PACE_OPTIONS = [
  { key: "very_slow", label: "Very slow" },
  { key: "steady", label: "Steady" },
  { key: "busy", label: "Busy" },
  { key: "hectic", label: "Hectic" },
  { key: "overwhelming", label: "Overwhelming" },
] as const;

export const FOCUS_EFFORT_OPTIONS = [
  { key: "very_little", label: "Very little" },
  { key: "a_little", label: "A little" },
  { key: "moderate", label: "Moderate" },
  { key: "a_lot", label: "A lot" },
  { key: "extreme", label: "Extreme" },
] as const;

export const BODY_FEELING_OPTIONS = [
  { key: "calm_steady", label: "Calm/steady" },
  { key: "increased_heart_rate", label: "Increased heart rate" },
  { key: "restless_energetic", label: "Restless/energetic" },
  { key: "tense_muscles", label: "Tense muscles" },
  { key: "feeling_tired", label: "Feeling tired" },
  {
    key: "difficulty_sitting_still",
    label: "Difficulty sitting still",
  },
  { key: "perfectly_normal", label: "Perfectly Normal" },
  { key: "other", label: "Other" },
] as const;

export const NOTICED_CHANGE_OPTIONS = [
  { key: "lower_heart_rate", label: "My heart rate felt lower" },
  { key: "better_focus", label: "I was able to focus better" },
  { key: "more_in_control", label: "I felt more in control" },
  { key: "less_overwhelmed", label: "I felt less overwhelmed" },
  {
    key: "approached_task_differently",
    label: "I approached the task differently",
  },
  { key: "no_change", label: "I did not notice a change" },
] as const;

export const FUTURE_CONFIDENCE_OPTIONS = [
  { key: "not_confident_at_all", label: "Not confident at all" },
  { key: "slightly_confident", label: "Slightly confident" },
  { key: "moderately_confident", label: "Moderately confident" },
  { key: "very_confident", label: "Very confident" },
  { key: "extremely_confident", label: "Extremely confident" },
] as const;

export const PLAYABLE_CHALLENGES = [
  "wordle",
  "stroop",
  "serial-subtraction",
  "digit-span",
  "structured-list-recall",
] as const;

export type DayPace = (typeof DAY_PACE_OPTIONS)[number]["key"];
export type FocusEffort =
  (typeof FOCUS_EFFORT_OPTIONS)[number]["key"];
export type BodyFeeling =
  (typeof BODY_FEELING_OPTIONS)[number]["key"];
export type NoticedChange =
  (typeof NOTICED_CHANGE_OPTIONS)[number]["key"];
export type FutureConfidence =
  (typeof FUTURE_CONFIDENCE_OPTIONS)[number]["key"];
export type PlayableChallenge = (typeof PLAYABLE_CHALLENGES)[number];
export type WorkflowCheckpoint =
  | "challenge_selection"
  | "challenge_play"
  | "post_survey"
  | "completed";

export type PreSurveyData = {
  stress_management_technique: StressTechniqueKey;
  pre_stress_level: number;
  pre_current_bpm: number;
  pre_day_pace: DayPace;
  pre_focus_effort: FocusEffort;
  pre_body_feelings: BodyFeeling[];
  pre_body_other: string | null;
};

export type PostSurveyData = {
  post_stress_level: number;
  post_strategy_confidence: number;
  post_noticed_changes: NoticedChange[];
  post_future_confidence: FutureConfidence;
  post_strategy_effectiveness: number;
};

export type ChallengeWorkflow = PreSurveyData &
  Partial<PostSurveyData> & {
    id: string;
    user_id: string;
    status: "active" | "completed";
    checkpoint: WorkflowCheckpoint;
    selected_challenge: PlayableChallenge | null;
    started_at: string;
    updated_at: string;
    completed_at: string | null;
  };

export function isOption<T extends string>(
  value: unknown,
  options: readonly { key: T }[],
): value is T {
  return (
    typeof value === "string" &&
    options.some((option) => option.key === value)
  );
}

export function isOptionArray<T extends string>(
  value: unknown,
  options: readonly { key: T }[],
): value is T[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every((item) => isOption(item, options))
  );
}

export function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}
