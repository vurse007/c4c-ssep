import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STRESS_TECHNIQUES } from "@/lib/stress-techniques";
import { CHALLENGES } from "@/lib/challenges";
import { Users, CheckCircle2, BarChart2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

async function AdminOverviewContent() {
  const supabase = await createClient();

  const [
    { data: participants },
    { data: workflows },
    { data: results },
    { data: progress },
  ] = await Promise.all([
    supabase.rpc("admin_list_participants"),
    supabase
      .from("official_challenge_workflows")
      .select(
        "status, stress_management_technique, pre_stress_level, post_stress_level",
      ),
    supabase.from("challenge_results").select("challenge, is_official"),
    supabase.rpc("admin_participant_progress"),
  ]);

  const participantCount = participants?.length ?? 0;
  const progressRows =
    (progress as { finished_trial: boolean }[] | null) ?? [];
  const retentionPercent =
    progressRows.length > 0
      ? Math.round(
          (progressRows.filter((r) => r.finished_trial).length /
            progressRows.length) *
            100,
        )
      : null;
  const completedWorkflows = (workflows ?? []).filter(
    (w) => w.status === "completed",
  );
  const totalRuns = completedWorkflows.length;

  const stressChangeByTechnique = STRESS_TECHNIQUES.map((technique) => {
    const rows = completedWorkflows.filter(
      (w) =>
        w.stress_management_technique === technique.key &&
        w.pre_stress_level !== null &&
        w.post_stress_level !== null,
    );
    const preAvg = average(rows.map((r) => r.pre_stress_level as number));
    const postAvg = average(rows.map((r) => r.post_stress_level as number));
    return {
      technique,
      count: rows.length,
      preAvg,
      postAvg,
      delta:
        preAvg !== null && postAvg !== null ? postAvg - preAvg : null,
    };
  }).filter((row) => row.count > 0);

  const attemptsByChallenge = CHALLENGES.map((challenge) => ({
    challenge,
    count: (results ?? []).filter(
      (r) => r.challenge === challenge.key && r.is_official,
    ).length,
  }));

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">
          Aggregate data across all study participants.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Participants
            </CardTitle>
            <Users size={16} className="text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {participantCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total registered accounts
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trial Retention
            </CardTitle>
            <TrendingUp size={16} className="text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {retentionPercent !== null ? `${retentionPercent}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Finished 7-day trial ÷ participants who started
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Runs
            </CardTitle>
            <CheckCircle2 size={16} className="text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalRuns}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Official daily workflows completed
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Challenge Attempts
            </CardTitle>
            <BarChart2 size={16} className="text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(results ?? []).filter((r) => r.is_official).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Official challenge attempts logged
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">
            Stress Level Change by Coping Technique
          </CardTitle>
          <CardDescription>
            Average self-reported stress (0–100) before vs. after, across
            completed official runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stressChangeByTechnique.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-medium">Technique</th>
                    <th className="py-2 pr-4 font-medium">Runs</th>
                    <th className="py-2 pr-4 font-medium">Pre (avg)</th>
                    <th className="py-2 pr-4 font-medium">Post (avg)</th>
                    <th className="py-2 pr-4 font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {stressChangeByTechnique.map((row) => (
                    <tr key={row.technique.key} className="border-b border-border/50">
                      <td className="py-2 pr-4">{row.technique.label}</td>
                      <td className="py-2 pr-4">{row.count}</td>
                      <td className="py-2 pr-4">{row.preAvg ?? "—"}</td>
                      <td className="py-2 pr-4">{row.postAvg ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {row.delta !== null
                          ? row.delta > 0
                            ? `+${row.delta}`
                            : row.delta
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Official Attempts by Challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {attemptsByChallenge.map(({ challenge, count }) => (
              <div
                key={challenge.key}
                className="border border-border/50 rounded-lg p-3"
              >
                <p className="text-xs text-muted-foreground">{challenge.label}</p>
                <p className="text-xl font-bold text-foreground">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 text-sm">
        <Link
          href="/protected/admin/insights"
          className="text-primary underline underline-offset-2"
        >
          Study insights (preliminary) →
        </Link>
        <Link
          href="/protected/admin/progress"
          className="text-primary underline underline-offset-2"
        >
          View trial progress →
        </Link>
        <Link
          href="/protected/admin/participants"
          className="text-primary underline underline-offset-2"
        >
          View participants →
        </Link>
        <Link
          href="/protected/admin/data"
          className="text-primary underline underline-offset-2"
        >
          Browse raw data / export CSV →
        </Link>
      </div>
    </>
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      }
    >
      <AdminOverviewContent />
    </Suspense>
  );
}
