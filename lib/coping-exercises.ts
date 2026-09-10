import {
  isStressTechnique,
  type StressTechniqueKey,
} from "@/lib/stress-techniques";

export const FEELING_CHECKIN_OPTIONS = [
  { key: "calmer", label: "Calmer" },
  { key: "the_same", label: "About the same" },
  { key: "more_activated", label: "More activated" },
] as const;

export const COLD_THERAPY_METHODS = [
  { key: "face_water", label: "Cold water on face" },
  { key: "cold_shower", label: "Cold shower" },
] as const;

export const COLD_THERAPY_DURATIONS = [30, 45, 60] as const;

export const EMRES_VALIDATION_OPTIONS = [
  { key: "resolved", label: "It's gone or much weaker" },
  { key: "different", label: "Different sensations appeared" },
  { key: "same", label: "It's about the same" },
] as const;

export type FeelingCheckin =
  (typeof FEELING_CHECKIN_OPTIONS)[number]["key"];
export type ColdTherapyMethod =
  (typeof COLD_THERAPY_METHODS)[number]["key"];
export type ColdTherapyDuration =
  (typeof COLD_THERAPY_DURATIONS)[number];
export type EmResValidation =
  (typeof EMRES_VALIDATION_OPTIONS)[number]["key"];

export type GroundingDetails = {
  kind: "54321_grounding";
  see: string[];
  feel: string[];
  hear: string[];
  smell: string[];
  taste: string[];
};

export type BoxBreathingDetails = {
  kind: "box_breathing";
  rounds_completed: number;
  rounds_target: 4;
  stopped_early: boolean;
};

export type AromatherapyDetails = {
  kind: "aromatherapy";
  breaths_completed: number;
  breaths_target: 4;
  stopped_early: boolean;
};

export type GratitudeEntry = {
  what: string;
  why: string;
};

export type GratitudeDetails = {
  kind: "gratitude_exercise";
  entries: GratitudeEntry[];
};

export type ColdTherapyDetails = {
  kind: "cold_therapy";
  method: ColdTherapyMethod;
  target_seconds: ColdTherapyDuration;
  elapsed_seconds: number;
  stopped_early: boolean;
};

export type EmResDetails = {
  kind: "emres";
  pattern: string;
  sensations: [string, string];
  attend_seconds: number;
  validation: EmResValidation;
  validation_note: string;
};

export type CopingExerciseDetails =
  | GroundingDetails
  | BoxBreathingDetails
  | AromatherapyDetails
  | GratitudeDetails
  | ColdTherapyDetails
  | EmResDetails;

export type CopingExerciseResult = {
  technique: StressTechniqueKey;
  duration_seconds: number;
  feeling: FeelingCheckin | null;
  feeling_note: string | null;
  details: CopingExerciseDetails;
};

function isFeelingCheckin(value: unknown): value is FeelingCheckin {
  return FEELING_CHECKIN_OPTIONS.some((option) => option.key === value);
}

function isStringArray(
  value: unknown,
  expectedItems: number,
  maximumLength: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === expectedItems &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0 &&
        item.trim().length <= maximumLength,
    )
  );
}

function isGroundingDetails(value: unknown): value is GroundingDetails {
  if (!value || typeof value !== "object") return false;
  const details = value as GroundingDetails;
  return (
    details.kind === "54321_grounding" &&
    isStringArray(details.see, 5, 200) &&
    isStringArray(details.feel, 4, 200) &&
    isStringArray(details.hear, 3, 200) &&
    isStringArray(details.smell, 2, 200) &&
    isStringArray(details.taste, 1, 200)
  );
}

function isBoxBreathingDetails(value: unknown): value is BoxBreathingDetails {
  if (!value || typeof value !== "object") return false;
  const details = value as BoxBreathingDetails;
  return (
    details.kind === "box_breathing" &&
    Number.isInteger(details.rounds_completed) &&
    details.rounds_completed >= 0 &&
    details.rounds_completed <= 4 &&
    details.rounds_target === 4 &&
    typeof details.stopped_early === "boolean"
  );
}

function isAromatherapyDetails(value: unknown): value is AromatherapyDetails {
  if (!value || typeof value !== "object") return false;
  const details = value as AromatherapyDetails;
  return (
    details.kind === "aromatherapy" &&
    Number.isInteger(details.breaths_completed) &&
    details.breaths_completed >= 0 &&
    details.breaths_completed <= 4 &&
    details.breaths_target === 4 &&
    typeof details.stopped_early === "boolean"
  );
}

function isGratitudeDetails(value: unknown): value is GratitudeDetails {
  if (!value || typeof value !== "object") return false;
  const details = value as GratitudeDetails;
  return (
    details.kind === "gratitude_exercise" &&
    Array.isArray(details.entries) &&
    details.entries.length === 3 &&
    details.entries.every(
      (entry) =>
        entry &&
        typeof entry.what === "string" &&
        entry.what.trim().length > 0 &&
        entry.what.trim().length <= 300 &&
        typeof entry.why === "string" &&
        entry.why.trim().length > 0 &&
        entry.why.trim().length <= 400,
    )
  );
}

function isEmResValidation(value: unknown): value is EmResValidation {
  return EMRES_VALIDATION_OPTIONS.some((option) => option.key === value);
}

function isEmResDetails(value: unknown): value is EmResDetails {
  if (!value || typeof value !== "object") return false;
  const details = value as EmResDetails;
  return (
    details.kind === "emres" &&
    typeof details.pattern === "string" &&
    details.pattern.trim().length > 0 &&
    details.pattern.trim().length <= 300 &&
    Array.isArray(details.sensations) &&
    details.sensations.length === 2 &&
    details.sensations.every(
      (sensation) =>
        typeof sensation === "string" &&
        sensation.trim().length > 0 &&
        sensation.trim().length <= 200,
    ) &&
    Number.isInteger(details.attend_seconds) &&
    details.attend_seconds >= 1 &&
    details.attend_seconds <= 1800 &&
    isEmResValidation(details.validation) &&
    typeof details.validation_note === "string" &&
    details.validation_note.trim().length > 0 &&
    details.validation_note.trim().length <= 400
  );
}

function isColdTherapyDetails(value: unknown): value is ColdTherapyDetails {
  if (!value || typeof value !== "object") return false;
  const details = value as ColdTherapyDetails;
  return (
    details.kind === "cold_therapy" &&
    COLD_THERAPY_METHODS.some((method) => method.key === details.method) &&
    COLD_THERAPY_DURATIONS.includes(
      details.target_seconds as ColdTherapyDuration,
    ) &&
    Number.isInteger(details.elapsed_seconds) &&
    details.elapsed_seconds >= 0 &&
    details.elapsed_seconds <= details.target_seconds &&
    typeof details.stopped_early === "boolean"
  );
}

export function isCopingExerciseResult(
  value: unknown,
): value is CopingExerciseResult {
  if (!value || typeof value !== "object") return false;
  const result = value as CopingExerciseResult;
  if (
    !isStressTechnique(result.technique) ||
    !Number.isInteger(result.duration_seconds) ||
    result.duration_seconds < 1 ||
    result.duration_seconds > 1800 ||
    (result.feeling !== null && !isFeelingCheckin(result.feeling)) ||
    (result.feeling_note !== null &&
      (typeof result.feeling_note !== "string" ||
        result.feeling_note.trim().length > 250)) ||
    !result.details ||
    result.details.kind !== result.technique
  ) {
    return false;
  }

  switch (result.technique) {
    case "54321_grounding":
      return isGroundingDetails(result.details);
    case "box_breathing":
      return isBoxBreathingDetails(result.details);
    case "aromatherapy":
      return isAromatherapyDetails(result.details);
    case "gratitude_exercise":
      return isGratitudeDetails(result.details);
    case "cold_therapy":
      return isColdTherapyDetails(result.details);
    case "emres":
      return isEmResDetails(result.details);
    default:
      return false;
  }
}

export function normalizeCopingExercise(
  result: CopingExerciseResult,
): CopingExerciseResult {
  const feelingNote =
    typeof result.feeling_note === "string"
      ? result.feeling_note.trim()
      : "";

  return {
    technique: result.technique,
    duration_seconds: result.duration_seconds,
    feeling: result.feeling,
    feeling_note: feelingNote.length > 0 ? feelingNote : null,
    details: normalizeDetails(result.details),
  };
}

function trimList(values: string[], maximum: number): string[] {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, maximum);
}

function normalizeDetails(
  details: CopingExerciseDetails,
): CopingExerciseDetails {
  if (details.kind === "54321_grounding") {
    return {
      kind: "54321_grounding",
      see: trimList(details.see, 5),
      feel: trimList(details.feel, 4),
      hear: trimList(details.hear, 3),
      smell: trimList(details.smell, 2),
      taste: trimList(details.taste, 1),
    };
  }

  if (details.kind === "gratitude_exercise") {
    return {
      kind: "gratitude_exercise",
      entries: details.entries.map((entry) => ({
        what: entry.what.trim(),
        why: entry.why.trim(),
      })),
    };
  }

  if (details.kind === "emres") {
    return {
      kind: "emres",
      pattern: details.pattern.trim(),
      sensations: [
        details.sensations[0].trim(),
        details.sensations[1].trim(),
      ],
      attend_seconds: details.attend_seconds,
      validation: details.validation,
      validation_note: details.validation_note.trim(),
    };
  }

  return details;
}
