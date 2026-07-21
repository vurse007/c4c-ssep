export const STRESS_TECHNIQUES = [
  {
    key: "54321_grounding",
    label: "5-4-3-2-1 Sense Grounding",
    description:
      "Identify 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, and 1 you can taste to redirect attention away from stress.",
  },
  {
    key: "box_breathing",
    label: "Box Breathing",
    description:
      "Complete 4 rounds of box breathing: inhale 4 seconds, hold 4 seconds, exhale 4 seconds, and hold 4 seconds to slow your heart rate and regain focus.",
  },
  {
    key: "aromatherapy",
    label: "Aromatherapy",
    description:
      "Place 3–5 drops of essential oil on gauze and take 4 slow breaths while focusing on the scent to promote relaxation.",
  },
  {
    key: "gratitude_exercise",
    label: "Gratitude Exercise",
    description:
      "Write down three things you are grateful for today and briefly reflect on why each is meaningful to shift your mindset toward positive experiences.",
  },
  {
    key: "cold_therapy",
    label: "Cold Therapy",
    description:
      "Expose your face to cold water for 30–60 seconds, or take a cold shower, while focusing on slow, controlled breathing to help your body recover from stress.",
  },
] as const;

export type StressTechniqueKey =
  (typeof STRESS_TECHNIQUES)[number]["key"];

export function isStressTechnique(
  value: unknown,
): value is StressTechniqueKey {
  return STRESS_TECHNIQUES.some((technique) => technique.key === value);
}
