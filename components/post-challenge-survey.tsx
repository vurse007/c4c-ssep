"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  FUTURE_CONFIDENCE_OPTIONS,
  NOTICED_CHANGE_OPTIONS,
  type FutureConfidence,
  type NoticedChange,
  type PostSurveyData,
} from "@/lib/challenge-workflow";

type Props = {
  onSubmit: (data: PostSurveyData) => Promise<void>;
};

export function PostChallengeSurvey({ onSubmit }: Props) {
  const [stressLevel, setStressLevel] = useState(50);
  const [strategyConfidence, setStrategyConfidence] = useState(50);
  const [noticedChanges, setNoticedChanges] = useState<NoticedChange[]>([]);
  const [futureConfidence, setFutureConfidence] =
    useState<FutureConfidence | null>(null);
  const [effectiveness, setEffectiveness] = useState(50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChange = (value: NoticedChange) => {
    setNoticedChanges((current) => {
      if (value === "no_change") {
        return current.includes(value) ? [] : [value];
      }
      const withoutNoChange = current.filter(
        (item) => item !== "no_change",
      );
      return withoutNoChange.includes(value)
        ? withoutNoChange.filter((item) => item !== value)
        : [...withoutNoChange, value];
    });
  };

  const canSubmit =
    noticedChanges.length > 0 && futureConfidence !== null;

  const handleSubmit = async () => {
    if (!canSubmit || !futureConfidence) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        post_stress_level: stressLevel,
        post_strategy_confidence: strategyConfidence,
        post_noticed_changes: noticedChanges,
        post_future_confidence: futureConfidence,
        post_strategy_effectiveness: effectiveness,
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
          Post-challenge survey
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Reflect on the Challenge
        </h1>
        <p className="text-muted-foreground mt-2">
          Complete this final survey to add the attempt to your Overview.
        </p>
      </div>

      <div className="mt-16 space-y-32">
      <SliderQuestion
        title="Current stress level"
        description="0% = no stress, 100% = highest stress"
        value={stressLevel}
        minimum={0}
        maximum={100}
        suffix="%"
        onChange={setStressLevel}
      />

      <SliderQuestion
        title="How confident are you in your ability to manage stressful situations after using this strategy?"
        description="0% = no confidence, 100% = complete confidence"
        value={strategyConfidence}
        minimum={0}
        maximum={100}
        suffix="%"
        onChange={setStrategyConfidence}
      />

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl">
            What changes did you notice after using the coping strategy?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select all that apply.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {NOTICED_CHANGE_OPTIONS.map((option) => {
            const selected = noticedChanges.includes(option.key);
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => toggleChange(option.key)}
                className={`flex items-center justify-between border px-4 py-3 text-left text-sm transition-colors ${
                  selected
                    ? "border-[#1B3468] bg-[#1B3468]/5"
                    : "border-black/10 bg-white hover:border-black/25"
                }`}
              >
                {option.label}
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
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
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl">
          Imagine you encounter a stressful situation in the future. After
          practicing this strategy, how confident are you in your ability to
          effectively use it?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FUTURE_CONFIDENCE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFutureConfidence(option.key)}
              className={`border px-4 py-3 text-left text-sm transition-colors ${
                futureConfidence === option.key
                  ? "border-[#1B3468] bg-[#1B3468]/5"
                  : "border-black/10 bg-white hover:border-black/25"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <SliderQuestion
        title="How effective was this coping strategy for improving your focus, mood, or performance today?"
        description="0% = not effective, 100% = extremely effective"
        value={effectiveness}
        minimum={0}
        maximum={100}
        suffix="%"
        onChange={setEffectiveness}
      />
      </div>

      <div className="mt-32 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          disabled={!canSubmit || saving}
          onClick={handleSubmit}
          className="bg-[#1B3468] px-7 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving…" : "Complete Challenge"}
        </button>
      </div>
    </div>
  );
}

function SliderQuestion({
  title,
  description,
  value,
  minimum,
  maximum,
  suffix = "",
  onChange,
}: {
  title: string;
  description: string;
  value: number;
  minimum: number;
  maximum: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-6">
        <h2 className="font-serif text-xl">{title}</h2>
        <span className="shrink-0 text-lg font-medium">
          {value}
          {suffix}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <input
        type="range"
        min={minimum}
        max={maximum}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#1B3468]"
      />
    </section>
  );
}
