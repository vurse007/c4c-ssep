import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Verify auth server-side (always works — reads HttpOnly cookies)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { challenge, score, completion_time_seconds, guesses, won, target_word } = body;

  if (!challenge || score === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 1. Insert summary row
  const { data: summary, error: summaryError } = await supabase
    .from("challenge_results")
    .insert({ user_id: user.id, challenge, score })
    .select("id")
    .single();

  if (summaryError || !summary) {
    console.error("[challenge-result] summary insert failed:", summaryError);
    return NextResponse.json({ error: summaryError?.message ?? "Insert failed" }, { status: 500 });
  }

  // 2. Insert challenge-specific detail row
  if (challenge === "wordle") {
    const { error: detailError } = await supabase.from("wordle_results").insert({
      user_id: user.id,
      result_id: summary.id,
      target_word,
      guesses,
      won,
      completion_time_seconds,
    });

    if (detailError) {
      console.error("[challenge-result] wordle detail insert failed:", detailError);
      // Don't fail the whole request — summary row is already saved
    }
  }

  return NextResponse.json({ ok: true, id: summary.id });
}
