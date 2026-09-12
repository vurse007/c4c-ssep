import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ADMIN_TABLES, isAdminTableKey } from "@/lib/admin-tables";
import Link from "next/link";
import { Suspense } from "react";

const ROW_LIMIT = 200;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function AdminDataContent({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const { table: rawTable } = await searchParams;
  const table = isAdminTableKey(rawTable ?? "")
    ? (rawTable as string)
    : ADMIN_TABLES[0].key;

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from(table)
    .select("*")
    .limit(ROW_LIMIT);

  const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Raw Data</h1>
          <p className="text-muted-foreground mt-1">
            Browse and export study tables. Showing up to {ROW_LIMIT} rows —
            use CSV export for the full table.
          </p>
        </div>
        <Link
          href="/protected/admin"
          className="text-sm text-primary underline underline-offset-2"
        >
          ← Overview
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {ADMIN_TABLES.map((t) => (
          <Link
            key={t.key}
            href={`/protected/admin/data?table=${t.key}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              t.key === table
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card className="border-border/50 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">
              {ADMIN_TABLES.find((t) => t.key === table)?.label ?? table}
            </CardTitle>
            <CardDescription>
              {error ? "Failed to load rows." : `${rows?.length ?? 0} rows shown.`}
            </CardDescription>
          </div>
          <a
            href={`/api/admin/export?table=${table}`}
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            Export CSV
          </a>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : rows && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    {columns.map((column) => (
                      <th key={column} className="py-2 pr-4 font-medium whitespace-nowrap">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const record = row as Record<string, unknown>;
                    const key =
                      typeof record.id === "string" ? record.id : index;
                    return (
                      <tr key={key} className="border-b border-border/50">
                        {columns.map((column) => (
                          <td
                            key={column}
                            className="py-2 pr-4 whitespace-nowrap max-w-[240px] truncate"
                          >
                            {formatCell(record[column])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No rows yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function AdminDataPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  return (
    <Suspense
      fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}
    >
      <AdminDataContent searchParams={searchParams} />
    </Suspense>
  );
}
