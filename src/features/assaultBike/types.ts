import type { DrillMode } from "../workoutTemplates/types";

/**
 * Phase 11 (docs/user-flows.md Flow 7). Deliberately NOT built on top of
 * timer/types.ts -- the phase set and transition rules are genuinely
 * different (no warmup, no combo/warning latches, every round -- including
 * the last -- runs its full rest cycle rather than skipping a trailing
 * rest), and shoehorning that in would cost more than a fresh,
 * purpose-built state machine mirroring the *pattern* timer/service.ts
 * already proved (pure functions, phase-changed events, exact-remaining-
 * time pause/resume).
 *
 * Phase 12a widened this from one hardcoded cycle to two, because the
 * four real bike protocols don't share a rest shape: three of them have
 * room for a cognitive drill, and Anaerobic Lactic Capacity (20s all-out
 * / 10s easy spin) does not -- 10s can't fit "pick the phone up, drill,
 * put it down".
 */
export type BikePhase = "work" | "rest" | "settle" | "drill" | "reset" | "finished";

/**
 * Discriminated rather than a flat `{settleSec, drillSec, resetSec}` with
 * a separate "no drill" flag: a plain rest genuinely has *one* duration,
 * and modelling it as `{settleSec: 10, drillSec: 0, resetSec: 0}` would
 * both fake a Settle phase that means something else on screen ("PHONE
 * UP" -- see the drill cycle's own copy) and leave two nonsense states
 * expressible (drill durations set with no drill; a drill with none).
 * Same reasoning that dropped AssaultBikeConfig's originally-specified
 * flat `restSec` as redundant with its own breakdown.
 */
export type BikeRest =
  | { kind: "plain"; restSec: number }
  | { kind: "drill"; settleSec: number; drillSec: number; resetSec: number };

/**
 * Carries no drillMode/difficulty on purpose -- the state machine only
 * needs to know *how long* the drill phase runs, never which drill fills
 * it. Keeps the same "engine stays decoupled from the template entity's
 * field layout" boundary that toBikeConfig/toTimerConfig already hold;
 * the screen reads drillMode straight off the template's own config.
 */
export interface BikeConfig {
  roundsTarget: number;
  workSec: number;
  rest: BikeRest;
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

/**
 * What a rider picks for *this* session's Drill phase (Phase 12e):
 * one of the real drills, or "none" to skip it. Distinct from a protocol
 * that structurally has no drill at all (RestPlan's `"plain"` kind, e.g.
 * Lactic Capacity's 10s rest) -- that's a property of the protocol, fixed
 * in the template; this is an ephemeral per-session choice on a protocol
 * that does have one. "none" is handled by collapsing the session's own
 * BikeConfig via `withoutDrill` before it ever reaches the engine (see
 * service.ts), not by threading a null case through the state machine --
 * once collapsed, the engine can't tell the difference from a protocol
 * that was never drilled, and the phase badge correctly reads one
 * continuous REST instead of instructing "PHONE UP" for a phone the rider
 * was told they don't need this session.
 */
export type DrillChoice = DrillMode | "none";
