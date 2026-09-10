"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  EMRES_VALIDATION_OPTIONS,
  type CopingExerciseResult,
  type EmResValidation,
  type FeelingCheckin,
} from "@/lib/coping-exercises";
import {
  choiceClass,
  ExerciseShell,
  FeelingCheckin as FeelingCheckinForm,
  GhostButton,
  PrimaryButton,
  ProgressTrack,
  TextField,
} from "./shared";

const MIN_ATTEND_SECONDS = 20;
const SUGGESTED_ATTEND_SECONDS = 90;

type Stage =
  | "intro"
  | "notice"
  | "close"
  | "feel"
  | "attend"
  | "validate"
  | "checkin";

const STAGES: Stage[] = [
  "intro",
  "notice",
  "close",
  "feel",
  "attend",
  "validate",
];

type Props = {
  onComplete: (result: CopingExerciseResult) => void;
  onBack: () => void;
};

const SensationOrbs = memo(function SensationOrbs() {
  return (
    <div className="relative flex h-48 w-64 items-center justify-center">
      <div className="emres-orb emres-orb-a" />
      <div className="emres-orb emres-orb-b" />
    </div>
  );
});

export function EmResGuide({ onComplete, onBack }: Props) {
  const startedAt = useRef(Date.now());
  const [stage, setStage] = useState<Stage>("intro");
  const [pattern, setPattern] = useState("");
  const [sensationOne, setSensationOne] = useState("");
  const [sensationTwo, setSensationTwo] = useState("");
  const [attendSeconds, setAttendSeconds] = useState(0);
  const [validation, setValidation] = useState<EmResValidation | null>(null);
  const [validationNote, setValidationNote] = useState("");
  const [feeling, setFeeling] = useState<FeelingCheckin | null>(null);
  const [note, setNote] = useState("");
  const attendSecondsRef = useRef(0);

  attendSecondsRef.current = attendSeconds;

  useEffect(() => {
    if (stage !== "attend") return;

    const started = Date.now() - attendSecondsRef.current * 1000;
    const tick = () => {
      setAttendSeconds(Math.max(1, Math.round((Date.now() - started) / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  const finish = () => {
    if (!validation) return;
    onComplete({
      technique: "emres",
      duration_seconds: Math.max(
        1,
        Math.round((Date.now() - startedAt.current) / 1000),
      ),
      feeling,
      feeling_note: note.trim() || null,
      details: {
        kind: "emres",
        pattern: pattern.trim(),
        sensations: [sensationOne.trim(), sensationTwo.trim()],
        attend_seconds: Math.min(1800, Math.max(1, attendSeconds)),
        validation,
        validation_note: validationNote.trim(),
      },
    });
  };

  const stageIndex = STAGES.indexOf(stage);
  const progress = stage === "checkin" ? 1 : (stageIndex + 1) / STAGES.length;

  if (stage === "checkin") {
    return (
      <ExerciseShell eyebrow="Self-EmRes">
        <FeelingCheckinForm
          feeling={feeling}
          note={note}
          onFeeling={setFeeling}
          onNote={setNote}
          onContinue={finish}
        />
      </ExerciseShell>
    );
  }

  if (stage === "validate") {
    const canAdvance =
      validation !== null && validationNote.trim().length > 0;

    return (
      <ExerciseShell eyebrow="Self-EmRes">
        <ProgressTrack value={progress} label="Validate" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Open your eyes</h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Take a moment. Then think about the original trigger again —
              {pattern.trim() ? ` “${pattern.trim()}.”` : ""} What happens in
              your body now?
            </p>
          </div>
          <div className="grid gap-3">
            {EMRES_VALIDATION_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setValidation(option.key)}
                className={`${choiceClass} ${
                  validation === option.key
                    ? "border-[#1B3468] bg-[#1B3468]/5"
                    : "border-black/10 bg-white hover:border-black/25"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              What do you notice now?
            </p>
            <TextField
              value={validationNote}
              onChange={setValidationNote}
              placeholder="A few words about the sensations or the reaction"
              maxLength={400}
            />
          </div>
          {validation === "different" && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              If new sensations appeared, you can run Self-EmRes again later
              with those. For now, finish this round.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <GhostButton onClick={() => setStage("attend")}>Back</GhostButton>
            <PrimaryButton
              disabled={!canAdvance}
              onClick={() => setStage("checkin")}
            >
              Continue
            </PrimaryButton>
          </div>
        </motion.div>
      </ExerciseShell>
    );
  }

  if (stage === "attend") {
    const canSettle = attendSeconds >= MIN_ATTEND_SECONDS;

    return (
      <ExerciseShell eyebrow="Self-EmRes">
        <ProgressTrack
          value={Math.min(1, attendSeconds / SUGGESTED_ATTEND_SECONDS)}
          label="Stay attentive"
        />
        <div className="relative mt-8 flex min-h-[420px] flex-col items-center justify-center overflow-hidden border border-black/10 bg-white px-6 py-10">
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 42%, rgba(92, 74, 107, 0.28), transparent 62%)",
            }}
          />
          <SensationOrbs />
          <p className="relative mt-2 font-serif text-2xl">Just feel</p>
          <p className="relative mt-3 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
            Keep both sensations in your attention at the same time. Don&apos;t
            control them. Don&apos;t analyze them. Feeling is the only action.
          </p>
          <p className="relative mt-6 font-serif text-4xl tabular-nums text-[#1B3468]">
            {attendSeconds}s
          </p>
          <p className="relative mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {canSettle
              ? "Continue when they have settled"
              : "Stay with the sensations"}
          </p>
          <div className="relative mt-8">
            <PrimaryButton
              disabled={!canSettle}
              onClick={() => setStage("validate")}
            >
              The sensations have settled
            </PrimaryButton>
          </div>
        </div>
      </ExerciseShell>
    );
  }

  if (stage === "feel") {
    const canAdvance =
      sensationOne.trim().length > 0 && sensationTwo.trim().length > 0;

    return (
      <ExerciseShell eyebrow="Self-EmRes">
        <ProgressTrack value={progress} label="Feel" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Feel two sensations
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Direct your attention to your body. Feeling is an action. Name at
              least two physical sensations at the same time — that keeps you
              with the body instead of the story.
            </p>
          </div>
          <div className="space-y-3">
            <TextField
              value={sensationOne}
              onChange={setSensationOne}
              placeholder="Tightness, warmth, pressure…"
              maxLength={200}
            />
            <TextField
              value={sensationTwo}
              onChange={setSensationTwo}
              placeholder="Fluttering, tingling, heaviness…"
              maxLength={200}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <GhostButton onClick={() => setStage("close")}>Back</GhostButton>
            <PrimaryButton
              disabled={!canAdvance}
              onClick={() => {
                setAttendSeconds(0);
                setStage("attend");
              }}
            >
              I can feel both
            </PrimaryButton>
          </div>
        </motion.div>
      </ExerciseShell>
    );
  }

  if (stage === "close") {
    return (
      <ExerciseShell eyebrow="Self-EmRes">
        <ProgressTrack value={progress} label="Close your eyes" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Close your eyes
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Only if you feel physically safe where you are. Your brain needs
              to feel the predicted sensations in a safe place before it can
              update them. If you don&apos;t feel safe, change your environment
              first.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <GhostButton onClick={() => setStage("notice")}>Back</GhostButton>
            <PrimaryButton onClick={() => setStage("feel")}>
              I feel safe to continue
            </PrimaryButton>
          </div>
        </motion.div>
      </ExerciseShell>
    );
  }

  if (stage === "notice") {
    return (
      <ExerciseShell eyebrow="Self-EmRes">
        <ProgressTrack value={progress} label="Notice" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              What are you feeling?
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Recognize the emotion and make it your priority — the way you
              would stop for a nosebleed. Name the recurring pattern you want
              to resolve.
            </p>
          </div>
          <TextField
            value={pattern}
            onChange={setPattern}
            placeholder="Fear before speaking, pressure before a test…"
            maxLength={300}
          />
          <div className="flex flex-wrap gap-3">
            <GhostButton onClick={() => setStage("intro")}>Back</GhostButton>
            <PrimaryButton
              disabled={pattern.trim().length === 0}
              onClick={() => setStage("close")}
            >
              Next
            </PrimaryButton>
          </div>
        </motion.div>
      </ExerciseShell>
    );
  }

  return (
    <ExerciseShell eyebrow="Self-EmRes">
      <ProgressTrack value={progress} label="Resolve, don't regulate" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Self-EmRes</h1>
          <div className="mt-5 max-w-lg space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Other strategies help you manage an emotion so you can get
              through the moment. EmRes is different: it aims to resolve the
              reaction so it stops coming back.
            </p>
            <p>
              You&apos;ll notice the emotion, close your eyes if you feel safe,
              feel at least two body sensations at once, and stay with them
              until they settle on their own — without controlling or analyzing.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <GhostButton onClick={onBack}>Choose a different strategy</GhostButton>
          <PrimaryButton onClick={() => setStage("notice")}>Begin</PrimaryButton>
        </div>
      </motion.div>
    </ExerciseShell>
  );
}
