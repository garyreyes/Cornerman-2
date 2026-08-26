import { useCallback, useEffect, useRef, useState } from "react";

import { resolveTap, startTrial } from "../oddOneOut/service";
import type { Trial, TrialResult } from "../oddOneOut/types";
import type { Difficulty } from "../workoutTemplates/types";
import { drillSummary, emptyDrillStats, recordTrial, trialWindowMs } from "./scoring";
import type { DrillStats, DrillSummary } from "./scoring";

const NEXT_TRIAL_DELAY_MS = 500;

export interface UseDrillRunResult {
  /** The puzzle currently on screen; null during the brief result-shown
   * pause between trials, and whenever the drill isn't active. */
  trial: Trial | null;
  lastResult: TrialResult | null;
  /** Absolute timestamp this trial times out at; null between trials. */
  deadlineAt: number | null;
  /** How long the current trial was given -- the denominator the timer bar
   * animates against, and what a timeout records as its "reaction". */
  windowMs: number;
  stats: DrillStats;
  summary: DrillSummary;
  handleTap: (tappedIndex: number) => void;
  resetStats: () => void;
}

/**
 * The drill loop for one whole bike session (Phase 12b), replacing Phase
 * 11c's useOddOneOutDrill.
 *
 * It lives in `assaultBike/` rather than in a drill feature for one
 * load-bearing reason: score and the shrinking trial window both run for
 * the *session*, not the round. The drill goes inactive at every Drill
 * phase boundary (12 times over a Combat Effort run), so a hook owned by
 * the drill feature would reset the tally and re-widen the window every
 * round. The drill features stay pure puzzle logic; this owns the run.
 *
 * Mutable values are mirrored into refs because the trial lifecycle is
 * driven entirely from timer callbacks, which would otherwise close over
 * a stale render's `stats`. Every ref is written only from callbacks and
 * effects -- never during render (react-hooks/refs).
 */
export function useDrillRun(active: boolean, difficulty: Difficulty): UseDrillRunResult {
  const [trial, setTrial] = useState<Trial | null>(null);
  const [lastResult, setLastResult] = useState<TrialResult | null>(null);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [windowMs, setWindowMs] = useState(() => trialWindowMs(difficulty, 0));
  const [stats, setStats] = useState<DrillStats>(emptyDrillStats);

  const statsRef = useRef<DrillStats>(emptyDrillStats());
  const trialRef = useRef<Trial | null>(null);
  const windowRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTrialRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // beginTrial and finishTrial are mutually recursive (each trial schedules
  // the next); the ref breaks the cycle without either capturing a stale
  // copy of the other.
  const beginTrialRef = useRef<() => void>(() => {});

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (nextTrialRef.current !== null) {
      clearTimeout(nextTrialRef.current);
      nextTrialRef.current = null;
    }
  }, []);

  const finishTrial = useCallback((result: TrialResult, usedWindowMs: number) => {
    const next = recordTrial(statsRef.current, result, usedWindowMs);
    statsRef.current = next;
    setStats(next);
    setLastResult(result);
    setTrial(null);
    trialRef.current = null;
    setDeadlineAt(null);
    nextTrialRef.current = setTimeout(() => beginTrialRef.current(), NEXT_TRIAL_DELAY_MS);
  }, []);

  const beginTrial = useCallback(() => {
    // Counted across the session, so the window keeps tightening from one
    // round into the next rather than restarting wide each Drill phase.
    const nextWindowMs = trialWindowMs(difficulty, statsRef.current.trials);
    const now = Date.now();
    const nextTrial = startTrial(difficulty, now);

    trialRef.current = nextTrial;
    windowRef.current = nextWindowMs;
    setTrial(nextTrial);
    setWindowMs(nextWindowMs);
    setDeadlineAt(now + nextWindowMs);
    setLastResult(null);

    timeoutRef.current = setTimeout(() => {
      // A timeout is a non-hit that used the whole window -- scoring.ts
      // deliberately keeps that "reaction" out of the reported average.
      finishTrial({ correct: false, reactionMs: nextWindowMs }, nextWindowMs);
    }, nextWindowMs);
  }, [difficulty, finishTrial]);

  useEffect(() => {
    beginTrialRef.current = beginTrial;
  }, [beginTrial]);

  useEffect(() => {
    // Wrapped rather than called inline: this project's lint config bans
    // bare setState in an effect body (react-hooks/set-state-in-effect),
    // same shape useSession.ts uses.
    const syncActive = () => {
      if (!active) {
        clearTimers();
        trialRef.current = null;
        setTrial(null);
        setDeadlineAt(null);
        setLastResult(null);
        return;
      }
      beginTrial();
    };
    syncActive();
    return clearTimers;
  }, [active, beginTrial, clearTimers]);

  const handleTap = useCallback(
    (tappedIndex: number) => {
      const current = trialRef.current;
      if (current === null) {
        return;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      finishTrial(resolveTap(current, tappedIndex, Date.now()), windowRef.current);
    },
    [finishTrial],
  );

  const resetStats = useCallback(() => {
    const fresh = emptyDrillStats();
    statsRef.current = fresh;
    setStats(fresh);
    setLastResult(null);
  }, []);

  return {
    trial,
    lastResult,
    deadlineAt,
    windowMs,
    stats,
    summary: drillSummary(stats),
    handleTap,
    resetStats,
  };
}
