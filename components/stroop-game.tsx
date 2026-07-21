"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

const DURATION_SECONDS = 15;
const COLORS = ["red", "green", "blue", "yellow"] as const;

type StroopColor = (typeof COLORS)[number];
type GameState = "ready" | "running" | "complete";

type Stimulus = {
  word: StroopColor;
  ink: StroopColor;
};

type Metrics = {
  total: number;
  correct: number;
  responseTimeTotal: number;
  congruentTrials: number;
  congruentCorrect: number;
  incongruentTrials: number;
  incongruentCorrect: number;
};

export type StroopResult = {
  score: number;
  duration_seconds: number;
  total_responses: number;
  correct_responses: number;
  incorrect_responses: number;
  accuracy: number;
  average_response_time_ms: number;
  congruent_trials: number;
  congruent_correct: number;
  incongruent_trials: number;
  incongruent_correct: number;
};

type StroopGameProps = {
  onComplete?: (result: StroopResult) => void | Promise<void>;
  onStartAnother?: () => void;
  startAnotherLabel?: string;
  startAnotherDisabled?: boolean;
};

const INK_COLORS: Record<StroopColor, string> = {
  red: "#dc2626",
  green: "#16a34a",
  blue: "#2563eb",
  yellow: "#d4a900",
};

const INITIAL_METRICS: Metrics = {
  total: 0,
  correct: 0,
  responseTimeTotal: 0,
  congruentTrials: 0,
  congruentCorrect: 0,
  incongruentTrials: 0,
  incongruentCorrect: 0,
};

function randomColor(): StroopColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function createStimulus(): Stimulus {
  return { word: randomColor(), ink: randomColor() };
}

export function computeStroopScore(
  correctResponses: number,
  totalResponses: number,
): number {
  if (totalResponses === 0) return 0;

  const accuracy = correctResponses / totalResponses;
  // Linear scale. ~15–17 correct at ~90% accuracy ≈ 70.
  // 100 needs 24 correct in 15s with perfect accuracy.
  const throughputScore = Math.min(correctResponses / 24, 1) * 70;
  const accuracyScore = accuracy * 30;

  return Math.round(Math.min(100, throughputScore + accuracyScore));
}

function buildResult(metrics: Metrics): StroopResult {
  const accuracy =
    metrics.total === 0 ? 0 : metrics.correct / metrics.total;

  return {
    score: computeStroopScore(metrics.correct, metrics.total),
    duration_seconds: DURATION_SECONDS,
    total_responses: metrics.total,
    correct_responses: metrics.correct,
    incorrect_responses: metrics.total - metrics.correct,
    accuracy: Number(accuracy.toFixed(4)),
    average_response_time_ms:
      metrics.total === 0
        ? 0
        : Math.round(metrics.responseTimeTotal / metrics.total),
    congruent_trials: metrics.congruentTrials,
    congruent_correct: metrics.congruentCorrect,
    incongruent_trials: metrics.incongruentTrials,
    incongruent_correct: metrics.incongruentCorrect,
  };
}

export function StroopGame({
  onComplete,
  onStartAnother,
  startAnotherLabel = "Start Another Challenge",
  startAnotherDisabled = false,
}: StroopGameProps) {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [secondsRemaining, setSecondsRemaining] =
    useState(DURATION_SECONDS);
  const [stimulus, setStimulus] = useState<Stimulus>({
    word: "red",
    ink: "red",
  });
  const [stimulusStep, setStimulusStep] = useState(0);
  const [finalResult, setFinalResult] = useState<StroopResult | null>(null);

  const metricsRef = useRef<Metrics>({ ...INITIAL_METRICS });
  const deadlineRef = useRef(0);
  const stimulusStartedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const result = buildResult(metricsRef.current);
    setSecondsRemaining(0);
    setFinalResult(result);
    setGameState("complete");
    void onCompleteRef.current?.(result);
  }, []);

  useEffect(() => {
    if (gameState !== "running") return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      );
      setSecondsRemaining(remaining);
      if (remaining === 0) finishGame();
    }, 200);

    return () => window.clearInterval(timer);
  }, [finishGame, gameState]);

  const startGame = useCallback(() => {
    const nextStimulus = createStimulus();
    metricsRef.current = { ...INITIAL_METRICS };
    finishedRef.current = false;
    deadlineRef.current = Date.now() + DURATION_SECONDS * 1000;
    stimulusStartedAtRef.current = Date.now();
    setFinalResult(null);
    setSecondsRemaining(DURATION_SECONDS);
    setStimulus(nextStimulus);
    setStimulusStep(0);
    setGameState("running");
  }, []);

  const answer = useCallback(
    (selectedColor: StroopColor) => {
      if (gameState !== "running" || finishedRef.current) return;
      if (Date.now() >= deadlineRef.current) {
        finishGame();
        return;
      }

      const responseTime = Date.now() - stimulusStartedAtRef.current;
      const isCorrect = selectedColor === stimulus.ink;
      const isCongruent = stimulus.word === stimulus.ink;
      const current = metricsRef.current;

      metricsRef.current = {
        total: current.total + 1,
        correct: current.correct + (isCorrect ? 1 : 0),
        responseTimeTotal: current.responseTimeTotal + responseTime,
        congruentTrials: current.congruentTrials + (isCongruent ? 1 : 0),
        congruentCorrect:
          current.congruentCorrect + (isCongruent && isCorrect ? 1 : 0),
        incongruentTrials:
          current.incongruentTrials + (isCongruent ? 0 : 1),
        incongruentCorrect:
          current.incongruentCorrect + (!isCongruent && isCorrect ? 1 : 0),
      };

      setStimulus(createStimulus());
      setStimulusStep((step) => step + 1);
      stimulusStartedAtRef.current = Date.now();
    },
    [finishGame, gameState, stimulus],
  );

  useEffect(() => {
    const keyMap: Record<string, StroopColor> = {
      r: "red",
      g: "green",
      b: "blue",
      y: "yellow",
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const color = keyMap[event.key.toLowerCase()];
      if (color) answer(color);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answer]);

  if (gameState === "ready") {
    return (
      <div className="min-h-[430px] border border-black/10 bg-white flex flex-col items-center justify-center px-8 text-center">
        <h2 className="font-serif text-2xl">Ready to begin?</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Select the ink color of each word, not the color named by the word.
          You will have 15 seconds to answer as many as you can.
        </p>
        <button
          type="button"
          onClick={startGame}
          className="mt-7 bg-[#1B3468] px-8 py-3 text-sm font-medium text-white"
        >
          Start 15-Second Task
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
        <div className="mt-6 grid grid-cols-3 gap-8 text-sm">
          <div>
            <p className="text-2xl font-medium">
              {finalResult.correct_responses}
            </p>
            <p className="text-muted-foreground">Correct</p>
          </div>
          <div>
            <p className="text-2xl font-medium">
              {finalResult.total_responses}
            </p>
            <p className="text-muted-foreground">Responses</p>
          </div>
          <div>
            <p className="text-2xl font-medium">
              {Math.round(finalResult.accuracy * 100)}%
            </p>
            <p className="text-muted-foreground">Accuracy</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onStartAnother ?? startGame}
          disabled={startAnotherDisabled}
          className="mt-8 bg-[#111111] px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {onStartAnother ? startAnotherLabel : "Try Again"}
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[430px] border border-black/10 bg-white px-8 py-7 flex flex-col">
      <p className="text-sm text-muted-foreground">
        You may press R, G, B, or Y on your keyboard to input your answer.
      </p>
      <p
        className={`absolute right-8 top-7 text-sm font-semibold ${
          secondsRemaining <= 5 ? "text-red-600" : "text-foreground"
        }`}
      >
        {secondsRemaining}s remaining
      </p>

      <div className="flex flex-1 items-center justify-center">
        <motion.p
          key={stimulusStep}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="font-sans text-6xl font-bold uppercase tracking-wide"
          style={{ color: INK_COLORS[stimulus.ink] }}
        >
          {stimulus.word}
        </motion.p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => answer(color)}
            className="border border-black/20 bg-white py-3 text-sm font-medium capitalize text-foreground transition-colors hover:bg-black/5"
          >
            {color}
          </button>
        ))}
      </div>
    </div>
  );
}
