/**
 * Phase 10+ (ARCHITECTURE.md "Phase 10+ entities: Workout Templates").
 * Purely additive -- Settings/Punch/Preset are untouched, and the existing
 * Settings-driven quick-start session flow keeps working unchanged.
 */

/**
 * One entry per round, in declared order. Per-round fields override the
 * template's base values when set (e.g. a "championship round" running
 * longer than the rest). A "uniform" template (the built-ins below) is
 * simply a roundPlan where every round has the same `{ type: "random" }`
 * comboSource and no overrides -- the round-by-round case and the uniform
 * case are the same data shape, not two systems.
 */
export interface RoundConfig {
  label?: string;
  /** Coaching-reminder string shown on screen during this round --
   * visual only, never spoken aloud (ARCHITECTURE.md flags this as an
   * assumption; revisit if a user actually wants it announced). */
  note?: string;
  workDurationSec?: number;
  restDurationSec?: number;
  comboGapMinSec?: number;
  comboGapMaxSec?: number;
  comboSource: ComboSource;
}

/**
 * All punch references use Punch.num (not id), matching Preset's existing
 * resolve-at-call-time-with-graceful-fallback pattern -- one resolution
 * mechanism for the whole app, not two.
 */
export type ComboSource =
  | { type: "fixed-punch"; punchNum: number }
  | { type: "fixed-sequence"; sequence: number[] }
  | { type: "preset"; presetId: string }
  | { type: "random"; punchPool?: number[] };

export interface BoxingConfig {
  baseWorkDurationSec: number;
  baseRestDurationSec: number;
  warmupDurationSec: number;
  baseComboGapMinSec: number;
  baseComboGapMaxSec: number;
  roundPlan: RoundConfig[];
}

/**
 * `workoutType`/`config` are typed narrow to "boxing"/BoxingConfig for now
 * -- ARCHITECTURE.md's full shape is a discriminated union with
 * "assault-bike-cognitive"/AssaultBikeConfig, but that config type doesn't
 * exist until Phase 11a builds it. Widen both once it does; typing the
 * wider union today would let `workoutType: "assault-bike-cognitive"`
 * type-check against a BoxingConfig, which is worse than just being narrow.
 */
export interface WorkoutTemplate {
  id: string;
  name: string;
  /** Ordinary editable rows, not specially locked -- confirmed in
   * ARCHITECTURE.md, no delete/edit guard needed for these. */
  isBuiltIn: boolean;
  workoutType: "boxing";
  config: BoxingConfig;
}
