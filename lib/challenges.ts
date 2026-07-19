export const CHALLENGES = [
  {
    key: "digit-span",
    label: "Digit Span",
    description:
      "Test and expand your working memory by recalling sequences of digits in order.",
    color: "#1B3468",
  },
  {
    key: "stroop",
    label: "Stroop Task",
    description:
      "Identify the ink color of color words while ignoring the word's meaning.",
    color: "#c9b458",
  },
  {
    key: "wordle",
    label: "Wordle",
    description:
      "Guess the hidden word in six tries using process-of-elimination under time pressure.",
    color: "#6aaa64",
  },
  {
    key: "serial-subtraction",
    label: "Serial Subtraction",
    description:
      "Count backwards from a starting number by a fixed interval as quickly as possible.",
    color: "#7c5cbf",
  },
  {
    key: "structured-list-recall",
    label: "Structured List Recall",
    description:
      "Memorize and reproduce a structured list of items after a brief delay.",
    color: "#2eafd2",
  },
] as const;

export type ChallengeKey = typeof CHALLENGES[number]["key"];

export type ChartPoint = { attempt: number } & Partial<Record<ChallengeKey, number>>;
