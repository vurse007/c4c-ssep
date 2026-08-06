import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TimeGreeting } from "@/components/time-greeting";
import { PerformanceChart } from "@/components/performance-chart";
import { CurrentStreakCard } from "@/components/current-streak-card";
import { CHALLENGES, type ChartPoint } from "@/lib/challenges";
import {
  getWorkflowParticipationDay,
  hasCompletedTrial,
} from "@/lib/local-day";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart2, CheckCircle2, Flame } from "lucide-react";
import { Suspense } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type RawResult = {
  id: string;
  challenge: string;
  score: number;
  played_at: string;
  participation_day: string;
};

const REQUIRED_TRIAL_DAYS = 7;

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildChartData(results: RawResult[]): ChartPoint[] {
  const sorted = [...results].sort((a, b) =>
    a.played_at.localeCompare(b.played_at),
  );
  const days = [
    ...new Set(sorted.map((result) => result.participation_day)),
  ].sort();
  const points = new Map(
    days.map((date, index) => [date, { day: index + 1 } as ChartPoint]),
  );

  for (const result of sorted) {
    const challenge = CHALLENGES.find(
      (item) => item.key === result.challenge,
    );
    const point = points.get(result.participation_day);
    if (challenge && point) point[challenge.key] = result.score;
  }

  return [...points.values()];
}

function getDistinctDays(days: Array<string | null | undefined>): string[] {
  return [
    ...new Set(
      days.filter((day): day is string => typeof day === "string" && day.length >= 10),
    ),
  ].sort();
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Flame;
}) {
  return (
    <Card className="border-border/50 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon size={16} className="text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

// ── Sub-components (each does its own async data fetch) ──────────────────────

async function OverviewContent() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) redirect("/auth/login");

  const userId = claimsData.claims.sub;

  // Trial/streak source of truth: completed workflows (matches study SQL).
  const { data: completedWorkflows, error: workflowError } = await supabase
    .from("official_challenge_workflows")
    .select("completion_local_date, completion_time_zone, completed_at")
    .eq("user_id", userId)
    .eq("status", "completed");

  if (workflowError) {
    console.error("[overview] completed workflows query failed:", workflowError);
  }

  const participationDays = getDistinctDays(
    (completedWorkflows ?? []).map((workflow) =>
      getWorkflowParticipationDay(workflow),
    ),
  );

  const { data: results, error: resultsError } = await supabase
    .from("challenge_results")
    .select(
      "id, challenge, score, played_at, official_challenge_workflows!inner(status, completion_local_date, completion_time_zone, completed_at)",
    )
    .eq("user_id", userId)
    .eq("is_official", true)
    .eq("official_challenge_workflows.status", "completed")
    .order("played_at", { ascending: true });

  if (resultsError) {
    console.error("[overview] challenge results query failed:", resultsError);
  }

  const rows: RawResult[] = (results ?? []).map((result) => {
    const relation = result.official_challenge_workflows;
    const completedWorkflow = Array.isArray(relation) ? relation[0] : relation;

    return {
      id: result.id,
      challenge: result.challenge,
      score: result.score,
      played_at: result.played_at,
      participation_day:
        getWorkflowParticipationDay(completedWorkflow ?? {}) ??
        result.played_at.slice(0, 10),
    };
  });

  const totalAttempts = rows.length;
  const challengesTried = new Set(rows.map((r) => r.challenge)).size;
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
      title: "Average Score",
      value: averageScoreAll !== null ? `${averageScoreAll}` : "—",
      description: "Mean score across all challenges (0–100)",
      icon: BarChart2,
    },
  ];

  const chartData = buildChartData(rows);
  const trialComplete = hasCompletedTrial(
    participationDays,
    REQUIRED_TRIAL_DAYS,
  );

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
        <StatCard {...statCards[0]} />
        <StatCard {...statCards[1]} />
        <CurrentStreakCard
          days={participationDays}
          requiredDays={REQUIRED_TRIAL_DAYS}
        />
        <StatCard {...statCards[2]} />
      </div>

      <Card className="border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Performance Over Time</CardTitle>
          <CardDescription>
            Score (0–100) per challenge by participation day. Practice puzzles
            are not included.
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
