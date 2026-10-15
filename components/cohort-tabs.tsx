import Link from "next/link";
import { COHORTS, type CohortKey } from "@/lib/cohorts";
import { STANDARD_MAX_STREAK, TIERS, TRIAL_DAYS, type TierKey } from "@/lib/tiers";

function pillClass(active: boolean) {
  return `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "border-border text-muted-foreground hover:border-primary/40"
  }`;
}

// Cohort selector, plus a streak-tier selector when `tier` is given.
// Each keeps the other's current value in its links.
export function CohortTabs({
  basePath,
  current,
  tier,
}: {
  basePath: string;
  current: CohortKey;
  tier?: TierKey;
}) {
  const tierParam = tier ? `&tier=${tier}` : "";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {COHORTS.map((c) => (
          <Link
            key={c.key}
            href={`${basePath}?cohort=${c.key}${tierParam}`}
            className={pillClass(c.key === current)}
          >
            {c.label}
          </Link>
        ))}
      </div>
      {tier && (
        <div className="flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <Link
              key={t.key}
              href={`${basePath}?cohort=${current}&tier=${t.key}`}
              className={pillClass(t.key === tier)}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Cohorts {tier && "and streak groups "}are never combined. Admin
        accounts are excluded from all of them.
        {tier &&
          ` A participant moves to Returners once they log more than ${STANDARD_MAX_STREAK} consecutive days; their first ${TRIAL_DAYS} consecutive days stay in Standard too.`}
      </p>
    </div>
  );
}
