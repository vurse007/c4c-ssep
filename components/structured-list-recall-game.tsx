"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { motion } from "motion/react";

const PRESENTATION_MS = 1500;
const ITEMS_TOTAL = 21;
const LEVELS = [
  { level: 1 as const, perCategory: 3 },
  { level: 2 as const, perCategory: 4 },
];

export type ListCategory = "fruits" | "clothing" | "names";

export type ListItem = {
  word: string;
  category: ListCategory;
};

export type CategoryResponses = Record<ListCategory, string[]>;

export type StructuredListLevelDetail = {
  level: 1 | 2;
  items_total: number;
  sequence: ListItem[];
  responses: CategoryResponses;
  items_correct: number;
};

export type StructuredListRecallResult = {
  score: number;
  levels_total: number;
  items_total: number;
  items_correct: number;
  level_details: StructuredListLevelDetail[];
  duration_seconds: number;
};

type GameState = "ready" | "presenting" | "recall" | "complete";

type StructuredListRecallGameProps = {
  onComplete?: (result: StructuredListRecallResult) => void | Promise<void>;
  onStartAnother?: () => void;
  startAnotherLabel?: string;
  startAnotherDisabled?: boolean;
};

const CATEGORY_LABELS: Record<ListCategory, string> = {
  fruits: "Fruits",
  clothing: "Clothing",
  names: "Names",
};

const CATEGORIES: ListCategory[] = ["fruits", "clothing", "names"];

const WORD_POOLS: Record<ListCategory, string[]> = {
  fruits: [
    "Apple",
    "Banana",
    "Cherry",
    "Grape",
    "Mango",
    "Orange",
    "Peach",
    "Pear",
    "Plum",
    "Kiwi",
    "Lemon",
    "Berry",
  ],
  clothing: [
    "Shirt",
    "Pants",
    "Jacket",
    "Socks",
    "Hat",
    "Scarf",
    "Gloves",
    "Dress",
    "Coat",
    "Belt",
    "Boots",
    "Sweater",
  ],
  names: [
    "James",
    "Maria",
    "David",
    "Sarah",
    "Michael",
    "Emily",
    "Daniel",
    "Laura",
    "Kevin",
    "Anna",
    "Robert",
    "Grace",
  ],
};

const EMPTY_RESPONSES: CategoryResponses = {
  fruits: [],
  clothing: [],
  names: [],
};

export function normalizeListWord(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function countCorrectPlacements(
  sequence: ListItem[],
  responses: CategoryResponses,
): number {
  const remaining = new Map<string, ListCategory>();
  for (const item of sequence) {
    remaining.set(normalizeListWord(item.word), item.category);
  }

  let correct = 0;
  for (const category of CATEGORIES) {
    const seen = new Set<string>();
    for (const raw of responses[category]) {
      const key = normalizeListWord(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (remaining.get(key) === category) {
        correct += 1;
        remaining.delete(key);
      }
    }
  }
  return correct;
}

export function computeStructuredListRecallScore(itemsCorrect: number): number {
  return Math.round(Math.min(100, (itemsCorrect / ITEMS_TOTAL) * 100));
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function sampleWords(category: ListCategory, count: number): string[] {
  return shuffle(WORD_POOLS[category]).slice(0, count);
}

function buildLevelSequence(perCategory: number): ListItem[] {
  const items: ListItem[] = [];
  for (const category of CATEGORIES) {
    for (const word of sampleWords(category, perCategory)) {
      items.push({ word, category });
    }
  }
  return shuffle(items);
}

export function StructuredListRecallGame({
  onComplete,
  onStartAnother,
  startAnotherLabel = "Start Another Challenge",
  startAnotherDisabled = false,
}: StructuredListRecallGameProps) {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [levelIndex, setLevelIndex] = useState(0);
  const [sequence, setSequence] = useState<ListItem[]>([]);
  const [displayWord, setDisplayWord] = useState<string | null>(null);
  const [presentationStep, setPresentationStep] = useState(0);
  const [responses, setResponses] =
    useState<CategoryResponses>(EMPTY_RESPONSES);
  const [drafts, setDrafts] = useState<Record<ListCategory, string>>({
    fruits: "",
    clothing: "",
    names: "",
  });
  const [levelDetails, setLevelDetails] = useState<
    StructuredListLevelDetail[]
  >([]);
  const [finalResult, setFinalResult] =
    useState<StructuredListRecallResult | null>(null);

  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const presentationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    return () => {
      if (presentationTimerRef.current !== null) {
        window.clearTimeout(presentationTimerRef.current);
      }
    };
  }, []);

  const clearPresentationTimer = () => {
    if (presentationTimerRef.current !== null) {
      window.clearTimeout(presentationTimerRef.current);
      presentationTimerRef.current = null;
    }
  };

  const finishAttempt = useCallback((details: StructuredListLevelDetail[]) => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const itemsCorrect = details.reduce(
      (sum, detail) => sum + detail.items_correct,
      0,
    );
    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - startedAtRef.current) / 1000),
    );
    const result: StructuredListRecallResult = {
      score: computeStructuredListRecallScore(itemsCorrect),
      levels_total: LEVELS.length,
      items_total: ITEMS_TOTAL,
      items_correct: itemsCorrect,
      level_details: details,
      duration_seconds: durationSeconds,
    };

    setFinalResult(result);
    setGameState("complete");
    void onCompleteRef.current?.(result);
  }, []);

  const beginPresentation = useCallback((nextLevelIndex: number) => {
    clearPresentationTimer();
    const config = LEVELS[nextLevelIndex];
    const nextSequence = buildLevelSequence(config.perCategory);
    setLevelIndex(nextLevelIndex);
    setSequence(nextSequence);
    setResponses({ fruits: [], clothing: [], names: [] });
    setDrafts({ fruits: "", clothing: "", names: "" });
    setDisplayWord(null);
    setPresentationStep(0);
    setGameState("presenting");

    let wordIndex = 0;
    const showNextWord = () => {
      if (wordIndex >= nextSequence.length) {
        setDisplayWord(null);
        setGameState("recall");
        return;
      }

      setPresentationStep(wordIndex);
      setDisplayWord(nextSequence[wordIndex].word);
      wordIndex += 1;
      presentationTimerRef.current = window.setTimeout(
        showNextWord,
        PRESENTATION_MS,
      );
    };

    presentationTimerRef.current = window.setTimeout(showNextWord, 250);
  }, []);

  const startGame = useCallback(() => {
    finishedRef.current = false;
    startedAtRef.current = Date.now();
    setLevelDetails([]);
    setFinalResult(null);
    beginPresentation(0);
  }, [beginPresentation]);

  const resetPractice = useCallback(() => {
    clearPresentationTimer();
    finishedRef.current = false;
    setGameState("ready");
    setLevelIndex(0);
    setSequence([]);
    setDisplayWord(null);
    setPresentationStep(0);
    setResponses(EMPTY_RESPONSES);
    setDrafts({ fruits: "", clothing: "", names: "" });
    setLevelDetails([]);
    setFinalResult(null);
  }, []);

  const addChip = (category: ListCategory, rawValue?: string) => {
    const value = (rawValue ?? drafts[category]).trim();
    if (!value) return;

    setResponses((current) => {
      const normalized = normalizeListWord(value);
      if (
        current[category].some(
          (existing) => normalizeListWord(existing) === normalized,
        )
      ) {
        return current;
      }
      return {
        ...current,
        [category]: [...current[category], value],
      };
    });
    setDrafts((current) => ({ ...current, [category]: "" }));
  };

  const removeChip = (category: ListCategory, index: number) => {
    setResponses((current) => ({
      ...current,
      [category]: current[category].filter((_, i) => i !== index),
    }));
  };

  const handleDraftKeyDown = (
    category: ListCategory,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addChip(category);
    }
  };

  const submitRecall = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (gameState !== "recall" || finishedRef.current) return;

      // Flush any in-progress drafts before scoring
      const flushed: CategoryResponses = {
        fruits: [...responses.fruits],
        clothing: [...responses.clothing],
        names: [...responses.names],
      };
      for (const category of CATEGORIES) {
        const draft = drafts[category].trim();
        if (!draft) continue;
        const normalized = normalizeListWord(draft);
        if (
          !flushed[category].some(
            (existing) => normalizeListWord(existing) === normalized,
          )
        ) {
          flushed[category].push(draft);
        }
      }

      const config = LEVELS[levelIndex];
      const detail: StructuredListLevelDetail = {
        level: config.level,
        items_total: sequence.length,
        sequence,
        responses: flushed,
        items_correct: countCorrectPlacements(sequence, flushed),
      };
      const nextDetails = [...levelDetails, detail];
      setLevelDetails(nextDetails);

      const nextLevelIndex = levelIndex + 1;
      if (nextLevelIndex >= LEVELS.length) {
        finishAttempt(nextDetails);
        return;
      }

      beginPresentation(nextLevelIndex);
    },
    [
      beginPresentation,
      drafts,
      finishAttempt,
      gameState,
      levelDetails,
      levelIndex,
      responses,
      sequence,
    ],
  );

  if (gameState === "ready") {
    return (
      <div className="min-h-[430px] border border-black/10 bg-white flex flex-col items-center justify-center px-8 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">
          Structured List Recall
        </p>
        <h2 className="mt-3 font-serif text-3xl">Memorize, then sort</h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Words from fruits, clothing, and names will appear one at a time.
          After each list, type what you remember into the matching category
          boxes.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Two levels: 9 words, then 12 words.
        </p>
        <button
          type="button"
          onClick={startGame}
          className="mt-8 bg-[#1B3468] px-8 py-3 text-sm font-medium text-white"
        >
          Start List Recall
        </button>
      </div>
    );
  }

  if (gameState === "complete" && finalResult) {
    return (
      <div className="min-h-[430px] border border-black/10 bg-white flex flex-col items-center justify-center px-8 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">
          Task complete
        </p>
        <h2 className="mt-2 font-serif text-3xl">
          Score: {finalResult.score}
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="text-2xl font-medium">
              {finalResult.items_correct}/{finalResult.items_total}
            </p>
            <p className="text-muted-foreground">Items correct</p>
          </div>
          <div>
            <p className="text-2xl font-medium">{finalResult.levels_total}</p>
            <p className="text-muted-foreground">Levels completed</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onStartAnother ?? resetPractice}
          disabled={startAnotherDisabled}
          className="mt-8 bg-[#111111] px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {onStartAnother ? startAnotherLabel : "Try Again"}
        </button>
      </div>
    );
  }

  if (gameState === "presenting") {
    const config = LEVELS[levelIndex];
    return (
      <div className="relative min-h-[430px] border border-black/10 bg-white px-8 py-7 flex flex-col items-center justify-center">
        <p className="absolute left-8 top-7 text-sm text-muted-foreground">
          Level {config.level} of {LEVELS.length} · {sequence.length} words
        </p>
        {displayWord !== null && (
          <motion.p
            key={`${levelIndex}-${presentationStep}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="font-sans text-5xl font-bold tracking-wide"
          >
            {displayWord}
          </motion.p>
        )}
      </div>
    );
  }

  const config = LEVELS[levelIndex];

  return (
    <div className="min-h-[430px] border border-black/10 bg-white px-8 py-7 flex flex-col">
      <p className="text-sm text-muted-foreground">
        Level {config.level} of {LEVELS.length} · Place each word you remember
        into the correct category
      </p>

      <form
        onSubmit={submitRecall}
        className="mt-6 flex flex-1 flex-col gap-5"
      >
        {CATEGORIES.map((category) => (
          <div key={category} className="space-y-2">
            <label className="text-sm font-semibold text-[#111111]">
              {CATEGORY_LABELS[category]}
            </label>
            <div className="min-h-[52px] border border-black/15 bg-[#fafafa] px-3 py-2 flex flex-wrap gap-2 items-center">
              {responses[category].map((word, index) => (
                <button
                  key={`${category}-${word}-${index}`}
                  type="button"
                  onClick={() => removeChip(category, index)}
                  className="inline-flex items-center gap-1.5 border border-black/15 bg-white px-2.5 py-1 text-sm"
                >
                  {word}
                  <span className="text-muted-foreground" aria-hidden>
                    ×
                  </span>
                </button>
              ))}
              <input
                type="text"
                value={drafts[category]}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [category]: event.target.value,
                  }))
                }
                onKeyDown={(event) => handleDraftKeyDown(category, event)}
                onBlur={() => addChip(category)}
                placeholder="Type a word, press Enter"
                className="min-w-[160px] flex-1 bg-transparent py-1 text-sm outline-none"
                autoComplete="off"
              />
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="mt-auto self-center bg-[#1B3468] px-8 py-3 text-sm font-medium text-white"
        >
          {levelIndex + 1 >= LEVELS.length
            ? "Finish"
            : "Continue to next level"}
        </button>
      </form>
    </div>
  );
}
