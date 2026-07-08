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
import { BarChart2, CheckCircle2, Clock, Flame } from "lucide-react";
import { Suspense } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type RawResult = {
  challenge: string;
  score: number;
  played_at: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildChartData(results: RawResult[]): ChartPoint[] {
  // Sort all results chronologically
  const sorted = [...results].sort((a, b) => a.played_at.localeCompare(b.played_at));

  // Build per-challenge ordered score arrays
  const byChallenge: Record<string, number[]> = {};
  for (const r of sorted) {
    byChallenge[r.challenge] ??= [];
    byChallenge[r.challenge].push(r.score);
  }

  // x-axis = attempt number (1-based), independent per challenge
  const maxAttempts = Math.max(0, ...Object.values(byChallenge).map((s) => s.length));

  return Array.from({ length: maxAttempts }, (_, i) => {
    const point: ChartPoint = { attempt: i + 1 };
    for (const c of CHALLENGES) {
      const score = byChallenge[c.key]?.[i];
      if (score !== undefined) point[c.key] = score;
    }
    return point;
  });
}

function fmtTime(sec: number | null) {
  if (sec === null) return "—";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

// ── Sub-components (each does its own async data fetch) ──────────────────────

async function UserGreeting() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");
  return <TimeGreeting firstName={data.claims?.user_metadata?.first_name} />;
}

async function DashboardContent() {
  const supabase = await createClient();

  // Auth guard
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) redirect("/auth/login");

  const userId = claimsData.claims.sub;

  // Fetch summary rows (only columns that exist in the new schema)
  const { data: results } = await supabase
    .from("challenge_results")
    .select("challenge, score, played_at")
    .eq("user_id", userId)
    .order("played_at", { ascending: true });

  // Fetch Wordle-specific rows for avg completion time stat
  const { data: wordleRows } = await supabase
    .from("wordle_results")
    .select("completion_time_seconds, won")
    .eq("user_id", userId);

  const rows: RawResult[] = results ?? [];
  const wordle = wordleRows ?? [];

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalAttempts = rows.length;
  const challengesTried = new Set(rows.map((r) => r.challenge)).size;

  const wonWordle = wordle.filter((r) => r.won);
  const avgCompletionSec =
    wonWordle.length > 0
      ? Math.round(wonWordle.reduce((s, r) => s + (r.completion_time_seconds ?? 0), 0) / wonWordle.length)
      : null;

  const avgScoreAll =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
      : null;

  const statCards = [
    {
      title: "Total Attempts",
      value: totalAttempts > 0 ? String(totalAttempts) : "—",
      description: "Games played across all challenges",
      icon: Flame,
    },
    {
      title: "Challenges Tried",
      value: challengesTried > 0 ? `${challengesTried} / 6` : "—",
      description: "Distinct challenges attempted",
      icon: CheckCircle2,
    },
    {
      title: "Avg Completion Time",
      value: fmtTime(avgCompletionSec),
      description: "Average time per successful session",
      icon: Clock,
    },
    {
      title: "Avg Score",
      value: avgScoreAll !== null ? `${avgScoreAll}` : "—",
      description: "Mean score across all challenges (0–100)",
      icon: BarChart2,
    },
  ];

  const chartData = buildChartData(rows);

  return (
    <>
      {/* Insight stat tiles */}
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
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance graph */}
      <Card className="border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Performance Over Time</CardTitle>
          <CardDescription>
            Score (0–100) per challenge across every attempt. Complete more
            challenges to see additional lines appear.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceChart data={chartData} />
        </CardContent>
      </Card>
    </>
  );
}

// ── Skeleton fallbacks ────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
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
  );
}

function ChartSkeleton() {
  return (
    <Card className="border-border/50 shadow-none animate-pulse">
      <CardHeader>
        <div className="h-4 w-48 bg-muted rounded mb-2" />
        <div className="h-3 w-72 bg-muted rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-[320px] bg-muted rounded" />
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProtectedPage() {
  return (
    <div className="max-w-5xl space-y-8">
      {/* Greeting */}
      <div>
        <Suspense fallback={<h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>}>
          <UserGreeting />
        </Suspense>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your progress.
        </p>
      </div>

      {/* Stats + chart — streamed in once data is ready */}
      <Suspense fallback={
        <div className="space-y-8">
          <StatsSkeleton />
          <ChartSkeleton />
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
