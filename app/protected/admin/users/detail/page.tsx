import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ADMIN_TABLES } from "@/lib/admin-tables";
import Link from "next/link";
import { Suspense } from "react";

// Per-challenge detail tables: every admin table except the three shown above.
const DETAIL_TABLES = ADMIN_TABLES.filter(
  (t) =>
    t.key !== "official_challenge_workflows" &&
    t.key !== "challenge_results" &&
    t.key !== "coping_exercise_results",
);

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DataTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }
  const columns = Object.keys(rows[0]).filter((c) => c !== "user_id");
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            {columns.map((c) => (
              <th key={c} className="py-2 pr-4 font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)} className="border-b border-border/50">
              {columns.map((c) => (
                <td key={c} className="py-2 pr-4 align-top">
                  {formatCell(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function AdminUserContent({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const userId = id ?? "";
  const supabase = await createClient();

  const [
    { data: participants },
    { data: workflows },
    { data: results },
    { data: coping },
    detailResults,
  ] = await Promise.all([
    supabase.rpc("admin_list_participants"),
    supabase
      .from("official_challenge_workflows")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false }),
    supabase
      .from("challenge_results")
      .select("*")
      .eq("user_id", userId)
      .order("played_at", { ascending: false }),
    supabase
      .from("coping_exercise_results")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false }),
    Promise.all(
      DETAIL_TABLES.map((t) =>
        supabase.from(t.key).select("*").eq("user_id", userId),
      ),
    ),
  ]);

  const participant = (
    (participants as { user_id: string; email: string | null }[] | null) ?? []
  ).find((p) => p.user_id === userId);

  const sections = [
    {
      title: "Official Workflows (surveys)",
      rows: (workflows ?? []) as Record<string, unknown>[],
    },
    {
      title: "Challenge Results (all attempts)",
      rows: (results ?? []) as Record<string, unknown>[],
    },
    {
      title: "Coping Exercise Results",
      rows: (coping ?? []) as Record<string, unknown>[],
    },
    ...DETAIL_TABLES.map((t, i) => ({
      title: t.label,
      rows: ((detailResults[i].data ?? []) as Record<string, unknown>[]).sort(
        (a, b) => String(b.played_at ?? "").localeCompare(String(a.played_at ?? "")),
      ),
    })),
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {participant?.email ?? "Unknown user"}
          </h1>
          <p className="text-muted-foreground mt-1 text-xs">{userId}</p>
        </div>
        <Link
          href="/protected/admin/users"
          className="text-sm text-primary underline underline-offset-2"
        >
          ← All users
        </Link>
      </div>

      {sections.map((s) => (
        <Card key={s.title} className="border-border/50 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">{s.title}</CardTitle>
            <CardDescription>{s.rows.length} rows, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable rows={s.rows} />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default function AdminUserPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  return (
    <Suspense
      fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}
    >
      <AdminUserContent searchParams={searchParams} />
    </Suspense>
  );
}
