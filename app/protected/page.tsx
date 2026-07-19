import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TimeGreeting } from "@/components/time-greeting";
import { PerformanceChart } from "@/components/performance-chart";
import { CHALLENGES, type ChartPoint } from "@/lib/challenges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart2, CalendarDays, CheckCircle2, Flame } from "lucide-react";
import { Suspense } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type RawResult = {
  id: string;
  challenge: string;
  score: number;
  played_at: string;
};

const REQUIRED_TRIAL_DAYS = 7;

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildChartData(results: RawResult[]): ChartPoint[] {
  const sorted = [...results].sort((a, b) =>
    a.played_at.localeCompare(b.played_at),
  );

  const byChallenge: Record<string, number[]> = {};
  for (const r of sorted) {
    byChallenge[r.challenge] ??= [];
    byChallenge[r.challenge].push(r.score);
  }

  const maxAttempts = Math.max(
    0,
    ...Object.values(byChallenge).map((s) => s.length),
  );

  return Array.from({ length: maxAttempts }, (_, i) => {
    const point: ChartPoint = { attempt: i + 1 };
    for (const c of CHALLENGES) {
      const score = byChallenge[c.key]?.[i];
      if (score !== undefined) point[c.key] = score;
    }
    return point;
  });
}

function countDistinctDays(results: RawResult[]): number {
  const days = new Set(
    results.map((result) => result.played_at.slice(0, 10)),
  );
  return days.size;
}

// ── Sub-components (each does its own async data fetch) ──────────────────────

async function OverviewContent() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) redirect("/auth/login");

  const userId = claimsData.claims.sub;

  const { data: results } = await supabase
    .from("challenge_results")
    .select(
      "id, challenge, score, played_at, official_challenge_workflows!inner(status)",
    )
    .eq("user_id", userId)
    .eq("is_official", true)
    .eq("official_challenge_workflows.status", "completed")
    .order("played_at", { ascending: true });

  const rows: RawResult[] = (results ?? []).map((result) => ({
    id: result.id,
    challenge: result.challenge,
    score: result.score,
    played_at: result.played_at,
  }));

  const totalAttempts = rows.length;
  const challengesTried = new Set(rows.map((r) => r.challenge)).size;
  const distinctDays = countDistinctDays(rows);
  const averageScoreAll =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
      : null;

  const statCards = [
    {
      title: "Total Attempts",
      value: totalAttempts > 0 ? String(totalAttempts) : "—",
      description: "Official challenge attempts completed",
      icon: Flame,
    },
    {
      title: "Challenges Tried",
      value: challengesTried > 0 ? `${challengesTried} / 5` : "—",
      description: "Distinct official challenges attempted",
      icon: CheckCircle2,
    },
    {
      title: "Days Participated",
      value: distinctDays > 0 ? String(distinctDays) : "—",
      description: "Distinct days with a completed official challenge",
      icon: CalendarDays,
    },
    {
      title: "Average Score",
      value: averageScoreAll !== null ? `${averageScoreAll}` : "—",
      description: "Mean score across all challenges (0–100)",
      icon: BarChart2,
    },
  ];

  const chartData = buildChartData(rows);
  const trialComplete = distinctDays >= REQUIRED_TRIAL_DAYS;

  return (
    <>
      {trialComplete && (
        <div className="border border-[#1B3468]/20 bg-[#1B3468]/5 px-5 py-4 text-sm leading-relaxed text-[#0E2554]">
          Thank you for your participation in the Simulated Stress Exposure
          Program. You have completed the required 7-day trial period. You are
          welcome to continue using the portal for your personal benefit and to
          provide additional data for our study.
        </div>
      )}

      <div>
        <TimeGreeting
          firstName={claimsData.claims?.user_metadata?.first_name}
        />
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your progress.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-border/50 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon size={16} className="text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Performance Over Time</CardTitle>
          <CardDescription>
            Score (0–100) per challenge across every official attempt.
            Practice puzzles are not included.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceChart data={chartData} />
        </CardContent>
      </Card>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-8 w-64 bg-muted animate-pulse" />
        <div className="mt-2 h-4 w-72 bg-muted animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50 shadow-none animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-3 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-12 bg-muted rounded mb-2" />
              <div className="h-3 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border/50 shadow-none animate-pulse">
        <CardHeader>
          <div className="h-4 w-48 bg-muted rounded mb-2" />
          <div className="h-3 w-72 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[320px] bg-muted rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProtectedPage() {
  return (
    <div className="max-w-5xl space-y-8">
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent />
      </Suspense>
    </div>
  );
}
