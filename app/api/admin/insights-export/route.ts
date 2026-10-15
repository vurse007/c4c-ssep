import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/supabase/is-admin";
import { toCsv } from "@/lib/csv";
import { parseCohort } from "@/lib/cohorts";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await isCurrentUserAdmin(supabase);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cohort = parseCohort(request.nextUrl.searchParams.get("cohort"));
  const { data, error } = await supabase.rpc("admin_technique_effectiveness", {
    p_cohort: cohort,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = toCsv(
    ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      cohort,
      ...row,
    })),
  );
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="technique-effectiveness-${cohort}.csv"`,
    },
  });
}
