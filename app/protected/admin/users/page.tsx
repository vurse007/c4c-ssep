import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Suspense } from "react";

type ParticipantProgress = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  days_completed: number;
};

async function AdminUsersContent() {
  const supabase = await createClient();

  const [{ data: progress, error }, { data: workflows }] = await Promise.all([
    supabase.rpc("admin_participant_progress"),
    supabase
      .from("official_challenge_workflows")
      .select("user_id, completed_at")
      .eq("status", "completed")
      .not("user_id", "is", null),
  ]);

  const lastFinishedByUser = new Map<string, string>();
  for (const w of workflows ?? []) {
    if (!w.user_id || !w.completed_at) continue;
    const existing = lastFinishedByUser.get(w.user_id);
    if (!existing || w.completed_at > existing) {
      lastFinishedByUser.set(w.user_id, w.completed_at);
    }
  }

  // Most recently finished first; users who never finished a run go last.
  const rows = [...((progress as ParticipantProgress[] | null) ?? [])]
    .map((p) => ({ ...p, lastFinished: lastFinishedByUser.get(p.user_id) }))
    .sort((a, b) => {
      if (a.lastFinished && b.lastFinished) {
        return b.lastFinished.localeCompare(a.lastFinished);
      }
      if (a.lastFinished) return -1;
      if (b.lastFinished) return 1;
      return (a.email ?? "").localeCompare(b.email ?? "");
    });

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">
            Ordered by most recently finished official run. Select a user to
            see their individual data.
          </p>
        </div>
        <Link
          href="/protected/admin"
          className="text-sm text-primary underline underline-offset-2"
        >
          ← Overview
        </Link>
      </div>

      <Card className="border-border/50 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">All Users</CardTitle>
          <CardDescription>
            {error ? "Could not load users." : `${rows.length} users.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">User</th>
                  <th className="py-2 pr-4 font-medium">Last finished</th>
                  <th className="py-2 pr-4 font-medium">Days completed</th>
                  <th className="py-2 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const name = [p.first_name, p.last_name]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={p.user_id} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        <div>{name || p.email || "—"}</div>
                        {name && p.email && (
                          <div className="text-xs text-muted-foreground">
                            {p.email}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {p.lastFinished
                          ? new Date(p.lastFinished).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="py-2 pr-4">{p.days_completed}</td>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/protected/admin/users/detail?id=${p.user_id}`}
                          className="text-primary underline underline-offset-2"
                        >
                          View data →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}
    >
      <AdminUsersContent />
    </Suspense>
  );
}
