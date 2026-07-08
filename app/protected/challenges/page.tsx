import Link from "next/link";
import {
  BrainCircuit,
  Eye,
  Mic,
  Grid2x2,
  Calculator,
  List,
} from "lucide-react";

const challenges = [
  {
    title: "Digit Span",
    description: "Test and expand your working memory by recalling sequences of digits in order.",
    icon: BrainCircuit,
    href: "/protected/challenges/digit-span",
  },
  {
    title: "Stroop Task",
    description: "Identify the ink color of color words while ignoring the word's meaning.",
    icon: Eye,
    href: "/protected/challenges/stroop",
  },
  {
    title: "Trier Style Speech Task",
    description: "Deliver an impromptu speech under evaluative pressure to simulate real-world stress.",
    icon: Mic,
    href: "/protected/challenges/trier-speech",
  },
  {
    title: "Wordle",
    description: "Guess the hidden word in six tries using process-of-elimination under time pressure.",
    icon: Grid2x2,
    href: "/protected/challenges/wordle",
  },
  {
    title: "Serial Subtraction",
    description: "Count backwards from a starting number by a fixed interval as quickly as possible.",
    icon: Calculator,
    href: "/protected/challenges/serial-subtraction",
  },
  {
    title: "Structured List Recall",
    description: "Memorize and reproduce a structured list of items after a brief delay.",
    icon: List,
    href: "/protected/challenges/structured-list-recall",
  },
];

export default function ChallengesPage() {
  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
        <p className="text-muted-foreground mt-1">
          Six evidence-based tasks designed to simulate and measure stress responses.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((challenge) => {
          const Icon = challenge.icon;
          return (
            <Link
              key={challenge.title}
              href={challenge.href}
              className="group bg-white border border-black/6 hover:border-black/12 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300"
            >
              {/* Colored header band */}
              <div className="bg-[#1B3468] px-6 py-5 flex items-center gap-3">
                <Icon size={22} className="text-white/80" />
                <span className="text-white font-serif text-[17px] leading-tight">
                  {challenge.title}
                </span>
              </div>

              {/* Description */}
              <div className="px-6 py-5">
                <p className="text-[#6B7280] text-[13px] leading-[1.6]">
                  {challenge.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
