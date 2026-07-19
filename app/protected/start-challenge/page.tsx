"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChallengeGrid } from "@/components/challenge-grid";
import { PostChallengeSurvey } from "@/components/post-challenge-survey";
import { PreChallengeSurvey } from "@/components/pre-challenge-survey";
import {
  DigitSpanGame,
  type DigitSpanResult,
} from "@/components/digit-span-game";
import {
  SerialSubtractionGame,
  type SerialSubtractionResult,
} from "@/components/serial-subtraction-game";
import {
  StructuredListRecallGame,
  type StructuredListRecallResult,
} from "@/components/structured-list-recall-game";
import {
  StroopGame,
  type StroopResult,
} from "@/components/stroop-game";
import { WordlePuzzle } from "@/components/wordle-puzzle";
import type { WordleResult } from "@/components/wordle-game";
import {
  PLAYABLE_CHALLENGES,
  type ChallengeWorkflow,
  type PlayableChallenge,
  type PostSurveyData,
  type PreSurveyData,
} from "@/lib/challenge-workflow";
import type { ChallengeKey } from "@/lib/challenges";

type Stage =
  | "loading"
  | "survey"
  | "selection"
  | PlayableChallenge
  | "post-survey";
type SaveState = "idle" | "saving" | "error";
type OfficialAttempt =
  | { challenge: "wordle"; result: WordleResult }
  | { challenge: "stroop"; result: StroopResult }
  | {
      challenge: "serial-subtraction";
      result: SerialSubtractionResult;
    }
  | { challenge: "digit-span"; result: DigitSpanResult }
  | {
      challenge: "structured-list-recall";
      result: StructuredListRecallResult;
    };

const CHALLENGE_TITLES: Record<PlayableChallenge, string> = {
  wordle: "Wordle",
  stroop: "Stroop Task",
  "serial-subtraction": "Serial Subtraction",
  "digit-span": "Digit Span",
  "structured-list-recall": "Structured List Recall",
};

function notifyWorkflowChanged() {
  window.dispatchEvent(new Event("ssep:challenge-workflow-changed"));
}

function stageFromWorkflow(workflow: ChallengeWorkflow): Stage {
  if (workflow.checkpoint === "challenge_selection") return "selection";
  if (workflow.checkpoint === "post_survey") return "post-survey";
  if (
    workflow.checkpoint === "challenge_play" &&
    workflow.selected_challenge
  ) {
    return workflow.selected_challenge;
  }
  return "survey";
}

export default function StartChallengePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [workflow, setWorkflow] = useState<ChallengeWorkflow | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [completedAttempt, setCompletedAttempt] =
    useState<OfficialAttempt | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/challenge-workflow", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "Unable to load challenge");
        }
        return body.workflow as ChallengeWorkflow | null;
      })
      .then((activeWorkflow) => {
        setWorkflow(activeWorkflow);
        setStage(
          activeWorkflow ? stageFromWorkflow(activeWorkflow) : "survey",
        );
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load challenge",
        );
        setStage("survey");
      });

    return () => controller.abort();
  }, []);

  const submitPreSurvey = useCallback(async (data: PreSurveyData) => {
    const response = await fetch("/api/challenge-workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json();

    if (!response.ok) {
      if (response.status === 409 && body.workflow) {
        const activeWorkflow = body.workflow as ChallengeWorkflow;
        setWorkflow(activeWorkflow);
        setStage(stageFromWorkflow(activeWorkflow));
        notifyWorkflowChanged();
        return;
      }
      throw new Error(body.error ?? "Unable to save the survey");
    }

    setWorkflow(body.workflow);
    setStage("selection");
    notifyWorkflowChanged();
  }, []);

  const selectChallenge = async (challenge: ChallengeKey) => {
    setUnavailable(null);
    if (
      !PLAYABLE_CHALLENGES.includes(challenge as PlayableChallenge)
    ) {
      setUnavailable(
        "This puzzle is still being prepared. Choose one of the available official challenges.",
      );
      return;
    }

    const selected = challenge as PlayableChallenge;
    const response = await fetch("/api/challenge-workflow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "select_challenge",
        selected_challenge: selected,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setUnavailable(body.error ?? "Unable to select this challenge");
      return;
    }

    setWorkflow(body.workflow);
    setStage(selected);
    notifyWorkflowChanged();
  };

  const saveOfficialResult = useCallback(
    async (attempt: OfficialAttempt) => {
      if (!workflow) return;

      setSaveState("saving");
      try {
        const response = await fetch("/api/challenge-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challenge: attempt.challenge,
            is_official: true,
            workflow_id: workflow.id,
            ...attempt.result,
          }),
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? "Unable to save this attempt");
        }

        setWorkflow((current) =>
          current ? { ...current, checkpoint: "post_survey" } : current,
        );
        setSaveState("idle");
        setStage("post-survey");
        notifyWorkflowChanged();
      } catch (error) {
        console.error("[Start Challenge] Failed to save result:", error);
        setSaveState("error");
      }
    },
    [workflow],
  );

  const completeAttempt = useCallback(
    (attempt: OfficialAttempt) => {
      setCompletedAttempt(attempt);
      void saveOfficialResult(attempt);
    },
    [saveOfficialResult],
  );

  const retrySave = useCallback(() => {
    if (completedAttempt) void saveOfficialResult(completedAttempt);
  }, [completedAttempt, saveOfficialResult]);

  const submitPostSurvey = useCallback(
    async (data: PostSurveyData) => {
      const response = await fetch("/api/challenge-workflow", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_post_survey",
          ...data,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to save the survey");
      }

      setWorkflow(null);
      notifyWorkflowChanged();
      router.push("/protected");
      router.refresh();
    },
    [router],
  );

  if (stage === "loading") {
    return (
      <div className="max-w-3xl space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-muted" />
        <div className="h-4 w-96 max-w-full bg-muted" />
        <div className="h-64 bg-muted" />
      </div>
    );
  }

  if (stage === "survey") {
    return (
      <div>
        {loadError && (
          <p className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </p>
        )}
        <PreChallengeSurvey onSubmit={submitPreSurvey} />
      </div>
    );
  }

  if (stage === "selection") {
    return (
      <div className="max-w-5xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">
            Pre-challenge survey saved
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Select a Challenge
          </h1>
          <p className="text-muted-foreground mt-1">
            Choose one puzzle for this official attempt. You can leave and
            continue from this step later.
          </p>
        </div>

        {unavailable && (
          <p className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {unavailable}
          </p>
        )}

        <ChallengeGrid onSelect={selectChallenge} />
      </div>
    );
  }

  if (stage === "post-survey") {
    return <PostChallengeSurvey onSubmit={submitPostSurvey} />;
  }

  const startAnotherLabel =
    saveState === "saving" ? "Saving…" : "Retry Saving";
  const sharedGameProps = {
    onStartAnother: retrySave,
    startAnotherDisabled: saveState !== "error",
    startAnotherLabel,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">
          Official attempt
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {CHALLENGE_TITLES[stage]}
        </h1>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Complete this challenge to continue to the post-challenge survey.
        </p>
        {saveState === "saving" && (
          <p className="mt-3 text-sm text-muted-foreground">
            Saving your official attempt…
          </p>
        )}
        {saveState === "error" && (
          <p className="mt-3 text-sm text-red-600">
            Your result could not be saved. Use the button below to retry.
          </p>
        )}
      </div>

      {stage === "wordle" ? (
        <WordlePuzzle
          onComplete={(result) =>
            completeAttempt({ challenge: "wordle", result })
          }
          {...sharedGameProps}
        />
      ) : stage === "stroop" ? (
        <StroopGame
          onComplete={(result) =>
            completeAttempt({ challenge: "stroop", result })
          }
          {...sharedGameProps}
        />
      ) : stage === "serial-subtraction" ? (
        <SerialSubtractionGame
          onComplete={(result) =>
            completeAttempt({
              challenge: "serial-subtraction",
              result,
            })
          }
          {...sharedGameProps}
        />
      ) : stage === "digit-span" ? (
        <DigitSpanGame
          onComplete={(result) =>
            completeAttempt({ challenge: "digit-span", result })
          }
          {...sharedGameProps}
        />
      ) : (
        <StructuredListRecallGame
          onComplete={(result) =>
            completeAttempt({
              challenge: "structured-list-recall",
              result,
            })
          }
          {...sharedGameProps}
        />
      )}
    </div>
  );
}
