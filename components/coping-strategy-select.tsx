"use client";

import { Check } from "lucide-react";
import {
  STRESS_TECHNIQUES,
  type StressTechniqueKey,
} from "@/lib/stress-techniques";

const choiceClass =
  "text-left border px-6 py-5 text-sm transition-colors";

type Props = {
  selected: StressTechniqueKey | null;
  onSelect: (technique: StressTechniqueKey) => void;
  onContinue: () => void;
};

export function CopingStrategySelect({
  selected,
  onSelect,
  onContinue,
}: Props) {
  return (
    <div className="max-w-3xl">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">
          Coping strategy
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Choose a coping strategy
        </h1>
        <p className="text-muted-foreground mt-2">
          You&apos;ll be guided through the exercise next, then complete a
          short check-in before the puzzles.
        </p>
      </div>

      <div className="mt-10 grid gap-3">
        {STRESS_TECHNIQUES.map((option) => {
          const isSelected = selected === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key)}
              className={`${choiceClass} ${
                isSelected
                  ? "border-[#1B3468] bg-[#1B3468]/5"
                  : "border-black/10 bg-white hover:border-black/25"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-[17px]">{option.label}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    {option.description}
                  </p>
                </div>
                {isSelected && <Check size={18} className="text-primary" />}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={onContinue}
        className="mt-10 bg-[#1B3468] px-7 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
      >
        Begin exercise
      </button>
    </div>
  );
}
