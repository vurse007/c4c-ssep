"use client";

import type { CopingExerciseResult } from "@/lib/coping-exercises";
import type { StressTechniqueKey } from "@/lib/stress-techniques";
import { AromatherapyGuide } from "./aromatherapy-guide";
import { BoxBreathingGuide } from "./box-breathing-guide";
import { ColdTherapyGuide } from "./cold-therapy-guide";
import { EmResGuide } from "./emres-guide";
import { GratitudeGuide } from "./gratitude-guide";
import { SenseGroundingGuide } from "./sense-grounding-guide";

type Props = {
  technique: StressTechniqueKey;
  onComplete: (result: CopingExerciseResult) => void;
  onBack: () => void;
};

export function CopingExercise({ technique, onComplete, onBack }: Props) {
  if (technique === "emres") {
    return <EmResGuide onComplete={onComplete} onBack={onBack} />;
  }
  if (technique === "54321_grounding") {
    return <SenseGroundingGuide onComplete={onComplete} onBack={onBack} />;
  }
  if (technique === "box_breathing") {
    return <BoxBreathingGuide onComplete={onComplete} onBack={onBack} />;
  }
  if (technique === "aromatherapy") {
    return <AromatherapyGuide onComplete={onComplete} onBack={onBack} />;
  }
  if (technique === "gratitude_exercise") {
    return <GratitudeGuide onComplete={onComplete} onBack={onBack} />;
  }
  return <ColdTherapyGuide onComplete={onComplete} onBack={onBack} />;
}
