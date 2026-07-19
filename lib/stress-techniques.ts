export const STRESS_TECHNIQUES = [
  {
    key: "box_breathing",
    label: "Box Breathing",
    description:
      "Breathe in, hold, breathe out, and hold again for equal counts to steady your breathing and attention.",
  },
  {
    key: "54321_grounding",
    label: "5-4-3-2-1 Grounding",
    description:
      "Name five things you see, four you feel, three you hear, two you smell, and one you taste to reconnect with the present.",
  },
  {
    key: "emotional_resolution",
    label: "Emotional Resolution",
    description:
      "Notice the physical sensations connected to an emotion without analyzing them until their intensity begins to ease.",
  },
  {
    key: "single_sense_anchoring",
    label: "Single-sense Anchoring",
    description:
      "Focus closely on one sensory experience, such as a sound or physical sensation, to anchor attention in the present.",
  },
] as const;

export type StressTechniqueKey =
  (typeof STRESS_TECHNIQUES)[number]["key"];

export function isStressTechnique(
  value: unknown,
): value is StressTechniqueKey {
  return STRESS_TECHNIQUES.some((technique) => technique.key === value);
}
