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

type Participant = {
  user_id: string;
  email: string | null;
  created_at: string;
};

async function AdminParticipantsContent() {
  const supabase = await createClient();

  const [{ data: participants, error: participantsError }, { data: results }] =
    await Promise.all([
      supabase.rpc("admin_list_participants"),
      supabase.from("challenge_results").select("user_id, is_official"),
    ]);

  const countsByUser = new Map<string, { total: number; official: number }>();
  for (const row of results ?? []) {
    if (!row.user_id) continue;
    const existing = countsByUser.get(row.user_id) ?? {
      total: 0,
      official: 0,
    };
    existing.total += 1;
    if (row.is_official) existing.official += 1;
    countsByUser.set(row.user_id, existing);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Participants</h1>
          <p className="text-muted-foreground mt-1">
            Everyone who has signed up for the study.
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
          <CardTitle className="text-lg">All Participants</CardTitle>
          <CardDescription>
            {participantsError
              ? "Could not load participant directory."
              : `${participants?.length ?? 0} accounts.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Signed up</th>
                  <th className="py-2 pr-4 font-medium">Total attempts</th>
                  <th className="py-2 pr-4 font-medium">Official attempts</th>
                </tr>
              </thead>
              <tbody>
                {((participants as Participant[] | null) ?? []).map((p) => {
                  const counts = countsByUser.get(p.user_id) ?? {
                    total: 0,
                    official: 0,
                  };
                  return (
                    <tr key={p.user_id} className="border-b border-border/50">
                      <td className="py-2 pr-4">{p.email ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4">{counts.total}</td>
                      <td className="py-2 pr-4">{counts.official}</td>
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

export default function AdminParticipantsPage() {
  return (
    <Suspense
      fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}
    >
      <AdminParticipantsContent />
    </Suspense>
  );
}
