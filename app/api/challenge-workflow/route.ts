import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BODY_FEELING_OPTIONS,
  DAY_PACE_OPTIONS,
  FOCUS_EFFORT_OPTIONS,
  FUTURE_CONFIDENCE_OPTIONS,
  NOTICED_CHANGE_OPTIONS,
  PLAYABLE_CHALLENGES,
  isIntegerInRange,
  isOption,
  isOptionArray,
} from "@/lib/challenge-workflow";
import { isStressTechnique } from "@/lib/stress-techniques";

async function getAuthenticatedContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

async function getActiveWorkflow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  return supabase
    .from("official_challenge_workflows")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
}

export async function GET() {
  const { supabase, user } = await getAuthenticatedContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await getActiveWorkflow(supabase, user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflow: data ?? null });
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuthenticatedContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: active, error: activeError } = await getActiveWorkflow(
    supabase,
    user.id,
  );
  if (activeError) {
    return NextResponse.json(
      { error: activeError.message },
      { status: 500 },
    );
  }
  if (active) {
    return NextResponse.json(
      { error: "An active challenge already exists", workflow: active },
      { status: 409 },
    );
  }

  const body = await req.json();
  const {
    stress_management_technique,
    pre_stress_level,
    pre_current_bpm,
    pre_day_pace,
    pre_focus_effort,
    pre_body_feelings,
    pre_body_other,
  } = body;

  const hasOther =
    Array.isArray(pre_body_feelings) &&
    pre_body_feelings.includes("other");
  const hasPerfectlyNormal =
    Array.isArray(pre_body_feelings) &&
    pre_body_feelings.includes("perfectly_normal");
  const normalizedOther =
    typeof pre_body_other === "string" ? pre_body_other.trim() : "";

  if (
    !isStressTechnique(stress_management_technique) ||
    !isIntegerInRange(pre_stress_level, 0, 100) ||
    !isIntegerInRange(pre_current_bpm, 30, 220) ||
    !isOption(pre_day_pace, DAY_PACE_OPTIONS) ||
    !isOption(pre_focus_effort, FOCUS_EFFORT_OPTIONS) ||
    !isOptionArray(pre_body_feelings, BODY_FEELING_OPTIONS) ||
    (hasPerfectlyNormal && pre_body_feelings.length !== 1) ||
    (hasOther && normalizedOther.length === 0) ||
    (!hasOther && normalizedOther.length > 0)
  ) {
    return NextResponse.json(
      { error: "Complete every pre-challenge survey question" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("official_challenge_workflows")
    .insert({
      user_id: user.id,
      stress_management_technique,
      pre_stress_level,
      pre_current_bpm,
      pre_day_pace,
      pre_focus_effort,
      pre_body_feelings,
      pre_body_other: hasOther ? normalizedOther : null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflow: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getAuthenticatedContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: workflow, error: workflowError } =
    await getActiveWorkflow(supabase, user.id);
  if (workflowError) {
    return NextResponse.json(
      { error: workflowError.message },
      { status: 500 },
    );
  }
  if (!workflow) {
    return NextResponse.json(
      { error: "No active challenge exists" },
      { status: 404 },
    );
  }

  const body = await req.json();

  if (body.action === "select_challenge") {
    if (
      workflow.checkpoint !== "challenge_selection" ||
      !PLAYABLE_CHALLENGES.includes(body.selected_challenge)
    ) {
      return NextResponse.json(
        { error: "Invalid challenge selection" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("official_challenge_workflows")
      .update({
        selected_challenge: body.selected_challenge,
        checkpoint: "challenge_play",
        updated_at: new Date().toISOString(),
      })
      .eq("id", workflow.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ workflow: data });
  }

  if (body.action === "complete_post_survey") {
    const {
      post_stress_level,
      post_strategy_confidence,
      post_noticed_changes,
      post_future_confidence,
      post_strategy_effectiveness,
    } = body;

    const noChange =
      Array.isArray(post_noticed_changes) &&
      post_noticed_changes.includes("no_change");

    if (
      workflow.checkpoint !== "post_survey" ||
      !isIntegerInRange(post_stress_level, 0, 100) ||
      !isIntegerInRange(post_strategy_confidence, 0, 100) ||
      !isOptionArray(post_noticed_changes, NOTICED_CHANGE_OPTIONS) ||
      (noChange && post_noticed_changes.length !== 1) ||
      !isOption(post_future_confidence, FUTURE_CONFIDENCE_OPTIONS) ||
      !isIntegerInRange(post_strategy_effectiveness, 0, 100)
    ) {
      return NextResponse.json(
        { error: "Complete every post-challenge survey question" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("official_challenge_workflows")
      .update({
        post_stress_level,
        post_strategy_confidence,
        post_noticed_changes,
        post_future_confidence,
        post_strategy_effectiveness,
        checkpoint: "completed",
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", workflow.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ workflow: data });
  }

  return NextResponse.json({ error: "Invalid workflow action" }, { status: 400 });
}
