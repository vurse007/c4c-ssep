"use client";

import { motion } from "motion/react";
import {
  FEELING_CHECKIN_OPTIONS,
  type FeelingCheckin,
} from "@/lib/coping-exercises";

export const choiceClass =
  "text-left border px-4 py-3 text-sm transition-colors";

export function ExerciseShell({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">
        {eyebrow}
      </p>
      {children}
    </div>
  );
}

export function ProgressTrack({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
      )}
      <div className="h-[3px] w-full bg-black/10">
        <motion.div
          className="h-full bg-[#1B3468]"
          initial={false}
          animate={{ width: `${clamped * 100}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="bg-[#1B3468] px-7 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border border-black/15 bg-white px-7 py-3 text-sm font-medium text-foreground transition-colors hover:border-black/30 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function FeelingCheckin({
  feeling,
  note,
  onFeeling,
  onNote,
  onContinue,
  continueLabel = "Continue to survey",
}: {
  feeling: FeelingCheckin | null;
  note: string;
  onFeeling: (value: FeelingCheckin) => void;
  onNote: (value: string) => void;
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-8"
    >
      <div>
        <h2 className="font-serif text-3xl">How do you feel?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Optional — a quick check-in before the pre-challenge survey.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {FEELING_CHECKIN_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onFeeling(option.key)}
            className={`${choiceClass} ${
              feeling === option.key
                ? "border-[#1B3468] bg-[#1B3468]/5"
                : "border-black/10 bg-white hover:border-black/25"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={note}
        onChange={(event) => onNote(event.target.value.slice(0, 250))}
        placeholder="Anything you noticed? (optional)"
        maxLength={250}
        className="w-full border border-black/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#1B3468]"
      />
      <PrimaryButton onClick={onContinue}>{continueLabel}</PrimaryButton>
    </motion.div>
  );
}

export const BREATHING_MIN_SCALE = 0.76;
export const BREATHING_MAX_SCALE = 1;

export function BreathingCircle({
  scale,
  color = "#1B3468",
  label,
  countdown,
}: {
  scale: number;
  color?: string;
  label: string;
  countdown?: number | string;
}) {
  return (
    <div className="relative flex h-64 w-64 items-center justify-center">
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 240,
          height: 240,
          backgroundColor: color,
          opacity: 0.08,
        }}
        animate={{ scale }}
        transition={{ duration: 0.12, ease: "linear" }}
      />
      <motion.div
        className="absolute rounded-full border-[3px]"
        style={{
          width: 220,
          height: 220,
          borderColor: color,
        }}
        animate={{ scale }}
        transition={{ duration: 0.12, ease: "linear" }}
      />
      <div className="relative z-10 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {countdown !== undefined && (
          <p className="mt-1 font-serif text-5xl tabular-nums text-[#1B3468]">
            {countdown}
          </p>
        )}
      </div>
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full border border-black/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#1B3468]"
    />
  );
}
