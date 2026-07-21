import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type ResultBody = Record<string, unknown>;

function isInteger(value: unknown, minimum = 0): value is number {
  return Number.isInteger(value) && Number(value) >= minimum;
}

function wordleScore(guesses: number, seconds: number, won: boolean) {
  if (!won) return 0;
  const guessScore = ((7 - guesses) / 6) * 40;
  const timeScore = (Math.max(0, 300 - seconds) / 300) * 20;
  return Math.round(30 + guessScore + timeScore);
}

function stroopScore(correct: number, total: number) {
  if (total === 0) return 0;
  const throughputScore = Math.min(correct / 23, 1) * 70;
  const accuracyScore = (correct / total) * 30;
  return Math.round(Math.min(100, throughputScore + accuracyScore));
}

function serialSubtractionScore(correct: number, total: number) {
  if (total === 0) return 0;
  const throughputScore = Math.min(correct / 13, 1) * 70;
  const accuracyScore = (correct / total) * 30;
  return Math.round(Math.min(100, throughputScore + accuracyScore));
}

function digitSpanScore(correctRounds: number, longestCorrectSpan: number) {
  if (correctRounds === 0) return 0;
  const spanScore = ((Math.max(longestCorrectSpan, 3) - 3) / 5) * 50;
  const accuracyScore = (correctRounds / 5) * 50;
  return Math.round(Math.min(100, spanScore + accuracyScore));
}

function isDigitSpanRoundDetail(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const detail = value as Record<string, unknown>;
  if (
    !isInteger(detail.length, 4) ||
    detail.length > 8 ||
    !Array.isArray(detail.sequence) ||
    !Array.isArray(detail.response) ||
    typeof detail.correct !== "boolean"
  ) {
    return false;
  }
  if (
    detail.sequence.length !== detail.length ||
    detail.response.length !== detail.length
  ) {
    return false;
  }
  return (
    detail.sequence.every(
      (digit) => Number.isInteger(digit) && digit >= 0 && digit <= 9,
    ) &&
    detail.response.every(
      (digit) => Number.isInteger(digit) && digit >= 0 && digit <= 9,
    )
  );
}

function validateWordle(body: ResultBody) {
  const { completion_time_seconds, guesses, won, target_word } = body;
  if (
    !isInteger(guesses, 1) ||
    guesses > 6 ||
    typeof won !== "boolean" ||
    !isInteger(completion_time_seconds) ||
    typeof target_word !== "string" ||
    !/^[a-z]{5}$/i.test(target_word)
  ) {
    return null;
  }

  return {
    score: wordleScore(guesses, completion_time_seconds, won),
    detail: {
      target_word: target_word.toUpperCase(),
      guesses,
      won,
      completion_time_seconds,
    },
  };
}

function validateStroop(body: ResultBody) {
  const {
    duration_seconds,
    total_responses,
    correct_responses,
    incorrect_responses,
    accuracy,
    average_response_time_ms,
    congruent_trials,
    congruent_correct,
    incongruent_trials,
    incongruent_correct,
  } = body;

  if (
    duration_seconds !== 15 ||
    !isInteger(total_responses) ||
    !isInteger(correct_responses) ||
    !isInteger(incorrect_responses) ||
    correct_responses + incorrect_responses !== total_responses ||
    typeof accuracy !== "number" ||
    accuracy < 0 ||
    accuracy > 1 ||
    Math.abs(
      accuracy -
        (total_responses === 0 ? 0 : correct_responses / total_responses),
    ) > 0.0001 ||
    !isInteger(average_response_time_ms) ||
    !isInteger(congruent_trials) ||
    !isInteger(congruent_correct) ||
    !isInteger(incongruent_trials) ||
    !isInteger(incongruent_correct) ||
    congruent_trials + incongruent_trials !== total_responses ||
    congruent_correct + incongruent_correct !== correct_responses ||
    congruent_correct > congruent_trials ||
    incongruent_correct > incongruent_trials
  ) {
    return null;
  }

  return {
    score: stroopScore(correct_responses, total_responses),
    detail: {
      duration_seconds,
      total_responses,
      correct_responses,
      incorrect_responses,
      accuracy,
      average_response_time_ms,
      congruent_trials,
      congruent_correct,
      incongruent_trials,
      incongruent_correct,
    },
  };
}

function validateSerialSubtraction(body: ResultBody) {
  const {
    starting_number,
    subtraction_value,
    duration_seconds,
    total_responses,
    correct_responses,
    distinct_errors,
    accuracy,
    average_response_time_ms,
    final_submitted_value,
  } = body;

  if (
    !isInteger(starting_number, 300) ||
    starting_number > 999 ||
    !isInteger(subtraction_value, 4) ||
    subtraction_value > 9 ||
    subtraction_value === 5 ||
    duration_seconds !== 30 ||
    !isInteger(total_responses) ||
    !isInteger(correct_responses) ||
    !isInteger(distinct_errors) ||
    correct_responses + distinct_errors !== total_responses ||
    typeof accuracy !== "number" ||
    accuracy < 0 ||
    accuracy > 1 ||
    Math.abs(
      accuracy -
        (total_responses === 0 ? 0 : correct_responses / total_responses),
    ) > 0.0001 ||
    !isInteger(average_response_time_ms) ||
    (total_responses === 0
      ? final_submitted_value !== null
      : !isInteger(final_submitted_value) ||
        final_submitted_value > 9999)
  ) {
    return null;
  }

  return {
    score: serialSubtractionScore(correct_responses, total_responses),
    detail: {
      starting_number,
      subtraction_value,
      duration_seconds,
      total_responses,
      correct_responses,
      distinct_errors,
      accuracy,
      average_response_time_ms,
      final_submitted_value,
    },
  };
}

function structuredListRecallScore(itemsCorrect: number) {
  return Math.round(Math.min(100, (itemsCorrect / 21) * 100));
}

function normalizeListWord(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function countStructuredListCorrect(
  sequence: { word: string; category: string }[],
  responses: Record<string, unknown>,
): number | null {
  const categories = ["fruits", "clothing", "names"] as const;
  const remaining = new Map<string, string>();

  for (const item of sequence) {
    const key = normalizeListWord(item.word);
    if (
      !key ||
      !categories.includes(item.category as (typeof categories)[number])
    ) {
      return null;
    }
    remaining.set(key, item.category);
  }

  let correct = 0;
  for (const category of categories) {
    const words = responses[category];
    if (!Array.isArray(words)) return null;
    const seen = new Set<string>();
    for (const raw of words) {
      const key = normalizeListWord(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (remaining.get(key) === category) {
        correct += 1;
        remaining.delete(key);
      }
    }
  }
  return correct;
}

function isStructuredListLevelDetail(
  value: unknown,
  expectedLevel: 1 | 2,
  expectedPerCategory: number,
): boolean {
  if (!value || typeof value !== "object") return false;
  const detail = value as Record<string, unknown>;
  const expectedTotal = expectedPerCategory * 3;

  if (
    detail.level !== expectedLevel ||
    detail.items_total !== expectedTotal ||
    !Array.isArray(detail.sequence) ||
    detail.sequence.length !== expectedTotal ||
    !detail.responses ||
    typeof detail.responses !== "object" ||
    !isInteger(detail.items_correct)
  ) {
    return false;
  }

  const counts = { fruits: 0, clothing: 0, names: 0 };
  const seenWords = new Set<string>();

  for (const item of detail.sequence) {
    if (!item || typeof item !== "object") return false;
    const entry = item as Record<string, unknown>;
    const word = normalizeListWord(entry.word);
    if (
      !word ||
      seenWords.has(word) ||
      (entry.category !== "fruits" &&
        entry.category !== "clothing" &&
        entry.category !== "names")
    ) {
      return false;
    }
    seenWords.add(word);
    counts[entry.category] += 1;
  }

  if (
    counts.fruits !== expectedPerCategory ||
    counts.clothing !== expectedPerCategory ||
    counts.names !== expectedPerCategory
  ) {
    return false;
  }

  const computed = countStructuredListCorrect(
    detail.sequence as { word: string; category: string }[],
    detail.responses as Record<string, unknown>,
  );
  return computed !== null && detail.items_correct === computed;
}

function validateStructuredListRecall(body: ResultBody) {
  const {
    levels_total,
    items_total,
    items_correct,
    level_details,
    duration_seconds,
  } = body;

  if (
    levels_total !== 2 ||
    items_total !== 21 ||
    !isInteger(items_correct) ||
    items_correct > 21 ||
    !isInteger(duration_seconds, 1) ||
    !Array.isArray(level_details) ||
    level_details.length !== 2 ||
    !isStructuredListLevelDetail(level_details[0], 1, 3) ||
    !isStructuredListLevelDetail(level_details[1], 2, 4)
  ) {
    return null;
  }

  const computedCorrect =
    (level_details[0] as { items_correct: number }).items_correct +
    (level_details[1] as { items_correct: number }).items_correct;

  if (items_correct !== computedCorrect) return null;

  return {
    score: structuredListRecallScore(computedCorrect),
    detail: {
      levels_total,
      items_total,
      items_correct: computedCorrect,
      level_details,
      duration_seconds,
    },
  };
}

function validateDigitSpan(body: ResultBody) {
  const {
    direction,
    rounds_total,
    rounds_correct,
    longest_correct_span,
    round_details,
    duration_seconds,
  } = body;

  if (
    (direction !== "forward" && direction !== "backward") ||
    rounds_total !== 5 ||
    !isInteger(rounds_correct) ||
    rounds_correct > 5 ||
    !isInteger(longest_correct_span) ||
    longest_correct_span > 8 ||
    !isInteger(duration_seconds, 1) ||
    !Array.isArray(round_details) ||
    round_details.length !== 5 ||
    !round_details.every(isDigitSpanRoundDetail)
  ) {
    return null;
  }

  const expectedLengths = [4, 5, 6, 7, 8];
  let computedCorrect = 0;
  let computedLongest = 0;

  for (let index = 0; index < round_details.length; index += 1) {
    const detail = round_details[index] as {
      length: number;
      sequence: number[];
      response: number[];
      correct: boolean;
    };

    if (detail.length !== expectedLengths[index]) return null;

    const expected =
      direction === "forward"
        ? detail.sequence
        : [...detail.sequence].reverse();
    const isCorrect = detail.response.every(
      (digit, digitIndex) => digit === expected[digitIndex],
    );

    if (detail.correct !== isCorrect) return null;
    if (isCorrect) {
      computedCorrect += 1;
      computedLongest = Math.max(computedLongest, detail.length);
    }
  }

  if (
    rounds_correct !== computedCorrect ||
    longest_correct_span !== computedLongest
  ) {
    return null;
  }

  return {
    score: digitSpanScore(computedCorrect, computedLongest),
    detail: {
      direction,
      rounds_total,
      rounds_correct: computedCorrect,
      longest_correct_span: computedLongest,
      round_details,
      duration_seconds,
    },
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Verify auth server-side (always works — reads HttpOnly cookies)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ResultBody;
  const { challenge, is_official, workflow_id } = body;

  if (is_official !== true || typeof workflow_id !== "string") {
    return NextResponse.json(
      { error: "A valid official challenge workflow is required" },
      { status: 400 },
    );
  }

  const { data: workflow, error: workflowError } = await supabase
    .from("official_challenge_workflows")
    .select(
      "id, checkpoint, status, selected_challenge, stress_management_technique",
    )
    .eq("id", workflow_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (workflowError) {
    return NextResponse.json(
      { error: workflowError.message },
      { status: 500 },
    );
  }

  if (
    !workflow ||
    workflow.status !== "active" ||
    !["challenge_play", "post_survey"].includes(workflow.checkpoint) ||
    workflow.selected_challenge !== challenge
  ) {
    return NextResponse.json(
      { error: "This challenge is not active in the current workflow" },
      { status: 400 },
    );
  }

  const advanceToPostSurvey = async () =>
    supabase
      .from("official_challenge_workflows")
      .update({
        checkpoint: "post_survey",
        updated_at: new Date().toISOString(),
      })
      .eq("id", workflow.id)
      .eq("user_id", user.id);

  const { data: existing, error: existingError } = await supabase
    .from("challenge_results")
    .select("id")
    .eq("workflow_id", workflow.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: existingError.message },
      { status: 500 },
    );
  }

  if (existing) {
    const { error: advanceError } = await advanceToPostSurvey();
    if (advanceError) {
      return NextResponse.json(
        { error: advanceError.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, id: existing.id });
  }

  if (workflow.checkpoint !== "challenge_play") {
    return NextResponse.json(
      { error: "This challenge result has already been saved" },
      { status: 409 },
    );
  }

  const validated =
    challenge === "wordle"
      ? validateWordle(body)
      : challenge === "stroop"
        ? validateStroop(body)
        : challenge === "serial-subtraction"
          ? validateSerialSubtraction(body)
          : challenge === "digit-span"
            ? validateDigitSpan(body)
            : challenge === "structured-list-recall"
              ? validateStructuredListRecall(body)
              : null;

  if (!validated) {
    return NextResponse.json(
      { error: "Invalid challenge result" },
      { status: 400 },
    );
  }

  // 1. Insert summary row
  const { data: summary, error: summaryError } = await supabase
    .from("challenge_results")
    .insert({
      user_id: user.id,
      challenge,
      score: validated.score,
      is_official: true,
      stress_management_technique:
        workflow.stress_management_technique,
      workflow_id: workflow.id,
    })
    .select("id")
    .single();

  if (summaryError || !summary) {
    console.error("[challenge-result] summary insert failed:", summaryError);
    return NextResponse.json({ error: summaryError?.message ?? "Insert failed" }, { status: 500 });
  }

  // 2. Insert challenge-specific detail row
  const detailTable =
    challenge === "wordle"
      ? "wordle_results"
      : challenge === "stroop"
        ? "stroop_results"
        : challenge === "serial-subtraction"
          ? "serial_subtraction_results"
          : challenge === "digit-span"
            ? "digit_span_results"
            : "structured_list_recall_results";
  const { error: detailError } = await supabase.from(detailTable).insert({
    user_id: user.id,
    result_id: summary.id,
    ...validated.detail,
  });

  if (detailError) {
    console.error(
      `[challenge-result] ${challenge} detail insert failed:`,
      detailError,
    );
    await supabase
      .from("challenge_results")
      .delete()
      .eq("id", summary.id)
      .eq("user_id", user.id);
    return NextResponse.json(
      { error: detailError.message },
      { status: 500 },
    );
  }

  const { error: advanceError } = await advanceToPostSurvey();
  if (advanceError) {
    return NextResponse.json(
      { error: advanceError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: summary.id });
}
