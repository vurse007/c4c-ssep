"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const KEYBOARD_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","⌫"],
];

type TileState = "correct" | "present" | "absent" | "empty";

export type WordleResult = {
  score: number;
  completion_time_seconds: number;
  guesses: number;
  won: boolean;
  target_word: string;
};

type WordleGameProps = {
  target: string;
  onComplete?: (result: WordleResult) => void | Promise<void>;
  onStartAnother?: () => void;
  startAnotherLabel?: string;
  startAnotherDisabled?: boolean;
};

function evaluateGuess(guess: string, target: string): TileState[] {
  const result: TileState[] = Array(WORD_LENGTH).fill("absent");
  const targetArr = target.split("");
  const guessArr = guess.split("");

  guessArr.forEach((char, i) => {
    if (char === targetArr[i]) {
      result[i] = "correct";
      targetArr[i] = "#";
    }
  });

  guessArr.forEach((char, i) => {
    if (result[i] === "correct") return;
    const idx = targetArr.indexOf(char);
    if (idx !== -1) {
      result[i] = "present";
      targetArr[idx] = "#";
    }
  });

  return result;
}

/**
 * Score formula (0–100):
 *   • 30-point baseline for a win
 *   • Up to 40 pts based on guess count
 *   • Up to 20 pts based on speed
 *   • Loss = 0
 */
function computeScore(numGuesses: number, seconds: number, won: boolean): number {
  if (!won) return 0;
  const guessScore = ((7 - numGuesses) / 6) * 40;
  const timeScore = (Math.max(0, 300 - seconds) / 300) * 20;
  return Math.round(30 + guessScore + timeScore);
}

function tileClass(state: TileState, filled: boolean): string {
  const base = "w-14 h-14 border-2 flex items-center justify-center text-[22px] font-bold uppercase select-none";
  if (state === "correct") return `${base} bg-[#6aaa64] border-[#6aaa64] text-white`;
  if (state === "present") return `${base} bg-[#c9b458] border-[#c9b458] text-white`;
  if (state === "absent")  return `${base} bg-[#787c7e] border-[#787c7e] text-white`;
  if (filled)              return `${base} border-[#878a8c] text-[#111111]`;
  return `${base} border-[#d3d6da] text-[#111111]`;
}

function keyClass(key: string, letterStates: Record<string, TileState>): string {
  const state = letterStates[key];
  const base = "flex items-center justify-center font-semibold text-[13px] uppercase cursor-pointer select-none transition-colors duration-150 active:scale-95 rounded-sm";
  const size = key === "ENTER" || key === "⌫" ? "px-3 h-14 min-w-[56px]" : "w-10 h-14";
  if (state === "correct") return `${base} ${size} bg-[#6aaa64] text-white`;
  if (state === "present") return `${base} ${size} bg-[#c9b458] text-white`;
  if (state === "absent")  return `${base} ${size} bg-[#787c7e] text-white`;
  return `${base} ${size} bg-[#d3d6da] text-[#111111] hover:bg-[#c0c4c8]`;
}

export function WordleGame({
  target: initialTarget,
  onComplete,
  onStartAnother,
  startAnotherLabel = "Start Another Challenge",
  startAnotherDisabled = false,
}: WordleGameProps) {
  const [started, setStarted] = useState(false);
  const [target, setTarget] = useState(initialTarget);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [error, setError] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const startTime = useRef<number>(Date.now());

  const currentRow = guesses.length;

  const letterStates: Record<string, TileState> = {};
  guesses.forEach((guess) => {
    const states = evaluateGuess(guess, target);
    guess.split("").forEach((char, i) => {
      const prev = letterStates[char];
      const next = states[i];
      if (prev === "correct") return;
      if (prev === "present" && next !== "correct") return;
      letterStates[char] = next;
    });
  });

  const finishGame = useCallback((finalGuesses: string[], didWin: boolean) => {
    const seconds = Math.round((Date.now() - startTime.current) / 1000);
    const numGuesses = finalGuesses.length;
    const score = computeScore(numGuesses, seconds, didWin);
    void onComplete?.({
      score,
      completion_time_seconds: seconds,
      guesses: numGuesses,
      won: didWin,
      target_word: target,
    });
  }, [onComplete, target]);

  const submitGuess = useCallback(async () => {
    if (current.length < WORD_LENGTH) {
      setError("Not enough letters");
      setTimeout(() => setError(""), 1500);
      return;
    }

    setValidating(true);
    try {
      const res = await fetch(`/api/wordle-word?check=${current.toLowerCase()}`);
      const data = await res.json();
      if (!data.valid) {
        setError("Not in word list");
        setTimeout(() => setError(""), 1500);
        setValidating(false);
        return;
      }
    } catch {
      // allow through on network failure
    }
    setValidating(false);

    const newGuesses = [...guesses, current];
    setGuesses(newGuesses);
    setCurrent("");

    const didWin = current === target;
    if (didWin) {
      setWon(true);
      setGameOver(true);
      finishGame(newGuesses, true);
    } else if (newGuesses.length >= MAX_GUESSES) {
      setGameOver(true);
      finishGame(newGuesses, false);
    }
  }, [current, guesses, target, finishGame]);

  const handleKey = useCallback((key: string) => {
    if (gameOver || validating) return;
    if (key === "ENTER") { submitGuess(); return; }
    if (key === "⌫" || key === "BACKSPACE") { setCurrent((c) => c.slice(0, -1)); return; }
    if (/^[A-Z]$/.test(key) && current.length < WORD_LENGTH) {
      setCurrent((c) => c + key);
    }
  }, [gameOver, validating, current, submitGuess]);

  useEffect(() => {
    if (!started) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      handleKey(key === "BACKSPACE" ? "⌫" : key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, started]);

  const startGame = useCallback(() => {
    startTime.current = Date.now();
    setStarted(true);
  }, []);

  const resetGame = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wordle-word");
      const data = await res.json();
      setTarget(data.word);
    } catch {
      // keep current target if fetch fails
    }
    setGuesses([]);
    setCurrent("");
    setError("");
    setGameOver(false);
    setWon(false);
    setStarted(false);
    setLoading(false);
  }, []);

  if (!started) {
    return (
      <div className="min-h-[430px] border border-black/10 bg-white flex flex-col items-center justify-center px-8 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">
          Wordle
        </p>
        <h2 className="mt-3 font-serif text-3xl">Guess the word</h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Find the hidden 5-letter word in six tries. After each guess, tiles
          show which letters are correct and in the right place.
        </p>
        <button
          type="button"
          onClick={startGame}
          className="mt-8 bg-[#1B3468] px-8 py-3 text-sm font-medium text-white"
        >
          Start Wordle
        </button>
      </div>
    );
  }

  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    if (r < guesses.length) {
      return { letters: guesses[r].split(""), states: evaluateGuess(guesses[r], target) };
    }
    if (r === currentRow) {
      return {
        letters: current.split("").concat(Array(WORD_LENGTH - current.length).fill("")),
        states: Array<TileState>(WORD_LENGTH).fill("empty"),
      };
    }
    return { letters: Array(WORD_LENGTH).fill(""), states: Array<TileState>(WORD_LENGTH).fill("empty") };
  });

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Status */}
      <div className="flex flex-col items-center gap-3 min-h-[56px] justify-center">
        {validating && (
          <p className="text-[13px] font-medium text-[#787c7e] bg-[#f3f4f6] px-3 py-1 border border-black/10 rounded-sm">
            Checking…
          </p>
        )}
        {error && !validating && (
          <p className="text-[13px] font-medium text-red-600 bg-red-50 px-3 py-1 border border-red-200 rounded-sm">
            {error}
          </p>
        )}
        {gameOver && (
          <div className="flex flex-col items-center gap-2">
            {won ? (
              <p className="text-[13px] font-medium text-[#6aaa64] bg-green-50 px-3 py-1 border border-green-200 rounded-sm">
                You got it!
              </p>
            ) : (
              <p className="text-[13px] font-medium text-[#787c7e] bg-[#f3f4f6] px-3 py-1 border border-black/10 rounded-sm">
                The word was <strong>{target}</strong>.
              </p>
            )}
            <button
              onClick={onStartAnother ?? resetGame}
              disabled={loading || startAnotherDisabled}
              className="px-5 py-2 text-[13px] font-semibold bg-[#111111] text-white rounded-sm hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {loading
                ? "Loading…"
                : onStartAnother
                  ? startAnotherLabel
                  : "Play Again"}
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1.5">
        {rows.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.letters.map((letter, c) => (
              <div key={c} className={tileClass(row.states[c], letter !== "")}>
                {letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <div className="flex flex-col items-center gap-1.5">
        {KEYBOARD_ROWS.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((key) => (
              <button key={key} onClick={() => handleKey(key)} className={keyClass(key, letterStates)}>
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
