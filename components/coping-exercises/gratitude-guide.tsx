"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import type {
  CopingExerciseResult,
  FeelingCheckin,
  GratitudeEntry,
} from "@/lib/coping-exercises";
import {
  ExerciseShell,
  FeelingCheckin as FeelingCheckinForm,
  GhostButton,
  PrimaryButton,
  ProgressTrack,
  TextField,
} from "./shared";

const TOTAL = 3;
const PROMPTS = [
  "What is something you're grateful for?",
  "What's another thing you're grateful for?",
  "One more — what else are you grateful for?",
];

type Props = {
  onComplete: (result: CopingExerciseResult) => void;
  onBack: () => void;
};

const emptyEntry = (): GratitudeEntry => ({ what: "", why: "" });

export function GratitudeGuide({ onComplete, onBack }: Props) {
  const startedAt = useRef(Date.now());
  const [index, setIndex] = useState(0);
  const [entries, setEntries] = useState<GratitudeEntry[]>([
    emptyEntry(),
    emptyEntry(),
    emptyEntry(),
  ]);
  const [celebrating, setCelebrating] = useState(false);
  const [stage, setStage] = useState<"write" | "review" | "checkin">("write");
  const [feeling, setFeeling] = useState<FeelingCheckin | null>(null);
  const [note, setNote] = useState("");

  const entry = entries[index];
  const canAdvance =
    entry.what.trim().length > 0 && entry.why.trim().length > 0;

  const update = (patch: Partial<GratitudeEntry>) => {
    setEntries((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const celebrateTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current);
    };
  }, []);

  const goNext = () => {
    if (!canAdvance) return;
    setCelebrating(true);
    celebrateTimer.current = window.setTimeout(() => {
      setCelebrating(false);
      if (index === TOTAL - 1) {
        setStage("review");
        return;
      }
      setIndex((current) => current + 1);
    }, 650);
  };

  const finish = () => {
    onComplete({
      technique: "gratitude_exercise",
      duration_seconds: Math.max(
        1,
        Math.round((Date.now() - startedAt.current) / 1000),
      ),
      feeling,
      feeling_note: note.trim() || null,
      details: {
        kind: "gratitude_exercise",
        entries: entries.map((item) => ({
          what: item.what.trim(),
          why: item.why.trim(),
        })),
      },
    });
  };

  if (stage === "checkin") {
    return (
      <ExerciseShell eyebrow="Gratitude Exercise">
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

  if (stage === "review") {
    return (
      <ExerciseShell eyebrow="Gratitude Exercise">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Your three things
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sit with these for a moment. Notice what happens in your body
              as you read them back.
            </p>
          </div>
          <ol className="space-y-4">
            {entries.map((item, entryIndex) => (
              <li
                key={entryIndex}
                className="border border-black/10 bg-white px-5 py-4"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {entryIndex + 1} of 3
                </p>
                <p className="mt-2 font-serif text-lg">{item.what}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.why}
                </p>
              </li>
            ))}
          </ol>
          <PrimaryButton onClick={() => setStage("checkin")}>
            Continue
          </PrimaryButton>
        </motion.div>
      </ExerciseShell>
    );
  }

  return (
    <ExerciseShell eyebrow="Gratitude Exercise">
      <ProgressTrack
        value={(index + (celebrating ? 1 : 0)) / TOTAL}
        label={`${index + 1} of ${TOTAL}`}
      />
      <div className="relative mt-8 min-h-[360px] border border-black/10 bg-white px-6 py-10 sm:px-10">
        <AnimatePresence>
          {celebrating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-white/90"
            >
              <div className="flex h-16 w-16 items-center justify-center bg-[#1B3468] text-white">
                <Check size={28} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <h2 className="font-serif text-2xl">{PROMPTS[index]}</h2>
            <TextField
              value={entry.what}
              onChange={(value) => update({ what: value })}
              placeholder="Write it in a sentence"
              maxLength={300}
            />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Why is it meaningful to you?
              </p>
              <TextField
                value={entry.why}
                onChange={(value) => update({ why: value })}
                placeholder="A few words is enough"
                maxLength={400}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {index === 0 ? (
          <GhostButton onClick={onBack}>Choose a different strategy</GhostButton>
        ) : (
          <GhostButton onClick={() => setIndex((current) => current - 1)}>
            Back
          </GhostButton>
        )}
        <PrimaryButton disabled={!canAdvance || celebrating} onClick={goNext}>
          {index === TOTAL - 1 ? "Review" : "Next"}
        </PrimaryButton>
      </div>
    </ExerciseShell>
  );
}
