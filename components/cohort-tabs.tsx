import Link from "next/link";
import { COHORTS, type CohortKey } from "@/lib/cohorts";

export function CohortTabs({
  basePath,
  current,
}: {
  basePath: string;
  current: CohortKey;
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {COHORTS.map((c) => (
          <Link
            key={c.key}
            href={`${basePath}?cohort=${c.key}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              c.key === current
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Cohorts are never combined. Admin accounts are excluded from all of
        them.
      </p>
    </div>
  );
}
