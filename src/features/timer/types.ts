export type Phase = "ready" | "warmup" | "work" | "rest" | "finished";

export interface TimerConfig {
  totalRounds: number;
  workDurationMs: number;
  restDurationMs: number;
  warmupDurationMs: number;
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
}

export type TimerEvent =
  | { type: "phase-changed"; phase: Phase; round: number }
  | { type: "work-warning" }
  | { type: "rest-countdown"; secondsRemaining: 3 | 2 | 1 }
  | { type: "session-finished" };

export type RandomFn = () => number;
