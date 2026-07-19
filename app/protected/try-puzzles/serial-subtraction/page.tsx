import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SerialSubtractionGame } from "@/components/serial-subtraction-game";

export default function PracticeSerialSubtractionPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <Link
          href="/protected/try-puzzles"
          className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft size={14} />
          Back to Try Puzzles
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Serial Subtraction
        </h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Subtract the same value repeatedly for 30 seconds. Practice
          attempts are not saved.
        </p>
      </div>

      <SerialSubtractionGame />
    </div>
  );
}
