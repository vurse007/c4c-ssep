"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

const DURATION_SECONDS = 30;

type GameState = "ready" | "running" | "complete";

type Task = {
  startingNumber: number;
  decrement: number;
};

type Metrics = {
  total: number;
  correct: number;
  responseTimeTotal: number;
  finalSubmittedValue: number | null;
};

export type SerialSubtractionResult = {
  score: number;
  starting_number: number;
  subtraction_value: number;
  duration_seconds: number;
  total_responses: number;
  correct_responses: number;
  distinct_errors: number;
  accuracy: number;
  average_response_time_ms: number;
  final_submitted_value: number | null;
};

type SerialSubtractionGameProps = {
  onComplete?: (
    result: SerialSubtractionResult,
  ) => void | Promise<void>;
  onStartAnother?: () => void;
  startAnotherLabel?: string;
  startAnotherDisabled?: boolean;
};

const INITIAL_METRICS: Metrics = {
  total: 0,
  correct: 0,
  responseTimeTotal: 0,
  finalSubmittedValue: null,
};

function createTask(): Task {
  const allowedDecrements = [4, 6, 7, 8, 9];
  const decrement =
    allowedDecrements[Math.floor(Math.random() * allowedDecrements.length)];
  const startingNumber = Math.floor(Math.random() * 700) + 300;

  return { startingNumber, decrement };
}

export function computeSerialSubtractionScore(
  correctResponses: number,
  totalResponses: number,
): number {
  if (totalResponses === 0) return 0;

  const accuracy = correctResponses / totalResponses;
  const throughputScore = Math.min(correctResponses / 13, 1) * 70;
  const accuracyScore = accuracy * 30;

  return Math.round(Math.min(100, throughputScore + accuracyScore));
}

function buildResult(task: Task, metrics: Metrics): SerialSubtractionResult {
  const accuracy =
    metrics.total === 0 ? 0 : metrics.correct / metrics.total;

  return {
    score: computeSerialSubtractionScore(metrics.correct, metrics.total),
    starting_number: task.startingNumber,
    subtraction_value: task.decrement,
    duration_seconds: DURATION_SECONDS,
    total_responses: metrics.total,
    correct_responses: metrics.correct,
    distinct_errors: metrics.total - metrics.correct,
    accuracy: Number(accuracy.toFixed(4)),
    average_response_time_ms:
      metrics.total === 0
        ? 0
        : Math.round(metrics.responseTimeTotal / metrics.total),
    final_submitted_value: metrics.finalSubmittedValue,
  };
}

export function SerialSubtractionGame({
  onComplete,
  onStartAnother,
  startAnotherLabel = "Start Another Challenge",
  startAnotherDisabled = false,
}: SerialSubtractionGameProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [secondsRemaining, setSecondsRemaining] =
    useState(DURATION_SECONDS);
  const [input, setInput] = useState("");
  const [lastResponse, setLastResponse] = useState<number | null>(null);
  const [finalResult, setFinalResult] =
    useState<SerialSubtractionResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const metricsRef = useRef<Metrics>({ ...INITIAL_METRICS });
  const previousValueRef = useRef(0);
  const deadlineRef = useRef(0);
  const responseStartedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    setTask(createTask());
  }, []);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finishGame = useCallback(() => {
    if (finishedRef.current || !task) return;
    finishedRef.current = true;

    const result = buildResult(task, metricsRef.current);
    setSecondsRemaining(0);
    setFinalResult(result);
    setGameState("complete");
    setInput("");
    void onCompleteRef.current?.(result);
  }, [task]);

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
    if (!task) return;

    metricsRef.current = { ...INITIAL_METRICS };
    previousValueRef.current = task.startingNumber;
    finishedRef.current = false;
    deadlineRef.current = Date.now() + DURATION_SECONDS * 1000;
    responseStartedAtRef.current = Date.now();
    setInput("");
    setLastResponse(null);
    setFinalResult(null);
    setSecondsRemaining(DURATION_SECONDS);
    setGameState("running");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [task]);

  const resetPractice = useCallback(() => {
    setTask(createTask());
    setGameState("ready");
    setSecondsRemaining(DURATION_SECONDS);
    setInput("");
    setLastResponse(null);
    setFinalResult(null);
    metricsRef.current = { ...INITIAL_METRICS };
    finishedRef.current = false;
  }, []);

  const submitAnswer = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (
        gameState !== "running" ||
        finishedRef.current ||
        input.length === 0
      ) {
        return;
      }
      if (Date.now() >= deadlineRef.current) {
        finishGame();
        return;
      }

      const submittedValue = Number(input);
      const expectedValue =
        previousValueRef.current - (task?.decrement ?? 0);
      const isCorrect = submittedValue === expectedValue;
      const current = metricsRef.current;

      metricsRef.current = {
        total: current.total + 1,
        correct: current.correct + (isCorrect ? 1 : 0),
        responseTimeTotal:
          current.responseTimeTotal +
          (Date.now() - responseStartedAtRef.current),
        finalSubmittedValue: submittedValue,
      };

      // Rebase after every response so one wrong subtraction does not
      // create cascading errors on subsequent correct arithmetic.
      previousValueRef.current = submittedValue;
      responseStartedAtRef.current = Date.now();
      setLastResponse(submittedValue);
      setInput("");
      window.setTimeout(() => inputRef.current?.focus(), 0);
    },
    [finishGame, gameState, input, task],
  );

  if (!task) {
    return (
      <div className="min-h-[430px] border border-black/10 bg-white animate-pulse" />
    );
  }

  if (gameState === "ready") {
    return (
      <div className="min-h-[430px] border border-black/10 bg-white flex flex-col items-center justify-center px-8 text-center">
        <p className="text-sm text-muted-foreground">
          Begin at
        </p>
        <p className="mt-1 font-serif text-5xl">{task.startingNumber}</p>
        <p className="mt-5 text-lg">
          Repeatedly subtract{" "}
          <span className="font-semibold">{task.decrement}</span>
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Enter each new number in sequence. You will have 30 seconds to
          complete as many subtractions as possible.
        </p>
        <button
          type="button"
          onClick={startGame}
          className="mt-7 bg-[#1B3468] px-8 py-3 text-sm font-medium text-white"
        >
          Start 30-Second Task
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
              {finalResult.distinct_errors}
            </p>
            <p className="text-muted-foreground">Errors</p>
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

  return (
    <div className="relative min-h-[430px] border border-black/10 bg-white px-8 py-7 flex flex-col">
      <p className="text-sm text-muted-foreground">
        Subtract {task.decrement} each time and submit every answer.
      </p>
      <p
        className={`absolute right-8 top-7 text-sm font-semibold ${
          secondsRemaining <= 10 ? "text-red-600" : "text-foreground"
        }`}
      >
        {secondsRemaining}s remaining
      </p>

      <form
        onSubmit={submitAnswer}
        className="flex flex-1 flex-col items-center justify-center"
      >
        <p className="mb-6 text-sm text-muted-foreground">
          Your last response:{" "}
          <span className="font-semibold text-foreground">
            {lastResponse ?? "—"}
          </span>
        </p>
        <label
          htmlFor="serial-answer"
          className="mb-3 text-sm text-muted-foreground"
        >
          Enter the next number
        </label>
        <input
          ref={inputRef}
          id="serial-answer"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoComplete="off"
          value={input}
          onChange={(event) =>
            setInput(event.target.value.replace(/\D/g, ""))
          }
          className="w-64 border-2 border-black/20 bg-white px-4 py-4 text-center text-3xl font-medium outline-none focus:border-[#1B3468]"
        />
        <button
          type="submit"
          disabled={!input}
          className="mt-4 bg-[#1B3468] px-8 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
