"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type {
  CopingExerciseResult,
  FeelingCheckin,
  GroundingDetails,
} from "@/lib/coping-exercises";
import {
  ExerciseShell,
  FeelingCheckin as FeelingCheckinForm,
  GhostButton,
  PrimaryButton,
  ProgressTrack,
  TextField,
} from "./shared";

const STEPS = [
  {
    key: "see" as const,
    count: 5,
    title: "See",
    prompt: "Look around slowly. What five things can you see?",
    hint: "A color, an object, a patch of light…",
    glow: "rgba(196, 163, 90, 0.28)",
  },
  {
    key: "feel" as const,
    count: 4,
    title: "Feel",
    prompt: "Notice four things you can feel against your skin or body.",
    hint: "Fabric, temperature, the chair beneath you…",
    glow: "rgba(176, 125, 98, 0.28)",
  },
  {
    key: "hear" as const,
    count: 3,
    title: "Hear",
    prompt: "Pause and listen. What three sounds are around you?",
    hint: "A hum, voices, your own breath…",
    glow: "rgba(74, 144, 217, 0.28)",
  },
  {
    key: "smell" as const,
    count: 2,
    title: "Smell",
    prompt: "Notice two scents, even faint ones.",
    hint: "Soap, coffee, the room itself…",
    glow: "rgba(107, 143, 113, 0.28)",
  },
  {
    key: "taste" as const,
    count: 1,
    title: "Taste",
    prompt: "Notice one taste, or even the absence of one.",
    hint: "Toothpaste, tea, the air on your tongue…",
    glow: "rgba(196, 122, 122, 0.28)",
  },
];

type Props = {
  onComplete: (result: CopingExerciseResult) => void;
  onBack: () => void;
};

function emptyFields(count: number) {
  return Array.from({ length: count }, () => "");
}

export function SenseGroundingGuide({ onComplete, onBack }: Props) {
  const startedAt = useRef(Date.now());
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({
    see: emptyFields(5),
    feel: emptyFields(4),
    hear: emptyFields(3),
    smell: emptyFields(2),
    taste: emptyFields(1),
  });
  const [done, setDone] = useState(false);
  const [feeling, setFeeling] = useState<FeelingCheckin | null>(null);
  const [note, setNote] = useState("");

  const step = STEPS[stepIndex];
  const fields = answers[step.key];
  const canAdvance = fields.every((value) => value.trim().length > 0);

  const updateField = (index: number, value: string) => {
    setAnswers((current) => {
      const next = [...current[step.key]];
      next[index] = value;
      return { ...current, [step.key]: next };
    });
  };

  const finish = () => {
    const trim = (values: string[]) =>
      values.map((value) => value.trim()).filter((value) => value.length > 0);
    const details: GroundingDetails = {
      kind: "54321_grounding",
      see: trim(answers.see),
      feel: trim(answers.feel),
      hear: trim(answers.hear),
      smell: trim(answers.smell),
      taste: trim(answers.taste),
    };
    onComplete({
      technique: "54321_grounding",
      duration_seconds: Math.max(
        1,
        Math.round((Date.now() - startedAt.current) / 1000),
      ),
      feeling,
      feeling_note: note.trim() || null,
      details,
    });
  };

  if (done) {
    return (
      <ExerciseShell eyebrow="5-4-3-2-1 Sense Grounding">
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

  return (
    <ExerciseShell eyebrow="5-4-3-2-1 Sense Grounding">
      <ProgressTrack
        value={(stepIndex + 1) / STEPS.length}
        label={`Step ${stepIndex + 1} of ${STEPS.length}`}
      />

      <div className="relative mt-8 overflow-hidden border border-black/10 bg-white px-6 py-10 sm:px-10">
        <motion.div
          key={step.key}
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            background: `radial-gradient(circle at 50% 28%, ${step.glow}, transparent 62%)`,
          }}
        />

        {step.key === "hear" && (
          <>
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="pointer-events-none absolute left-1/2 top-[118px] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#4A90D9]/30"
                initial={{ scale: 0.4, opacity: 0.5 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  delay: index * 0.7,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10"
          >
            <div className="flex flex-col items-center text-center">
              <motion.p
                className="font-serif text-[clamp(72px,18vw,112px)] leading-none tracking-tight text-[#1B3468]"
                initial={{ scale: 0.86, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {step.count}
              </motion.p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {step.title}
              </p>
              <h2 className="mt-6 max-w-md font-serif text-2xl">{step.prompt}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.hint}</p>
            </div>

            <div className="mx-auto mt-8 max-w-md space-y-3">
              {fields.map((value, index) => (
                <TextField
                  key={`${step.key}-${index}`}
                  value={value}
                  onChange={(next) => updateField(index, next)}
                  placeholder={`${index + 1}.`}
                  maxLength={200}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {stepIndex === 0 ? (
          <GhostButton onClick={onBack}>Choose a different strategy</GhostButton>
        ) : (
          <GhostButton onClick={() => setStepIndex((current) => current - 1)}>
            Back
          </GhostButton>
        )}
        <PrimaryButton
          disabled={!canAdvance}
          onClick={() => {
            if (stepIndex === STEPS.length - 1) {
              setDone(true);
              return;
            }
            setStepIndex((current) => current + 1);
          }}
        >
          {stepIndex === STEPS.length - 1 ? "Finish" : "Next"}
        </PrimaryButton>
      </div>
    </ExerciseShell>
  );
}
