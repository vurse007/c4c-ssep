"use client";

import Link from "next/link";
import {
  BrainCircuit,
  Calculator,
  Eye,
  Grid2x2,
  List,
  type LucideIcon,
} from "lucide-react";
import { CHALLENGES, type ChallengeKey } from "@/lib/challenges";

const ICONS: Record<ChallengeKey, LucideIcon> = {
  "digit-span": BrainCircuit,
  stroop: Eye,
  wordle: Grid2x2,
  "serial-subtraction": Calculator,
  "structured-list-recall": List,
};

type ChallengeGridProps =
  | {
      basePath: string;
      onSelect?: never;
    }
  | {
      basePath?: never;
      onSelect: (challenge: ChallengeKey) => void;
    };

function TileContent({
  challenge,
}: {
  challenge: (typeof CHALLENGES)[number];
}) {
  const Icon = ICONS[challenge.key];

  return (
    <>
      <div className="bg-[#1B3468] px-6 py-5 flex items-center gap-3">
        <Icon size={22} className="text-white/80" />
        <span className="text-white font-serif text-[17px] leading-tight">
          {challenge.label}
        </span>
      </div>
      <div className="px-6 py-5">
        <p className="text-[#6B7280] text-[13px] leading-[1.6]">
          {challenge.description}
        </p>
      </div>
    </>
  );
}

const tileClass =
  "group text-left bg-white border border-black/6 hover:border-black/12 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300";

export function ChallengeGrid(props: ChallengeGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {CHALLENGES.map((challenge) =>
        props.onSelect ? (
          <button
            key={challenge.key}
            type="button"
            onClick={() => props.onSelect(challenge.key)}
            className={tileClass}
          >
            <TileContent challenge={challenge} />
          </button>
        ) : (
          <Link
            key={challenge.key}
            href={`${props.basePath}/${challenge.key}`}
            className={tileClass}
          >
            <TileContent challenge={challenge} />
          </Link>
        ),
      )}
    </div>
  );
}
