/**
 * Phase 11 (docs/user-flows.md Flow 7). Deliberately NOT built on top of
 * timer/types.ts -- the phase set and transition rules are genuinely
 * different (no warmup, no combo/warning latches, every round -- including
 * the last -- runs its full Settle/Drill/Reset cycle rather than skipping
 * a trailing rest), and shoehorning that in would cost more than a fresh,
 * purpose-built state machine mirroring the *pattern* timer/service.ts
 * already proved (pure functions, phase-changed events, exact-remaining-
 * time pause/resume).
 */
export type BikePhase = "work" | "settle" | "drill" | "reset" | "finished";

export interface BikeConfig {
  roundsTarget: number;
  workSec: number;
  settleSec: number;
  drillSec: number;
  resetSec: number;
}

export interface BikeState {
  phase: BikePhase;
  /** 1-indexed; never 0 -- the cycle starts directly in Work, round 1 (no
   * warmup/ready phase inside this state machine, matching Flow 7's own
   * diagram). */
  round: number;
  /** Absolute timestamp (same clock as the `now` passed to tick) the
   * current phase ends at. */
  phaseEndAt: number;
  isPaused: boolean;
  pausedAt: number | null;
}

export type BikeEvent = { type: "phase-changed"; phase: BikePhase; round: number } | { type: "session-finished" };
