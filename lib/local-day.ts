const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

export function normalizeTimeZone(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 100) return null;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value;
  } catch {
    return null;
  }
}

export function getDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    ...DATE_FORMAT_OPTIONS,
    timeZone,
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function shiftDateString(date: string, days: number): string {
  const shifted = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

/** Prefer stored local completion date; fall back carefully for pre-migration rows. */
export function getWorkflowParticipationDay(workflow: {
  completion_local_date?: string | null;
  completion_time_zone?: string | null;
  completed_at?: string | null;
}): string | null {
  if (
    typeof workflow.completion_local_date === "string" &&
    workflow.completion_local_date.length >= 10
  ) {
    return workflow.completion_local_date.slice(0, 10);
  }

  if (!workflow.completed_at) return null;

  const completedAt = new Date(workflow.completed_at);
  if (Number.isNaN(completedAt.getTime())) return null;

  const timeZone = normalizeTimeZone(workflow.completion_time_zone);
  if (timeZone) return getDateInTimeZone(completedAt, timeZone);

  // Last resort: UTC calendar day (can diverge from the user's local day).
  return completedAt.toISOString().slice(0, 10);
}

/** True if the user ever completed requiredDays calendar days in a row. */
export function hasCompletedTrial(
  days: string[],
  requiredDays: number,
): boolean {
  if (requiredDays <= 0) return true;

  let streak = 0;
  let previousDay: number | null = null;

  for (const day of days) {
    const currentDay = Date.parse(`${day}T00:00:00Z`);
    streak =
      previousDay !== null && currentDay - previousDay === 86_400_000
        ? streak + 1
        : 1;

    if (streak >= requiredDays) return true;
    previousDay = currentDay;
  }

  return false;
}

/** Consecutive days ending on the latest entry, or 0 if that day is neither today nor yesterday. */
export function getCurrentStreak(days: string[], timeZone: string): number {
  if (days.length === 0) return 0;

  const today = getDateInTimeZone(new Date(), timeZone);
  const yesterday = shiftDateString(today, -1);
  const lastDay = days[days.length - 1];

  if (lastDay !== today && lastDay !== yesterday) return 0;

  let streak = 1;
  for (let i = days.length - 1; i > 0; i -= 1) {
    const currentDay = Date.parse(`${days[i]}T00:00:00Z`);
    const previousDay = Date.parse(`${days[i - 1]}T00:00:00Z`);
    if (currentDay - previousDay !== 86_400_000) break;
    streak += 1;
  }

  return streak;
}
