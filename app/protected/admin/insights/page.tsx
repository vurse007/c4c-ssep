import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STRESS_TECHNIQUES } from "@/lib/stress-techniques";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

// Below this many completed runs for a technique (or overall), treat the
// numbers as too thin to act on — flag rather than hide, since a small
// number is still informative once you know it's small.
const MIN_SAMPLE_SIZE = 15;

type TechniqueEffectiveness = {
  technique: string;
  n: number;
  avg_pre_stress: number | null;
  avg_post_stress: number | null;
  avg_stress_delta: number | null;
  avg_score: number | null;
  avg_strategy_confidence: number | null;
  avg_strategy_effectiveness: number | null;
  pct_positive_change: number | null;
};

function techniqueLabel(key: string): string {
  return STRESS_TECHNIQUES.find((t) => t.key === key)?.label ?? key;
}

function weightedAverage(
  rows: TechniqueEffectiveness[],
  field: keyof TechniqueEffectiveness,
): number | null {
  const withValue = rows.filter((r) => r[field] !== null);
  const totalN = withValue.reduce((sum, r) => sum + r.n, 0);
  if (totalN === 0) return null;
  const weighted = withValue.reduce(
    (sum, r) => sum + (r[field] as number) * r.n,
    0,
  );
  return Math.round((weighted / totalN) * 10) / 10;
}

function PreliminaryBanner() {
  return (
    <div className="flex items-start gap-3 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">Preliminary results — not for citation</p>
        <p className="mt-1 text-amber-800/90">
          These are simple descriptive averages, not statistically tested
          findings. Sample sizes may still be small (see the &quot;n&quot; column
          and &quot;Limited data&quot; badges below). Use this to gauge whether the
          study looks directionally healthy and whether you already have
          enough data to write up a formal analysis — not as a result to
          publish or cite as-is.
        </p>
      </div>
    </div>
  );
}

async function AdminInsightsContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_technique_effectiveness");
  const rows = (data as TechniqueEffectiveness[] | null) ?? [];

  const totalN = rows.reduce((sum, r) => sum + r.n, 0);
  const overallStressDelta = weightedAverage(rows, "avg_stress_delta");
  const overallScore = weightedAverage(rows, "avg_score");
  const overallPositiveChange = weightedAverage(rows, "pct_positive_change");
  const overallLimitedData = totalN < MIN_SAMPLE_SIZE;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Study Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            How participants fare before vs. after using a coping technique —
            the core question the study is trying to answer.
          </p>
        </div>
        <Link
          href="/protected/admin"
          className="text-sm text-primary underline underline-offset-2"
        >
          ← Overview
        </Link>
      </div>

      <PreliminaryBanner />

      <Card className="border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">At a Glance (All Techniques)</CardTitle>
          <CardDescription>
            Weighted across every completed official run.{" "}
            {overallLimitedData && (
              <span className="font-medium text-amber-700">
                Only {totalN} runs so far — likely too few to draw
                conclusions yet.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-border/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Completed Runs</p>
              <p className="text-xl font-bold text-foreground">{totalN}</p>
            </div>
            <div className="border border-border/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                Avg. Stress Change (post − pre)
              </p>
              <p className="text-xl font-bold text-foreground">
                {overallStressDelta !== null ? overallStressDelta : "—"}
              </p>
            </div>
            <div className="border border-border/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Avg. Task Score</p>
              <p className="text-xl font-bold text-foreground">
                {overallScore !== null ? overallScore : "—"}
              </p>
            </div>
            <div className="border border-border/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                Reported a Positive Change
              </p>
              <p className="text-xl font-bold text-foreground">
                {overallPositiveChange !== null
                  ? `${overallPositiveChange}%`
                  : "—"}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            A negative stress change means self-reported stress went down
            after the coping exercise (desirable). &quot;Positive change&quot;
            is the share of runs where the participant selected anything
            other than &quot;I did not notice a change.&quot;
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">By Coping Technique</CardTitle>
          <CardDescription>
            {error
              ? "Failed to load insights."
              : `${rows.length} technique(s) with at least one completed run.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed runs yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-medium">Technique</th>
                    <th className="py-2 pr-4 font-medium">n</th>
                    <th className="py-2 pr-4 font-medium">Pre Stress</th>
                    <th className="py-2 pr-4 font-medium">Post Stress</th>
                    <th className="py-2 pr-4 font-medium">Δ Stress</th>
                    <th className="py-2 pr-4 font-medium">Avg Score</th>
                    <th className="py-2 pr-4 font-medium">Confidence</th>
                    <th className="py-2 pr-4 font-medium">Effectiveness</th>
                    <th className="py-2 pr-4 font-medium">% Positive Change</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const limited = row.n < MIN_SAMPLE_SIZE;
                    return (
                      <tr key={row.technique} className="border-b border-border/50">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            {techniqueLabel(row.technique)}
                            {limited && (
                              <Badge variant="outline" className="text-[10px]">
                                Limited data
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4">{row.n}</td>
                        <td className="py-2 pr-4">{row.avg_pre_stress ?? "—"}</td>
                        <td className="py-2 pr-4">{row.avg_post_stress ?? "—"}</td>
                        <td className="py-2 pr-4">
                          {row.avg_stress_delta ?? "—"}
                        </td>
                        <td className="py-2 pr-4">{row.avg_score ?? "—"}</td>
                        <td className="py-2 pr-4">
                          {row.avg_strategy_confidence ?? "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {row.avg_strategy_effectiveness ?? "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {row.pct_positive_change !== null
                            ? `${row.pct_positive_change}%`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <a
          href="/api/admin/insights-export"
          className="text-sm font-medium text-primary underline underline-offset-2"
        >
          Export CSV
        </a>
      </div>
    </>
  );
}

export default function AdminInsightsPage() {
  return (
    <Suspense
      fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}
    >
      <AdminInsightsContent />
    </Suspense>
  );
}
