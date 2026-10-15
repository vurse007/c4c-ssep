import { shiftDateString } from "@/lib/local-day";

// Streak tiers, derived in SQL by streak_tier() (migration 020).
// Participants whose longest run of consecutive completed days exceeds
// STANDARD_MAX_STREAK are "returners" and are analyzed separately so their
// extra practice doesn't skew the standard 7-day trial group.
// Keep this number in sync with the `> 10` in streak_tier().
export const STANDARD_MAX_STREAK = 10;

// Returners' first TRIAL_DAYS consecutive days are also included in the
// standard dataset (a copy; returners keep all their days). Keep in sync
// with the `<= 7` in migration 020.
export const TRIAL_DAYS = 7;

export const TIERS = [
  {
    key: "standard",
    label: `Standard (streak up to ${STANDARD_MAX_STREAK} days)`,
  },
  {
    key: "extended",
    label: `Returners (streak over ${STANDARD_MAX_STREAK} days)`,
  },
] as const;

export type TierKey = (typeof TIERS)[number]["key"];

export const DEFAULT_TIER: TierKey = "standard";

export function parseTier(value: string | null | undefined): TierKey {
  return TIERS.find((t) => t.key === value)?.key ?? DEFAULT_TIER;
}

export function tierLabel(key: string): string {
  return TIERS.find((t) => t.key === key)?.label ?? key;
}

export type TierByUser = Map<string, string>;

// Rows from deleted accounts (user_id null) have no recoverable streak and
// count as standard.
export function rowTier(
  row: { user_id?: unknown },
  tierByUser: TierByUser,
): string {
  if (typeof row.user_id === "string") {
    return tierByUser.get(row.user_id) ?? "standard";
  }
  return "standard";
}

// Ids of the workflows making up each user's first TRIAL_DAYS consecutive
// days: the first TRIAL_DAYS dates of their earliest run of >= TRIAL_DAYS
// consecutive completed dates. Mirrors trial_run_workflows() in migration 020.
export function trialRunWorkflowIds(
  workflows: {
    id?: unknown;
    user_id?: unknown;
    completion_local_date?: unknown;
  }[],
): Set<string> {
  const byUser = new Map<string, Map<string, string>>(); // user -> date -> id
  for (const w of workflows) {
    if (
      typeof w.user_id !== "string" ||
      typeof w.id !== "string" ||
      typeof w.completion_local_date !== "string"
    ) {
      continue;
    }
    const dates = byUser.get(w.user_id) ?? new Map<string, string>();
    dates.set(w.completion_local_date.slice(0, 10), w.id);
    byUser.set(w.user_id, dates);
  }

  const ids = new Set<string>();
  for (const dates of byUser.values()) {
    const sorted = [...dates.keys()].sort();
    let runStart = 0;
    for (let i = 1; i <= sorted.length; i += 1) {
      const continues =
        i < sorted.length && shiftDateString(sorted[i - 1], 1) === sorted[i];
      if (continues) continue;
      if (i - runStart >= TRIAL_DAYS) {
        for (const date of sorted.slice(runStart, runStart + TRIAL_DAYS)) {
          ids.add(dates.get(date) as string);
        }
        break;
      }
      runStart = i;
    }
  }
  return ids;
}

// True if a row belongs in the selected tier's dataset: its owner's tier
// matches, or (standard only) it is part of a returner's first TRIAL_DAYS
// consecutive days.
export function inTierDataset(
  tier: TierKey,
  rowTierValue: string,
  inTrialRun: boolean,
): boolean {
  return rowTierValue === tier || (tier === "standard" && inTrialRun);
}
