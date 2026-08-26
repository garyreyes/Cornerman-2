import type { TrialOutcome } from "../../lib/drillTrial";
import type { Difficulty } from "../workoutTemplates/types";

/**
 * Phase 12b. Live score + an end-of-session summary, both in-memory only
 * -- nothing is written to storage and there is no backend (docs/
 * user-flows.md Flow 7). The numbers exist while the Assault-Bike screen
 * is mounted and are gone the moment it unmounts.
 *
 * Kept here rather than inside a drill feature because the bike session
 * is what owns the run: stats have to survive a drill hook deactivating
 * and reactivating between rounds, and both drills (Odd One Out, Color
 * Call) feed the same totals. The drills stay puzzle-only.
 */

/** Points for a hit that used the whole window; a faster hit earns up to
 * double. Flat points would make `score` a restatement of `hits`, which
 * is not worth a second number on screen -- speed is the thing this drill
 * actually trains, so it's what the score weights. */
export const BASE_POINTS = 10;

/** How many trials the window takes to shrink from its start to its
 * floor. After this it holds, so a long session (Combat Effort runs 12
 * rounds) stays hard rather than becoming impossible. */
export const SHRINK_OVER_TRIALS = 15;

const TRIAL_WINDOW_BY_DIFFICULTY: Readonly<Record<Difficulty, { startMs: number; floorMs: number }>> = {
  easy: { startMs: 3000, floorMs: 1500 },
  medium: { startMs: 2500, floorMs: 1200 },
  hard: { startMs: 2000, floorMs: 900 },
};

/**
 * How long trial `trialIndex` (0-based, counted across the whole session,
 * not per round) waits for a tap before it counts as a timeout. Shrinks
 * linearly to the floor, so the drill self-scales within a difficulty
 * instead of needing the rider to re-tune anything mid-workout.
 */
export function trialWindowMs(difficulty: Difficulty, trialIndex: number): number {
  const { startMs, floorMs } = TRIAL_WINDOW_BY_DIFFICULTY[difficulty];
  const progress = Math.min(1, Math.max(0, trialIndex / SHRINK_OVER_TRIALS));
  return Math.round(startMs - (startMs - floorMs) * progress);
}

/** Base points plus a speed bonus of up to another full base, scaled by
 * how much of the window was left. Clamped both ways: a reaction longer
 * than the window (clock jitter around the timeout boundary) earns the
 * base rather than going negative. */
export function pointsForHit(reactionMs: number, windowMs: number): number {
  if (windowMs <= 0) {
    return BASE_POINTS;
  }
  const remaining = Math.max(0, windowMs - reactionMs);
  return BASE_POINTS + Math.round(BASE_POINTS * (remaining / windowMs));
}

export interface DrillStats {
  /** Every resolved trial: hits, wrong taps and timeouts alike. */
  trials: number;
  hits: number;
  score: number;
  /** Summed over hits only -- see recordTrial. */
  totalHitReactionMs: number;
}

/** Re-exported so a caller tallying results doesn't need a second import
 * for the shape those results already have. The canonical declaration is
 * lib/drillTrial.ts -- see its note on why it sits there rather than in
 * this file or in a drill feature. A timeout arrives as
 * `{correct: false, reactionMs: <the full window>}`. */
export type { TrialOutcome } from "../../lib/drillTrial";

export function emptyDrillStats(): DrillStats {
  return { trials: 0, hits: 0, score: 0, totalHitReactionMs: 0 };
}

/**
 * What a trial nobody answered resolves to. Named rather than written
 * inline at the hook's timeout callback so the "an untouched trial can
 * never score" rule is pinned by a test instead of by one literal buried
 * in an effect -- a hit nobody earned would make the whole readout
 * meaningless, and a live emulator run couldn't distinguish that from
 * the machine's own delayed-tap delivery (PROJECT_FACTS.md).
 *
 * `reactionMs` is the full window because that is honestly how long the
 * trial stood unanswered; recordTrial keeps it out of the average.
 */
export function timeoutOutcome(windowMs: number): TrialOutcome {
  return { correct: false, reactionMs: windowMs };
}

/**
 * Only a hit contributes to `totalHitReactionMs`. A timeout's "reaction
 * time" is really just the window length, and a wrong tap measures how
 * fast someone was wrong -- averaging either into the reported figure
 * would make a worse session look faster.
 */
export function recordTrial(stats: DrillStats, outcome: TrialOutcome, windowMs: number): DrillStats {
  if (!outcome.correct) {
    return { ...stats, trials: stats.trials + 1 };
  }
  return {
    trials: stats.trials + 1,
    hits: stats.hits + 1,
    score: stats.score + pointsForHit(outcome.reactionMs, windowMs),
    totalHitReactionMs: stats.totalHitReactionMs + outcome.reactionMs,
  };
}

export interface DrillSummary {
  score: number;
  trials: number;
  hits: number;
  /** Whole percent; 0 for a session with no trials (rather than NaN). */
  accuracyPct: number;
  /** null when nothing was hit -- there is genuinely no average to show,
   * and 0ms would read as a perfect score. */
  avgReactionMs: number | null;
}

export function drillSummary(stats: DrillStats): DrillSummary {
  return {
    score: stats.score,
    trials: stats.trials,
    hits: stats.hits,
    accuracyPct: stats.trials === 0 ? 0 : Math.round((stats.hits / stats.trials) * 100),
    avgReactionMs: stats.hits === 0 ? null : Math.round(stats.totalHitReactionMs / stats.hits),
  };
}
