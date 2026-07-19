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

const ROUND_LENGTHS = [4, 5, 6, 7, 8] as const;
const PRESENTATION_MS = 1270;

export type DigitSpanDirection = "forward" | "backward";

export type DigitSpanRoundDetail = {
  length: number;
  sequence: number[];
  response: number[];
  correct: boolean;
};

export type DigitSpanResult = {
  score: number;
  direction: DigitSpanDirection;
  rounds_total: number;
  rounds_correct: number;
  longest_correct_span: number;
  round_details: DigitSpanRoundDetail[];
  duration_seconds: number;
};

type GameState = "ready" | "presenting" | "recall" | "complete";

type DigitSpanGameProps = {
  onComplete?: (result: DigitSpanResult) => void | Promise<void>;
  onStartAnother?: () => void;
  startAnotherLabel?: string;
  startAnotherDisabled?: boolean;
};

export function computeDigitSpanScore(
  correctRounds: number,
  longestCorrectSpan: number,
): number {
  if (correctRounds === 0) return 0;
  const spanScore = ((Math.max(longestCorrectSpan, 3) - 3) / 5) * 50;
  const accuracyScore = (correctRounds / 5) * 50;
  return Math.round(Math.min(100, spanScore + accuracyScore));
}

function randomDirection(): DigitSpanDirection {
  return Math.random() < 0.5 ? "forward" : "backward";
}

function createSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

function expectedResponse(
  sequence: number[],
  direction: DigitSpanDirection,
): number[] {
  return direction === "forward" ? sequence : [...sequence].reverse();
}

export function DigitSpanGame({
  onComplete,
  onStartAnother,
  startAnotherLabel = "Start Another Challenge",
  startAnotherDisabled = false,
}: DigitSpanGameProps) {
  const [direction, setDirection] = useState<DigitSpanDirection>("forward");
  const [gameState, setGameState] = useState<GameState>("ready");
  const [roundIndex, setRoundIndex] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [displayDigit, setDisplayDigit] = useState<number | null>(null);
  const [presentationStep, setPresentationStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [roundDetails, setRoundDetails] = useState<DigitSpanRoundDetail[]>([]);
  const [finalResult, setFinalResult] = useState<DigitSpanResult | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const presentationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setDirection(randomDirection());
  }, []);

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

  const finishAttempt = useCallback(
    (details: DigitSpanRoundDetail[]) => {
      if (finishedRef.current) return;
      finishedRef.current = true;

      const roundsCorrect = details.filter((detail) => detail.correct).length;
      const longestCorrectSpan = details.reduce(
        (longest, detail) =>
          detail.correct ? Math.max(longest, detail.length) : longest,
        0,
      );
      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000),
      );
      const result: DigitSpanResult = {
        score: computeDigitSpanScore(roundsCorrect, longestCorrectSpan),
        direction,
        rounds_total: ROUND_LENGTHS.length,
        rounds_correct: roundsCorrect,
        longest_correct_span: longestCorrectSpan,
        round_details: details,
        duration_seconds: durationSeconds,
      };

      setFinalResult(result);
      setGameState("complete");
      void onCompleteRef.current?.(result);
    },
    [direction],
  );

  const beginPresentation = useCallback((nextRoundIndex: number) => {
    clearPresentationTimer();
    const length = ROUND_LENGTHS[nextRoundIndex];
    const nextSequence = createSequence(length);
    setRoundIndex(nextRoundIndex);
    setSequence(nextSequence);
    setAnswers(Array.from({ length }, () => ""));
    setDisplayDigit(null);
    setPresentationStep(0);
    setGameState("presenting");

    let digitIndex = 0;
    const showNextDigit = () => {
      if (digitIndex >= nextSequence.length) {
        setDisplayDigit(null);
        setGameState("recall");
        window.setTimeout(() => inputRefs.current[0]?.focus(), 0);
        return;
      }

      setPresentationStep(digitIndex);
      setDisplayDigit(nextSequence[digitIndex]);
      digitIndex += 1;
      presentationTimerRef.current = window.setTimeout(
        showNextDigit,
        PRESENTATION_MS,
      );
    };

    presentationTimerRef.current = window.setTimeout(showNextDigit, 250);
  }, []);

  const startGame = useCallback(() => {
    finishedRef.current = false;
    startedAtRef.current = Date.now();
    setRoundDetails([]);
    setFinalResult(null);
    beginPresentation(0);
  }, [beginPresentation]);

  const resetPractice = useCallback(() => {
    clearPresentationTimer();
    finishedRef.current = false;
    setDirection(randomDirection());
    setGameState("ready");
    setRoundIndex(0);
    setSequence([]);
    setDisplayDigit(null);
    setPresentationStep(0);
    setAnswers([]);
    setRoundDetails([]);
    setFinalResult(null);
  }, []);

  const submitRecall = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (gameState !== "recall" || finishedRef.current) return;
      if (answers.some((value) => value === "")) return;

      const response = answers.map((value) => Number(value));
      const expected = expectedResponse(sequence, direction);
      const correct = response.every(
        (digit, index) => digit === expected[index],
      );
      const detail: DigitSpanRoundDetail = {
        length: sequence.length,
        sequence,
        response,
        correct,
      };
      const nextDetails = [...roundDetails, detail];
      setRoundDetails(nextDetails);

      const nextRoundIndex = roundIndex + 1;
      if (nextRoundIndex >= ROUND_LENGTHS.length) {
        finishAttempt(nextDetails);
        return;
      }

      beginPresentation(nextRoundIndex);
    },
    [
      answers,
      beginPresentation,
      direction,
      finishAttempt,
      gameState,
      roundDetails,
      roundIndex,
      sequence,
    ],
  );

  const handleDigitChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    setAnswers((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < answers.length - 1) {
      window.setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    }
  };

  const handleDigitKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && answers[index] === "" && index > 0) {
      event.preventDefault();
      window.setTimeout(() => inputRefs.current[index - 1]?.focus(), 0);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      submitRecall();
    }
  };

  if (gameState === "ready") {
    return (
      <div className="min-h-[430px] border border-black/10 bg-white flex flex-col items-center justify-center px-8 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">
          Digit Span
        </p>
        <h2 className="mt-3 font-serif text-3xl">
          Recall {direction === "forward" ? "forwards" : "backwards"}
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          {direction === "forward"
            ? "Watch each digit, then enter the sequence in the same order it appeared."
            : "Watch each digit, then enter the sequence in reverse order from last to first."}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          You will complete 5 rounds, starting at 4 digits and increasing to 8.
        </p>
        <button
          type="button"
          onClick={startGame}
          className="mt-8 bg-[#1B3468] px-8 py-3 text-sm font-medium text-white"
        >
          Start Digit Span
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
              {finalResult.rounds_correct}/{finalResult.rounds_total}
            </p>
            <p className="text-muted-foreground">Rounds correct</p>
          </div>
          <div>
            <p className="text-2xl font-medium">
              {finalResult.longest_correct_span || "—"}
            </p>
            <p className="text-muted-foreground">Longest span</p>
          </div>
          <div>
            <p className="text-2xl font-medium capitalize">
              {finalResult.direction}
            </p>
            <p className="text-muted-foreground">Direction</p>
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
    return (
      <div className="relative min-h-[430px] border border-black/10 bg-white px-8 py-7 flex flex-col items-center justify-center">
        <p className="absolute left-8 top-7 text-sm text-muted-foreground">
          Round {roundIndex + 1} of {ROUND_LENGTHS.length} ·{" "}
          {ROUND_LENGTHS[roundIndex]} digits ·{" "}
          <span className="capitalize">{direction}</span>
        </p>
        {displayDigit !== null && (
          <motion.p
            key={`${roundIndex}-${presentationStep}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="font-sans text-7xl font-bold tracking-wide tabular-nums"
          >
            {displayDigit}
          </motion.p>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-[430px] border border-black/10 bg-white px-8 py-7 flex flex-col">
      <p className="text-sm text-muted-foreground">
        Round {roundIndex + 1} of {ROUND_LENGTHS.length} · Enter the digits{" "}
        {direction === "forward" ? "in order" : "in reverse order"}
      </p>

      <form
        onSubmit={submitRecall}
        className="flex flex-1 flex-col items-center justify-center gap-8"
      >
        <div className="flex flex-wrap justify-center gap-2">
          {answers.map((value, index) => (
            <input
              key={`${roundIndex}-${index}`}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete="off"
              value={value}
              onChange={(event) =>
                handleDigitChange(index, event.target.value)
              }
              onKeyDown={(event) => handleDigitKeyDown(index, event)}
              className="h-14 w-12 border-2 border-black/20 bg-white text-center text-2xl font-medium outline-none focus:border-[#1B3468]"
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={answers.some((value) => value === "")}
          className="bg-[#1B3468] px-8 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
