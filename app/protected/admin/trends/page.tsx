import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CohortTabs } from "@/components/cohort-tabs";
import {
  TrendChart,
  type TrendPoint,
  type TrendSeries,
} from "@/components/trend-chart";
import { cohortLabel, parseCohort, type CohortKey } from "@/lib/cohorts";
import { parseTier, tierLabel, type TierKey } from "@/lib/tiers";
import { CHALLENGES } from "@/lib/challenges";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

// Days with fewer runs than this are still plotted (and their n shows in the
// tooltip) but flagged below, since late-day averages come from the few
// people still participating.
const MIN_DAY_SAMPLE = 5;

type DayTrend = {
  day_number: number;
  n: number;
  avg_pre_stress: number | null;
  avg_post_stress: number | null;
  avg_stress_delta: number | null;
  avg_strategy_confidence: number | null;
  avg_strategy_effectiveness: number | null;
};

type ScoreTrend = {
  day_number: number;
  challenge: string;
  n: number;
  avg_score: number | null;
};

const num = (v: number | string | null) => (v === null ? null : Number(v));

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/50 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

async function AdminTrendsContent({
  cohort,
  tier,
}: {
  cohort: CohortKey;
  tier: TierKey;
}) {
  const supabase = await createClient();
  const [daily, scores] = await Promise.all([
    supabase.rpc("admin_trend_by_day", { p_cohort: cohort, p_tier: tier }),
    supabase.rpc("admin_score_trend_by_day", {
      p_cohort: cohort,
      p_tier: tier,
    }),
  ]);
  const error = daily.error ?? scores.error;
  const days = (daily.data as DayTrend[] | null) ?? [];
  const scoreRows = (scores.data as ScoreTrend[] | null) ?? [];

  const base = days.map((d) => ({
    day: d.day_number,
    n: Number(d.n),
    pre: num(d.avg_pre_stress),
    post: num(d.avg_post_stress),
    delta: num(d.avg_stress_delta),
    confidence: num(d.avg_strategy_confidence),
    effectiveness: num(d.avg_strategy_effectiveness),
  })) satisfies TrendPoint[];

  // Pivot per-challenge scores into one row per day.
  const scoreByDay = new Map<number, TrendPoint>();
  for (const d of days) {
    scoreByDay.set(d.day_number, { day: d.day_number, n: Number(d.n) });
  }
  for (const r of scoreRows) {
    const point = scoreByDay.get(r.day_number);
    if (point) point[r.challenge] = num(r.avg_score);
  }
  const scoreData = [...scoreByDay.values()];
  const scoreSeries: TrendSeries[] = CHALLENGES.filter((c) =>
    scoreRows.some((r) => r.challenge === c.key),
  ).map((c) => ({ key: c.key, label: c.label, color: c.color }));

  const thinDays = days.filter((d) => Number(d.n) < MIN_DAY_SAMPLE);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Day-by-Day Trends
          </h1>
          <p className="text-muted-foreground mt-1">
            How each measure changes from a participant&apos;s first completed
            day onward.
          </p>
        </div>
        <Link
          href="/protected/admin"
          className="text-sm text-primary underline underline-offset-2"
        >
          ← Overview
        </Link>
      </div>

      <CohortTabs
        basePath="/protected/admin/trends"
        current={cohort}
        tier={tier}
      />

      <div className="flex items-start gap-3 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Descriptive only — read with care</p>
          <p className="mt-1 text-amber-800/90">
            Each point averages everyone who completed that participation day
            (day 1 = their first completed day), not the same people every day.
            People drop out over time, so a later-day shift can reflect who
            stayed rather than a real change. Hover a point to see its n.
            {thinDays.length > 0 && (
              <>
                {" "}
                Day{thinDays.length > 1 ? "s" : ""}{" "}
                {thinDays.map((d) => d.day_number).join(", ")} have fewer than{" "}
                {MIN_DAY_SAMPLE} runs — treat as noise. Rows from deleted
                accounts are left out.
              </>
            )}
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {cohortLabel(cohort)} · {tierLabel(tier)} · {days.length} day
            {days.length === 1 ? "" : "s"} of data
          </p>

          <ChartCard
            title="Stress Before vs. After"
            description="Average self-reported stress (0–100) at the start and end of each day's workflow."
          >
            <TrendChart
              data={base}
              yDomain={[0, 100]}
              series={[
                { key: "pre", label: "Before", color: "#9ca3af" },
                { key: "post", label: "After", color: "#1B3468" },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="Stress Change (After − Before)"
            description="Below zero means stress dropped after the coping exercise. A line trending further down over the days means the effect is getting stronger."
          >
            <TrendChart
              data={base}
              zeroLine
              series={[{ key: "delta", label: "Stress change", color: "#1B3468" }]}
            />
          </ChartCard>

          <ChartCard
            title="Strategy Confidence & Effectiveness"
            description="Post-survey self-ratings of the coping strategy."
          >
            <TrendChart
              data={base}
              yDomain={[0, 100]}
              series={[
                { key: "confidence", label: "Confidence", color: "#1B3468" },
                { key: "effectiveness", label: "Effectiveness", color: "#c9b458" },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="Task Score by Challenge"
            description="Average normalized score (0–100). Challenges are scored differently and chosen day to day, so each gets its own line and is never averaged with the others."
          >
            <TrendChart data={scoreData} yDomain={[0, 100]} series={scoreSeries} />
          </ChartCard>

          <Card className="border-border/50 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Data Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4 font-medium">Day</th>
                      <th className="py-2 pr-4 font-medium">n</th>
                      <th className="py-2 pr-4 font-medium">Before</th>
                      <th className="py-2 pr-4 font-medium">After</th>
                      <th className="py-2 pr-4 font-medium">Change</th>
                      <th className="py-2 pr-4 font-medium">Confidence</th>
                      <th className="py-2 pr-4 font-medium">Effectiveness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {base.map((d) => (
                      <tr key={d.day} className="border-b border-border/50">
                        <td className="py-2 pr-4">{d.day}</td>
                        <td className="py-2 pr-4">{d.n}</td>
                        <td className="py-2 pr-4">{d.pre ?? "—"}</td>
                        <td className="py-2 pr-4">{d.post ?? "—"}</td>
                        <td className="py-2 pr-4">{d.delta ?? "—"}</td>
                        <td className="py-2 pr-4">{d.confidence ?? "—"}</td>
                        <td className="py-2 pr-4">{d.effectiveness ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

export default async function AdminTrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string; tier?: string }>;
}) {
  const { cohort, tier } = await searchParams;
  return (
    <Suspense
      fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}
    >
      <AdminTrendsContent
        cohort={parseCohort(cohort)}
        tier={parseTier(tier)}
      />
    </Suspense>
  );
}
