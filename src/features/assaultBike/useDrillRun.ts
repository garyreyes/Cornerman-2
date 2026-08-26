import { useCallback, useEffect, useRef, useState } from "react";

import type { TrialOutcome } from "../../lib/drillTrial";
import { resolveColorTap, startColorTrial } from "../colorCall/service";
import type { ColorTrial } from "../colorCall/types";
import { resolveTap, startTrial } from "../oddOneOut/service";
import type { Trial } from "../oddOneOut/types";
import { getSettings } from "../settings/service";
import { createSpeechEngine } from "../speech/service";
import type { SpeechEngine } from "../speech/types";
import type { Difficulty, DrillMode } from "../workoutTemplates/types";
import { drillSummary, emptyDrillStats, recordTrial, timeoutOutcome, trialWindowMs } from "./scoring";
import type { DrillStats, DrillSummary } from "./scoring";

const NEXT_TRIAL_DELAY_MS = 500;

/** Discriminated so the screen can render the right grid without the run
 * loop having to expose two nullable trial fields, only one of which is
 * ever set. */
export type DrillTrial = { mode: "odd-one-out"; puzzle: Trial } | { mode: "color-call"; puzzle: ColorTrial };

export interface UseDrillRunResult {
  /** The puzzle currently on screen; null during the brief result-shown
   * pause between trials, and whenever the drill isn't active. */
  trial: DrillTrial | null;
  lastResult: TrialOutcome | null;
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
 * The drill loop for one whole bike session (Phase 12b, generalised over
 * both drills in 12c).
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
export function useDrillRun(active: boolean, drillMode: DrillMode, difficulty: Difficulty): UseDrillRunResult {
  const [trial, setTrial] = useState<DrillTrial | null>(null);
  const [lastResult, setLastResult] = useState<TrialOutcome | null>(null);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [windowMs, setWindowMs] = useState(() => trialWindowMs(difficulty, 0));
  const [stats, setStats] = useState<DrillStats>(emptyDrillStats);

  const statsRef = useRef<DrillStats>(emptyDrillStats());
  const trialRef = useRef<DrillTrial | null>(null);
  const windowRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTrialRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechEngineRef = useRef<SpeechEngine | null>(null);
  // beginTrial and finishTrial are mutually recursive (each trial schedules
  // the next); the ref breaks the cycle without either capturing a stale
  // copy of the other.
  const beginTrialRef = useRef<() => void>(() => {});

  /**
   * One engine for this hook's whole mount lifetime, not one per Drill
   * phase -- Color Call reactivates every round, and rebuilding the
   * AudioContext (which decodes the entire clip bank) 12 times a session
   * would be wasteful and audibly late on the first call of each round.
   * Mirrors settings/previewEngine.ts's "shorter-lived screen owns and
   * closes its own engine" pattern; useSession.ts's engine is never
   * closed only because Main Timer never unmounts.
   */
  useEffect(() => {
    const initSpeechEngine = () => {
      try {
        const engine = createSpeechEngine(getSettings().ttsVoice);
        engine.setVolume(getSettings().appVolume);
        speechEngineRef.current = engine;
      } catch {
        // Silent: Color Call is unplayable without the called word, but
        // the bike screen's own AudioErrorBanner already covers a broken
        // audio stack, and a second banner for the same root cause would
        // just be noise.
      }
    };
    initSpeechEngine();
    return () => {
      void speechEngineRef.current?.close();
      speechEngineRef.current = null;
    };
  }, []);

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

  const finishTrial = useCallback((result: TrialOutcome, usedWindowMs: number) => {
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

    let nextTrial: DrillTrial;
    if (drillMode === "color-call") {
      const puzzle = startColorTrial(difficulty, now);
      nextTrial = { mode: "color-call", puzzle };
      // The spoken word IS the stimulus here -- the grid alone says
      // nothing about which tile is correct.
      speechEngineRef.current?.playWord(puzzle.target);
    } else {
      nextTrial = { mode: "odd-one-out", puzzle: startTrial(difficulty, now) };
    }

    trialRef.current = nextTrial;
    windowRef.current = nextWindowMs;
    setTrial(nextTrial);
    setWindowMs(nextWindowMs);
    setDeadlineAt(now + nextWindowMs);
    setLastResult(null);

    timeoutRef.current = setTimeout(() => {
      // A timeout is a non-hit that used the whole window. The shape is
      // scoring.ts's own timeoutOutcome rather than a literal here, so
      // "an untouched trial can never score" is pinned by a test.
      finishTrial(timeoutOutcome(nextWindowMs), nextWindowMs);
    }, nextWindowMs);
  }, [difficulty, drillMode, finishTrial]);

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
        // A colour called just as the Drill phase ended would otherwise
        // keep sounding into Reset, over the phase-change bell.
        speechEngineRef.current?.stop();
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
      const now = Date.now();
      const outcome =
        current.mode === "color-call"
          ? resolveColorTap(current.puzzle, tappedIndex, now)
          : resolveTap(current.puzzle, tappedIndex, now);
      finishTrial(outcome, windowRef.current);
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
