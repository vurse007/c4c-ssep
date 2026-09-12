export const ADMIN_TABLES = [
  { key: "official_challenge_workflows", label: "Official Workflows (surveys)" },
  { key: "challenge_results", label: "Challenge Results (all attempts)" },
  { key: "coping_exercise_results", label: "Coping Exercise Results" },
  { key: "wordle_results", label: "Wordle Details" },
  { key: "stroop_results", label: "Stroop Details" },
  { key: "serial_subtraction_results", label: "Serial Subtraction Details" },
  { key: "digit_span_results", label: "Digit Span Details" },
  { key: "structured_list_recall_results", label: "Structured List Recall Details" },
] as const;

export type AdminTableKey = (typeof ADMIN_TABLES)[number]["key"];

export function isAdminTableKey(value: string): value is AdminTableKey {
  return ADMIN_TABLES.some((table) => table.key === value);
}
