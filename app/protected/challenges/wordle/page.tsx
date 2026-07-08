"use client";

import { WordleGame } from "@/components/wordle-game";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

export default function WordlePage() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/wordle-word")
      .then((r) => r.json())
      .then((d) => setTarget(d.word))
      .catch(() => setTarget("CRANE")); // fallback if API fails
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Back + Header */}
      <div>
        <Link
          href="/protected/challenges"
          className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft size={14} />
          Back to Challenges
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Wordle</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Guess the 5-letter word in 6 tries. Green = correct position, yellow = wrong position, grey = not in word.
        </p>
      </div>

      {/* Wait for word before mounting — key forces full remount on each new word */}
      {target ? (
        <WordleGame key={target} target={target} />
      ) : (
        <div className="flex flex-col items-center gap-8 opacity-40 pointer-events-none">
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, r) => (
              <div key={r} className="flex gap-1.5">
                {Array.from({ length: 5 }).map((_, c) => (
                  <div key={c} className="w-14 h-14 border-2 border-[#d3d6da]" />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
