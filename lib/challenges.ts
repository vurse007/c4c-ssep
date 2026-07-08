export const CHALLENGES = [
  { key: "wordle",                  label: "Wordle",             color: "#6aaa64" },
  { key: "digit-span",              label: "Digit Span",         color: "#1B3468" },
  { key: "stroop",                  label: "Stroop Task",        color: "#c9b458" },
  { key: "trier-speech",            label: "Trier Speech",       color: "#e05c5c" },
  { key: "serial-subtraction",      label: "Serial Subtraction", color: "#7c5cbf" },
  { key: "structured-list-recall",  label: "List Recall",        color: "#2eafd2" },
] as const;

export type ChallengeKey = typeof CHALLENGES[number]["key"];

export type ChartPoint = { attempt: number } & Partial<Record<ChallengeKey, number>>;
