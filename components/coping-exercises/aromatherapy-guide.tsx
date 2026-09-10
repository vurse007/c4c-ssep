"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AromatherapyDetails,
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

const BREATHS = 4;
const INHALE_MS = 4000;
const EXHALE_MS = 6000;

type Phase = "inhale" | "exhale";

type Props = {
  onComplete: (result: CopingExerciseResult) => void;
  onBack: () => void;
};

export function AromatherapyGuide({ onComplete, onBack }: Props) {
  const startedAt = useRef(Date.now());
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [breath, setBreath] = useState(1);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const [feeling, setFeeling] = useState<FeelingCheckin | null>(null);
  const [note, setNote] = useState("");
  const pausedRef = useRef(false);
  const phaseRef = useRef<Phase>("inhale");
  const breathRef = useRef(1);

  pausedRef.current = paused;
  phaseRef.current = phase;
  breathRef.current = breath;

  const phaseMs = phase === "inhale" ? INHALE_MS : EXHALE_MS;

  useEffect(() => {
    if (!ready || complete || paused) return;

    const startedAtMs = Date.now() - progress * phaseMs;
    let frame = 0;
    let lastUi = 0;

    const tick = () => {
      if (pausedRef.current) return;
      const nextProgress = Math.min(
        1,
        (Date.now() - startedAtMs) / phaseMs,
      );
      const now = Date.now();
      if (now - lastUi > 80 || nextProgress >= 1) {
        lastUi = now;
        setProgress(nextProgress);
      }

      if (nextProgress >= 1) {
        if (phaseRef.current === "inhale") {
          setPhase("exhale");
          setProgress(0);
          return;
        }
        if (breathRef.current >= BREATHS) {
          setComplete(true);
          return;
        }
        setBreath((current) => current + 1);
        setPhase("inhale");
        setProgress(0);
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, paused, complete, phase, breath, phaseMs]);

  const scale =
    phase === "inhale"
      ? BREATHING_MIN_SCALE +
        (BREATHING_MAX_SCALE - BREATHING_MIN_SCALE) * progress
      : BREATHING_MAX_SCALE -
        (BREATHING_MAX_SCALE - BREATHING_MIN_SCALE) * progress;
  const secondsLeft = Math.max(
    1,
    Math.ceil((1 - progress) * (phaseMs / 1000)),
  );

  const finish = (details: AromatherapyDetails) => {
    onComplete({
      technique: "aromatherapy",
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
      <ExerciseShell eyebrow="Aromatherapy">
        <div className="mb-8">
          <h1 className="font-serif text-3xl">Four breaths complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set the gauze aside and let the scent fade on its own.
          </p>
        </div>
        <FeelingCheckinForm
          feeling={feeling}
          note={note}
          onFeeling={setFeeling}
          onNote={setNote}
          onContinue={() =>
            finish({
              kind: "aromatherapy",
              breaths_completed: BREATHS,
              breaths_target: 4,
              stopped_early: false,
            })
          }
        />
      </ExerciseShell>
    );
  }

  if (!ready) {
    return (
      <ExerciseShell eyebrow="Aromatherapy">
        <h1 className="text-3xl font-bold tracking-tight">Prepare the scent</h1>
        <div className="mt-5 max-w-lg space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Place 3–5 drops of essential oil on a piece of gauze or tissue.
            Hold it a few inches from your face — not touching your skin —
            and give yourself a moment to notice the scent.
          </p>
          <p>
            You&apos;ll take four slow breaths. On each one, follow the
            circle and keep your attention on the smell as you inhale and
            exhale.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <GhostButton onClick={onBack}>Choose a different strategy</GhostButton>
          <PrimaryButton onClick={() => setReady(true)}>
            Ready to begin
          </PrimaryButton>
        </div>
      </ExerciseShell>
    );
  }

  return (
    <ExerciseShell eyebrow="Aromatherapy">
      <ProgressTrack
        value={(breath - 1 + (phase === "exhale" ? 0.5 : 0) + progress / 2) / BREATHS}
        label={`Breath ${breath} of ${BREATHS}`}
      />
      <div className="mt-8 flex min-h-[420px] flex-col items-center justify-center border border-black/10 bg-white px-6 py-10">
        <BreathingCircle
          scale={scale}
          color="#6B8F71"
          label={paused ? "Paused" : phase === "inhale" ? "Breathe in" : "Breathe out"}
          countdown={paused ? "—" : secondsLeft}
        />
        <p className="mt-8 max-w-sm text-center text-sm text-muted-foreground">
          {paused
            ? "Resume when you are ready."
            : phase === "inhale"
              ? "Draw the scent in slowly. Notice what you smell."
              : "Let the breath leave. Keep the scent in mind."}
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
