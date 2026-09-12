import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/supabase/is-admin";
import { isAdminTableKey } from "@/lib/admin-tables";
import { toCsv } from "@/lib/csv";

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

  const table = request.nextUrl.searchParams.get("table") ?? "";
  if (!isAdminTableKey(table)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 400 });
  }

  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = toCsv(data ?? []);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table}.csv"`,
    },
  });
}
