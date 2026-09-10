"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  COLD_THERAPY_DURATIONS,
  COLD_THERAPY_METHODS,
  type ColdTherapyDuration,
  type ColdTherapyMethod,
  type CopingExerciseResult,
  type FeelingCheckin,
} from "@/lib/coping-exercises";
import {
  BREATHING_MAX_SCALE,
  BREATHING_MIN_SCALE,
  BreathingCircle,
  choiceClass,
  ExerciseShell,
  FeelingCheckin as FeelingCheckinForm,
  GhostButton,
  PrimaryButton,
  ProgressTrack,
} from "./shared";

const BREATH_MS = 5000;

type Stage = "setup" | "running" | "recovery" | "checkin";

type Props = {
  onComplete: (result: CopingExerciseResult) => void;
  onBack: () => void;
};

export function ColdTherapyGuide({ onComplete, onBack }: Props) {
  const startedAt = useRef(Date.now());
  const [stage, setStage] = useState<Stage>("setup");
  const [method, setMethod] = useState<ColdTherapyMethod | null>(null);
  const [target, setTarget] = useState<ColdTherapyDuration>(30);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [breathProgress, setBreathProgress] = useState(0);
  const [inhaling, setInhaling] = useState(true);
  const [feeling, setFeeling] = useState<FeelingCheckin | null>(null);
  const [note, setNote] = useState("");
  const pausedRef = useRef(false);

  pausedRef.current = paused;

  useEffect(() => {
    if (stage !== "running" || paused) return;

    const startedElapsed = elapsedMs;
    const clockStart = Date.now() - startedElapsed;
    const breathStart = Date.now();
    let inhalingNow = inhaling;
    let frame = 0;

    const tick = () => {
      if (pausedRef.current) return;
      const nextElapsed = Date.now() - clockStart;
      setElapsedMs(nextElapsed);

      const breathElapsed = (Date.now() - breathStart) % (BREATH_MS * 2);
      inhalingNow = breathElapsed < BREATH_MS;
      setInhaling(inhalingNow);
      setBreathProgress(
        inhalingNow
          ? breathElapsed / BREATH_MS
          : (breathElapsed - BREATH_MS) / BREATH_MS,
      );

      if (nextElapsed >= target * 1000) {
        setElapsedMs(target * 1000);
        setStage("recovery");
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [stage, paused, target]);

  const remaining = Math.max(0, Math.ceil((target * 1000 - elapsedMs) / 1000));
  const elapsedSeconds = Math.min(target, Math.round(elapsedMs / 1000));
  const ringProgress = Math.min(1, elapsedMs / (target * 1000));
  const scale = inhaling
    ? BREATHING_MIN_SCALE +
      (BREATHING_MAX_SCALE - BREATHING_MIN_SCALE) * breathProgress
    : BREATHING_MAX_SCALE -
      (BREATHING_MAX_SCALE - BREATHING_MIN_SCALE) * breathProgress;

  const finish = () => {
    if (!method) return;
    onComplete({
      technique: "cold_therapy",
      duration_seconds: Math.max(
        1,
        Math.round((Date.now() - startedAt.current) / 1000),
      ),
      feeling,
      feeling_note: note.trim() || null,
      details: {
        kind: "cold_therapy",
        method,
        target_seconds: target,
        elapsed_seconds: elapsedSeconds,
        stopped_early: false,
      },
    });
  };

  if (stage === "checkin") {
    return (
      <ExerciseShell eyebrow="Cold Therapy">
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

  if (stage === "recovery") {
    return (
      <ExerciseShell eyebrow="Cold Therapy">
        <div className="border border-black/10 bg-white px-6 py-10 sm:px-10">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">
            Recovery
          </p>
          <h1 className="mt-2 font-serif text-3xl">Return to normal breathing</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Dry your face or step out of the water. Let your breath find its
            usual pace. Notice warmth coming back into your skin.
          </p>
          <div className="mt-8">
            <PrimaryButton onClick={() => setStage("checkin")}>
              Continue
            </PrimaryButton>
          </div>
        </div>
      </ExerciseShell>
    );
  }

  if (stage === "running") {
    const size = 236;
    const stroke = 8;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
      <ExerciseShell eyebrow="Cold Therapy">
        <ProgressTrack
          value={ringProgress}
          label={`${remaining}s remaining`}
        />
        <div className="relative mt-8 flex min-h-[460px] flex-col items-center justify-center overflow-hidden border border-black/10 bg-white px-6 py-10">
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{ opacity: 0.18 + ringProgress * 0.28 }}
            style={{
              background:
                "radial-gradient(circle at 50% 45%, rgba(74, 144, 217, 0.55), transparent 62%)",
            }}
          />
          <div className="relative h-64 w-64">
            <svg
              width={size}
              height={size}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90"
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(27, 52, 104, 0.12)"
                strokeWidth={stroke}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#4A90D9"
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - ringProgress)}
                strokeLinecap="butt"
              />
            </svg>
            <BreathingCircle
              scale={paused ? BREATHING_MIN_SCALE : scale}
              color="#4A90D9"
              label={paused ? "Paused" : inhaling ? "Slow inhale" : "Slow exhale"}
              countdown={remaining}
            />
          </div>
          <p className="relative mt-6 max-w-sm text-center text-sm text-muted-foreground">
            {method === "cold_shower"
              ? "Keep the water on your shoulders and chest. Stay with slow breaths."
              : "Keep the cold on your face. Breathe slowly through your nose if you can."}
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <GhostButton onClick={() => setPaused((current) => !current)}>
              {paused ? "Resume" : "Pause"}
            </GhostButton>
          </div>
        </div>
      </ExerciseShell>
    );
  }

  return (
    <ExerciseShell eyebrow="Cold Therapy">
      <h1 className="text-3xl font-bold tracking-tight">Choose your method</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Then start the timer and keep your breath slow and controlled.
      </p>
      <div className="mt-8 grid gap-3">
        {COLD_THERAPY_METHODS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => {
              setMethod(option.key);
              setTarget(option.key === "face_water" ? 30 : 45);
            }}
            className={`${choiceClass} px-6 py-5 ${
              method === option.key
                ? "border-[#1B3468] bg-[#1B3468]/5"
                : "border-black/10 bg-white hover:border-black/25"
            }`}
          >
            <p className="font-serif text-[17px]">{option.label}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {option.key === "face_water"
                ? "Splash cold water on your face, or hold a cold cloth over your eyes and cheeks."
                : "Step into a cold shower and let the water hit your upper body. Stop if you feel dizzy."}
            </p>
          </button>
        ))}
      </div>

      {method && (
        <div className="mt-8 space-y-3">
          <p className="font-serif text-xl">How long?</p>
          <div className="flex flex-wrap gap-3">
            {COLD_THERAPY_DURATIONS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => setTarget(seconds)}
                className={`${choiceClass} ${
                  target === seconds
                    ? "border-[#1B3468] bg-[#1B3468]/5"
                    : "border-black/10 bg-white hover:border-black/25"
                }`}
              >
                {seconds} seconds
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <GhostButton onClick={onBack}>Choose a different strategy</GhostButton>
        <PrimaryButton
          disabled={!method}
          onClick={() => {
            setElapsedMs(0);
            setStage("running");
          }}
        >
          Start timer
        </PrimaryButton>
      </div>
    </ExerciseShell>
  );
}
