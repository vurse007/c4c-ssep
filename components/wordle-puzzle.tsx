"use client";

import { useEffect, useState } from "react";
import {
  WordleGame,
  type WordleResult,
} from "@/components/wordle-game";

type WordlePuzzleProps = {
  onComplete?: (result: WordleResult) => void | Promise<void>;
  onStartAnother?: () => void;
  startAnotherLabel?: string;
  startAnotherDisabled?: boolean;
};

function WordleSkeleton() {
  return (
    <div className="flex flex-col items-center gap-8 opacity-40 pointer-events-none">
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, column) => (
              <div
                key={column}
                className="w-14 h-14 border-2 border-[#d3d6da]"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WordlePuzzle(props: WordlePuzzleProps) {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/wordle-word", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load a Wordle word");
        return response.json();
      })
      .then((data) => setTarget(data.word))
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setTarget("CRANE");
        }
      });

    return () => controller.abort();
  }, []);

  if (!target) return <WordleSkeleton />;

  return <WordleGame key={target} target={target} {...props} />;
}
