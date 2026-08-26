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

/** "mixed" is a real, named value (ARCHITECTURE.md) but explicitly
 * deferred -- not constructible by anything built so far (Phase 11
 * ships "visual" and "auditory" only). Kept in the type now so a future
 * mixed-mode build doesn't need another discriminant migration. */
export type DrillMode = "visual" | "auditory" | "mixed";

/** Only two drill types ship in Phase 11 -- the "other twelve drill
 * variants from the reference protocol" (ARCHITECTURE.md) are deferred,
 * not designed away. Distinct from DrillMode on purpose: once more
 * drills exist, one mode could offer a choice of several. */
export type DrillType = "odd-one-out" | "corner-commands";

/**
 * `{ roundsTarget, workSec, restPhases: {settleSec, drillSec, resetSec},
 * drillMode, drillType, difficulty }` -- ARCHITECTURE.md's original list
 * also named a flat `restSec` alongside `restPhases`, but never gave it a
 * purpose distinct from `restPhases`' own three sub-durations (which are
 * what the actual Settle/Drill/Reset state machine needs); dropped as
 * redundant rather than carrying an unused field that could drift out of
 * sync with its own breakdown -- see PROJECT_FACTS.md. **One fixed
 * difficulty, no bike hardware integration, no stats/history logging** --
 * all confirmed scope limits, not oversights (ARCHITECTURE.md).
 */
export interface AssaultBikeConfig {
  roundsTarget: number;
  workSec: number;
  restPhases: {
    settleSec: number;
    drillSec: number;
    resetSec: number;
  };
  drillMode: DrillMode;
  drillType: DrillType;
  difficulty: "easy" | "medium" | "hard";
}

interface WorkoutTemplateBase {
  id: string;
  name: string;
  /** Ordinary editable rows, not specially locked -- confirmed in
   * ARCHITECTURE.md. In practice, only boxing templates are actually
   * editable yet: the Round Builder (Phase 10c) is boxing-specific, and
   * no assault-bike editor is a planned Phase 11 deliverable -- see
   * templates/index.tsx's edit guard and PROJECT_FACTS.md. */
  isBuiltIn: boolean;
}

/**
 * Discriminated on `workoutType`, matching ARCHITECTURE.md's original
 * shape -- narrowed to `{workoutType: "boxing"; config: BoxingConfig}`
 * only from Phase 10a through 10d, since AssaultBikeConfig didn't exist
 * yet; widened here now that it does (Phase 11a).
 */
export type WorkoutTemplate =
  | (WorkoutTemplateBase & { workoutType: "boxing"; config: BoxingConfig })
  | (WorkoutTemplateBase & { workoutType: "assault-bike-cognitive"; config: AssaultBikeConfig });
