// Study cohorts, derived in SQL by study_cohort() (migration 019).
// Admins are a fourth value ("admin") that is always excluded from analytics,
// so it is intentionally not selectable here.
export const COHORTS = [
  { key: "in_person", label: "Attended in-person workshop" },
  { key: "remote", label: "No in-person workshop" },
  { key: "unclassified", label: "Unclassified" },
] as const;

export type CohortKey = (typeof COHORTS)[number]["key"];

export const DEFAULT_COHORT: CohortKey = "in_person";

export function parseCohort(value: string | null | undefined): CohortKey {
  return COHORTS.find((c) => c.key === value)?.key ?? DEFAULT_COHORT;
}

export function cohortLabel(key: string): string {
  if (key === "admin") return "Admin (excluded)";
  return COHORTS.find((c) => c.key === key)?.label ?? key;
}

export type CohortByUser = Map<string, string>;

// Cohort for a participant-data row: live accounts use their current cohort
// (admin_participant_cohorts); rows from deleted accounts (user_id null) use
// the value frozen at deletion (migration 019).
export function rowCohort(
  row: { user_id?: unknown; deleted_account_cohort?: unknown },
  cohortByUser: CohortByUser,
): string {
  if (typeof row.user_id === "string") {
    return cohortByUser.get(row.user_id) ?? "unclassified";
  }
  return typeof row.deleted_account_cohort === "string"
    ? row.deleted_account_cohort
    : "unclassified";
}

// Adds a `cohort` column and drops the internal deleted_account_cohort one.
export function withCohort(
  rows: Record<string, unknown>[],
  cohortByUser: CohortByUser,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const { deleted_account_cohort: _frozen, ...rest } = row;
    void _frozen;
    return { ...rest, cohort: rowCohort(row, cohortByUser) };
  });
}
