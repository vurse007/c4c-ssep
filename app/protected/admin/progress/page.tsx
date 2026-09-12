import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Suspense } from "react";

const REQUIRED_TRIAL_DAYS = 7;

type ParticipantProgress = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  days_completed: number;
  best_streak: number;
  finished_trial: boolean;
  first_day: string | null;
  last_day: string | null;
};

async function AdminProgressContent() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_participant_progress");
  const rows = (data as ParticipantProgress[] | null) ?? [];

  const totalParticipants = rows.length;
  const finishedCount = rows.filter((r) => r.finished_trial).length;
  const retentionPercent =
    totalParticipants > 0
      ? Math.round((finishedCount / totalParticipants) * 100)
      : null;
  const startedAtLeastOneDay = rows.filter((r) => r.days_completed > 0).length;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Trial Progress
          </h1>
          <p className="text-muted-foreground mt-1">
            Days completed and streaks toward the {REQUIRED_TRIAL_DAYS}-day
            trial, per participant.
          </p>
        </div>
        <Link
          href="/protected/admin"
          className="text-sm text-primary underline underline-offset-2"
        >
          ← Overview
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 shadow-none">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Started Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {startedAtLeastOneDay}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Participants with ≥1 completed day
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Finished Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {finishedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reached a {REQUIRED_TRIAL_DAYS}-day streak
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-none">
          <CardHeader className="pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {retentionPercent !== null ? `${retentionPercent}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Finished trial ÷ all participants
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Participant Progress</CardTitle>
            <CardDescription>
              {error
                ? "Failed to load progress."
                : `${rows.length} participants.`}
            </CardDescription>
          </div>
          <a
            href="/api/admin/progress-export"
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            Export CSV
          </a>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed workflows yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Days Completed</th>
                    <th className="py-2 pr-4 font-medium">Best Streak</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">First Day</th>
                    <th className="py-2 pr-4 font-medium">Last Day</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const name = [row.first_name, row.last_name]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <tr key={row.user_id} className="border-b border-border/50">
                        <td className="py-2 pr-4">{name || "—"}</td>
                        <td className="py-2 pr-4">{row.email ?? "—"}</td>
                        <td className="py-2 pr-4">{row.days_completed}</td>
                        <td className="py-2 pr-4">{row.best_streak}</td>
                        <td className="py-2 pr-4">
                          <Badge
                            variant={row.finished_trial ? "default" : "outline"}
                          >
                            {row.finished_trial ? "Finished" : "In progress"}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4">{row.first_day ?? "—"}</td>
                        <td className="py-2 pr-4">{row.last_day ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function AdminProgressPage() {
  return (
    <Suspense
      fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}
    >
      <AdminProgressContent />
    </Suspense>
  );
}
