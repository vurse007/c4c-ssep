"use client";

import { useEffect, useRef, useState } from "react";
import type {
  BoxBreathingDetails,
  CopingExerciseResult,
  FeelingCheckin,
} from "@/lib/coping-exercises";
import {
  BREATHING_MAX_SCALE,
  BREATHING_MIN_SCALE,
  BreathingCircle,
  ExerciseShell,
  FeelingCheckin as FeelingCheckinForm,
  GhostButton,
  PrimaryButton,
  ProgressTrack,
} from "./shared";

const PHASES = [
  { key: "inhale", label: "Inhale", expand: true, animate: true },
  { key: "hold_in", label: "Hold", expand: true, animate: false },
  { key: "exhale", label: "Exhale", expand: false, animate: true },
  { key: "hold_out", label: "Hold", expand: false, animate: false },
] as const;

const PHASE_MS = 4000;
const TOTAL_ROUNDS = 4;

type Props = {
  onComplete: (result: CopingExerciseResult) => void;
  onBack: () => void;
};

export function BoxBreathingGuide({ onComplete, onBack }: Props) {
  const startedAt = useRef(Date.now());
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const [feeling, setFeeling] = useState<FeelingCheckin | null>(null);
  const [note, setNote] = useState("");
  const pausedRef = useRef(false);
  const phaseRef = useRef(0);
  const roundRef = useRef(1);
  const progressRef = useRef(0);

  pausedRef.current = paused;
  phaseRef.current = phaseIndex;
  roundRef.current = round;
  progressRef.current = progress;

  useEffect(() => {
    if (!started || complete || paused) return;

    const startedAtMs = Date.now() - progressRef.current * PHASE_MS;
    let frame = 0;
    let lastUi = 0;

    const tick = () => {
      if (pausedRef.current) return;
      const nextProgress = Math.min(
        1,
        (Date.now() - startedAtMs) / PHASE_MS,
      );
      const now = Date.now();
      if (now - lastUi > 80 || nextProgress >= 1) {
        lastUi = now;
        setProgress(nextProgress);
      }

      if (nextProgress >= 1) {
        const nextPhase = phaseRef.current + 1;
        if (nextPhase >= PHASES.length) {
          if (roundRef.current >= TOTAL_ROUNDS) {
            setComplete(true);
            return;
          }
          setRound((current) => current + 1);
          setPhaseIndex(0);
          setProgress(0);
          return;
        }
        setPhaseIndex(nextPhase);
        setProgress(0);
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, paused, complete, phaseIndex, round]);

  const phase = PHASES[phaseIndex];
  const scale = phase.expand
    ? phase.animate
      ? BREATHING_MIN_SCALE +
        (BREATHING_MAX_SCALE - BREATHING_MIN_SCALE) * progress
      : BREATHING_MAX_SCALE
    : phase.animate
      ? BREATHING_MAX_SCALE -
        (BREATHING_MAX_SCALE - BREATHING_MIN_SCALE) * progress
      : BREATHING_MIN_SCALE;
  const secondsLeft = Math.max(1, Math.ceil((1 - progress) * 4));
  const overallProgress =
    (round - 1 + (phaseIndex + progress) / PHASES.length) / TOTAL_ROUNDS;

  const finish = (details: BoxBreathingDetails) => {
    onComplete({
      technique: "box_breathing",
      duration_seconds: Math.max(
        1,
        Math.round((Date.now() - startedAt.current) / 1000),
      ),
      feeling,
      feeling_note: note.trim() || null,
      details,
    });
  };

  if (complete) {
    return (
      <ExerciseShell eyebrow="Box Breathing">
        <div className="mb-8">
          <h1 className="font-serif text-3xl">Four rounds complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your breathing has a slower rhythm now. Stay with it for a moment.
          </p>
        </div>
        <FeelingCheckinForm
          feeling={feeling}
          note={note}
          onFeeling={setFeeling}
          onNote={setNote}
          onContinue={() =>
            finish({
              kind: "box_breathing",
              rounds_completed: TOTAL_ROUNDS,
              rounds_target: 4,
              stopped_early: false,
            })
          }
        />
      </ExerciseShell>
    );
  }

  if (!started) {
    return (
      <ExerciseShell eyebrow="Box Breathing">
        <h1 className="text-3xl font-bold tracking-tight">Box breathing</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          You&apos;ll complete four rounds. Each side of the box is four
          seconds: inhale, hold, exhale, hold. Follow the circle — it
          expands as you breathe in and settles as you breathe out.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <GhostButton onClick={onBack}>Choose a different strategy</GhostButton>
          <PrimaryButton onClick={() => setStarted(true)}>Begin</PrimaryButton>
        </div>
      </ExerciseShell>
    );
  }

  return (
    <ExerciseShell eyebrow="Box Breathing">
      <ProgressTrack
        value={overallProgress}
        label={`Round ${round} of ${TOTAL_ROUNDS}`}
      />
      <div className="mt-8 flex min-h-[420px] flex-col items-center justify-center border border-black/10 bg-white px-6 py-10">
        <BreathingCircle
          scale={scale}
          label={paused ? "Paused" : phase.label}
          countdown={paused ? "—" : secondsLeft}
        />
        <p className="mt-8 text-sm text-muted-foreground">
          {paused
            ? "Resume when you are ready."
            : phase.key === "inhale"
              ? "Breathe in slowly through your nose."
              : phase.key === "exhale"
                ? "Breathe out slowly through your mouth."
                : "Keep the breath still. Shoulders relaxed."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <GhostButton onClick={() => setPaused((current) => !current)}>
            {paused ? "Resume" : "Pause"}
          </GhostButton>
        </div>
      </div>
    </ExerciseShell>
  );
}
