import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { WordlePuzzle } from "@/components/wordle-puzzle";

export default function PracticeWordlePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <Link
          href="/protected/try-puzzles"
          className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft size={14} />
          Back to Try Puzzles
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Wordle</h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Guess the 5-letter word in 6 tries. Green = correct position,
          yellow = wrong position, grey = not in word. Practice attempts are
          not saved.
        </p>
      </div>

      <WordlePuzzle />
    </div>
  );
}
