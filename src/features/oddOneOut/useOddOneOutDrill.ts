import { useEffect, useRef, useState } from "react";

import { resolveTap, startTrial } from "./service";
import type { Difficulty, Trial, TrialResult } from "./types";

const NEXT_TRIAL_DELAY_MS = 500;

export interface UseOddOneOutDrillResult {
  /** The puzzle currently on screen; null between trials (the brief
   * result-shown pause) or while inactive. */
  trial: Trial | null;
  /** The most recently resolved trial's result, for the live reaction-
   * time/correct display -- cleared the moment a new trial starts. */
  lastResult: TrialResult | null;
  handleTap: (tappedIndex: number) => void;
}

/**
 * Runs a continuous stream of Odd-One-Out trials while `active` -- a
 * Brain Endurance Training drill is meant to fill its whole window with
 * repeated stimuli, not present one static puzzle for the entire ~30s
 * (docs/user-flows.md Flow 7: "reaction time shown live", read as a
 * running readout, not a single number). Untested effect-loop consumer
 * of oddOneOut/service.ts's pure trial functions -- same split as
 * useSession.ts/session/service.ts (PROJECT_FACTS.md).
 */
export function useOddOneOutDrill(active: boolean, difficulty: Difficulty): UseOddOneOutDrillResult {
  const [trial, setTrial] = useState<Trial | null>(null);
  const [lastResult, setLastResult] = useState<TrialResult | null>(null);
  const nextTrialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const syncTrial = () => {
      if (!active) {
        setTrial(null);
        setLastResult(null);
        return;
      }
      setTrial(startTrial(difficulty, Date.now()));
    };
    syncTrial();
    return () => {
      if (nextTrialTimeoutRef.current !== null) {
        clearTimeout(nextTrialTimeoutRef.current);
        nextTrialTimeoutRef.current = null;
      }
    };
  }, [active, difficulty]);

  function handleTap(tappedIndex: number) {
    if (trial === null) {
      return;
    }
    setLastResult(resolveTap(trial, tappedIndex, Date.now()));
    setTrial(null);
    nextTrialTimeoutRef.current = setTimeout(() => {
      setTrial(startTrial(difficulty, Date.now()));
    }, NEXT_TRIAL_DELAY_MS);
  }

  return { trial, lastResult, handleTap };
}
