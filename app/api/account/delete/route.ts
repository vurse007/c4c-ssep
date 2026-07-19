import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { password?: unknown; confirm?: unknown };
  if (typeof body.password !== "string" || body.password.length === 0) {
    return NextResponse.json(
      { error: "Password is required to delete your account" },
      { status: 400 },
    );
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Type DELETE to confirm account deletion' },
      { status: 400 },
    );
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: body.password,
  });

  if (verifyError) {
    return NextResponse.json(
      { error: "Incorrect password" },
      { status: 403 },
    );
  }

  try {
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete account right now";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
