"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  BODY_FEELING_OPTIONS,
  DAY_PACE_OPTIONS,
  FOCUS_EFFORT_OPTIONS,
  type BodyFeeling,
  type DayPace,
  type FocusEffort,
  type PreSurveyData,
} from "@/lib/challenge-workflow";
import {
  STRESS_TECHNIQUES,
  type StressTechniqueKey,
} from "@/lib/stress-techniques";

type Props = {
  onSubmit: (data: PreSurveyData) => Promise<void>;
};

const choiceClass =
  "text-left border px-4 py-3 text-sm transition-colors";

export function PreChallengeSurvey({ onSubmit }: Props) {
  const [technique, setTechnique] =
    useState<StressTechniqueKey | null>(null);
  const [stressLevel, setStressLevel] = useState(50);
  const [currentBpm, setCurrentBpm] = useState("");
  const [dayPace, setDayPace] = useState<DayPace | null>(null);
  const [focusEffort, setFocusEffort] =
    useState<FocusEffort | null>(null);
  const [bodyFeelings, setBodyFeelings] = useState<BodyFeeling[]>([]);
  const [bodyOther, setBodyOther] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleBodyFeeling = (value: BodyFeeling) => {
    setBodyFeelings((current) => {
      if (value === "perfectly_normal") {
        setBodyOther("");
        return current.includes(value) ? [] : [value];
      }

      const withoutNormal = current.filter(
        (item) => item !== "perfectly_normal",
      );
      if (withoutNormal.includes(value)) {
        if (value === "other") setBodyOther("");
        return withoutNormal.filter((item) => item !== value);
      }
      return [...withoutNormal, value];
    });
  };

  const bpmValue = Number(currentBpm);
  const bpmValid =
    currentBpm.trim().length > 0 &&
    Number.isInteger(bpmValue) &&
    bpmValue >= 30 &&
    bpmValue <= 220;

  const canSubmit =
    technique !== null &&
    bpmValid &&
    dayPace !== null &&
    focusEffort !== null &&
    bodyFeelings.length > 0 &&
    (!bodyFeelings.includes("other") || bodyOther.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit || !technique || !dayPace || !focusEffort) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        stress_management_technique: technique,
        pre_stress_level: stressLevel,
        pre_current_bpm: bpmValue,
        pre_day_pace: dayPace,
        pre_focus_effort: focusEffort,
        pre_body_feelings: bodyFeelings,
        pre_body_other: bodyFeelings.includes("other")
          ? bodyOther.trim()
          : null,
      });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to save the survey",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">
          Pre-challenge survey
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Start Challenge
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete each question before selecting your challenge.
        </p>
      </div>

      <div className="mt-16 space-y-32">
      <section className="space-y-4">
        <h2 className="font-serif text-xl">
          What coping strategy did you use?
        </h2>
        <div className="grid gap-3">
          {STRESS_TECHNIQUES.map((option) => {
            const selected = technique === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setTechnique(option.key)}
                className={`${choiceClass} px-6 py-5 ${
                  selected
                    ? "border-[#1B3468] bg-[#1B3468]/5"
                    : "border-black/10 bg-white hover:border-black/25"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-[17px]">
                      {option.label}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  {selected && <Check size={18} className="text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl">
            Current stress level
          </h2>
          <span className="text-lg font-medium">{stressLevel}%</span>
        </div>
        <p className="text-sm text-muted-foreground">
          0% = no stress, 100% = highest stress
        </p>
        <input
          type="range"
          min={0}
          max={100}
          value={stressLevel}
          onChange={(event) => setStressLevel(Number(event.target.value))}
          className="w-full accent-[#1B3468]"
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">
          What is your current BPM?
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your heart rate in beats per minute.
        </p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={currentBpm}
          onChange={(event) =>
            setCurrentBpm(event.target.value.replace(/\D/g, "").slice(0, 3))
          }
          placeholder="e.g. 72"
          className="w-full max-w-xs border border-black/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#1B3468]"
        />
      </section>

      <ChoiceSection
        title="If today had a pace, what would it be?"
        options={DAY_PACE_OPTIONS}
        selected={dayPace}
        onSelect={setDayPace}
      />

      <ChoiceSection
        title="How much effort do you think it would take to stay focused right now?"
        options={FOCUS_EFFORT_OPTIONS}
        selected={focusEffort}
        onSelect={setFocusEffort}
      />

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl">
            How does your body feel right now before starting the challenge?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select all that apply.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {BODY_FEELING_OPTIONS.map((option) => {
            const selected = bodyFeelings.includes(option.key);
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => toggleBodyFeeling(option.key)}
                className={`${choiceClass} flex items-center justify-between ${
                  selected
                    ? "border-[#1B3468] bg-[#1B3468]/5"
                    : "border-black/10 bg-white hover:border-black/25"
                }`}
              >
                {option.label}
                <span
                  className={`flex h-5 w-5 items-center justify-center border ${
                    selected
                      ? "border-[#1B3468] bg-[#1B3468] text-white"
                      : "border-black/20"
                  }`}
                >
                  {selected && <Check size={13} />}
                </span>
              </button>
            );
          })}
        </div>
        {bodyFeelings.includes("other") && (
          <input
            type="text"
            value={bodyOther}
            onChange={(event) => setBodyOther(event.target.value)}
            placeholder="Please describe how your body feels"
            maxLength={250}
            className="w-full border border-black/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#1B3468]"
          />
        )}
      </section>
      </div>

      <div className="mt-32 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          disabled={!canSubmit || saving}
          onClick={handleSubmit}
          className="bg-[#1B3468] px-7 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving…" : "Continue to Puzzles"}
        </button>
      </div>
    </div>
  );
}

function ChoiceSection<T extends string>({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: readonly { key: T; label: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-serif text-xl">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelect(option.key)}
            className={`${choiceClass} ${
              selected === option.key
                ? "border-[#1B3468] bg-[#1B3468]/5"
                : "border-black/10 bg-white hover:border-black/25"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
