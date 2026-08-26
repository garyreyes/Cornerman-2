export type Phase = "ready" | "warmup" | "work" | "rest" | "finished";

/** A single round's duration overrides, in ms -- undefined fields mean
 * "use the base work/restDurationMs on TimerConfig". Deliberately just a
 * plain ms shape (not aware of WorkoutTemplate/RoundConfig at all) --
 * this engine stays purely additive/agnostic to who produced the
 * override, matching how it already knows nothing about Settings. */
export interface RoundOverride {
  workDurationMs?: number;
  restDurationMs?: number;
}

export interface TimerConfig {
  totalRounds: number;
  workDurationMs: number;
  restDurationMs: number;
  warmupDurationMs: number;
  /** 0-indexed by round-1 (round is 1-indexed everywhere else in this
   * engine); a missing entry, or a missing field on an entry, falls back
   * to the base work/restDurationMs above. Undefined entirely for the
   * ordinary uniform (Settings-driven) case -- Phase 10+ (Workout
   * Templates) is the only producer of this. */
  roundOverrides?: RoundOverride[];
}

export interface TimerState {
  phase: Phase;
  /** 1-indexed; 0 while phase is "ready" or "warmup" */
  round: number;
  /** Absolute timestamp (same clock as the `now` passed to tick) the current phase ends at */
  phaseEndAt: number;
  tenWarned: boolean;
  /** Last whole-second value already announced this Rest phase (3, 2, or 1); null = none yet */
  lastRestCountdown: 3 | 2 | 1 | null;
  /** Absolute timestamp the first combo of the current Work phase should fire; null outside Work */
  firstComboAt: number | null;
  isPaused: boolean;
  /** Timestamp pause() was called; null while running */
  pausedAt: number | null;
}

export type TimerEvent =
  | { type: "phase-changed"; phase: Phase; round: number }
  | { type: "work-warning" }
  | { type: "rest-countdown"; secondsRemaining: 3 | 2 | 1 }
  | { type: "session-finished" };

export type RandomFn = () => number;
