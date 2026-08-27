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
  | { type: "random"; punchPool?: number[] }
  /**
   * A set of specific combos; one whole combo is drawn per call-out.
   * Added for the bagwork round plans, whose rounds name several combos
   * each (Moderate R3 is both `1-2b-3` and `2-3b-2`) -- none of the
   * sources above could express that: `fixed-sequence` is one combo
   * forever, `preset` is the same thing behind an id, and `random`
   * throws the combo structure away entirely. A pool of one is the
   * rep-to-reflex case bagwork's Easy rounds ask for.
   */
  | { type: "combo-pool"; combos: number[][] };

export interface BoxingConfig {
  baseWorkDurationSec: number;
  baseRestDurationSec: number;
  warmupDurationSec: number;
  baseComboGapMinSec: number;
  baseComboGapMaxSec: number;
  roundPlan: RoundConfig[];
}

/**
 * The two cognitive drills that actually ship (Phase 12).
 *
 * This replaces Phase 11's `DrillMode`/`DrillType` *pair*, which encoded
 * one choice in two fields that could drift out of sync (the same
 * redundancy that got the original flat `restSec` dropped below). It also
 * retires "corner-commands" -- the Phase 11d drill that called defensive
 * movements ("duck"/"roll"/"pivot") aloud. That drill assumed the rider
 * would perform the movement, which means dismounting the bike and
 * remounting inside a rest period; confirmed as unworkable in practice,
 * so the auditory channel became a *stimulus* for an on-screen tap
 * ("color-call") rather than an instruction to move. See PROJECT_FACTS.md.
 *
 * - `odd-one-out`: a uniform grid with one different tile -- tap it.
 * - `color-call`: a multi-colour grid, one colour named aloud -- tap it.
 */
export type DrillMode = "odd-one-out" | "color-call";

/** "One fixed difficulty rather than the reference protocol's per-round
 * auto-scaling" (ARCHITECTURE.md) -- the type stays the full range for
 * whichever difficulty a template specifies. Named/exported here (the
 * actual owner of the drill difficulty) rather than each drill declaring
 * its own copy -- every drill feature imports this one. */
export type Difficulty = "easy" | "medium" | "hard";

/**
 * How one round's rest is spent. Discriminated because the four real bike
 * protocols genuinely don't share a rest shape: three have room for a
 * cognitive drill, and Anaerobic Lactic Capacity (20s all-out / 10s easy
 * spin) does not -- 10s can't fit "pick the phone up, drill, put it
 * down". Modelling that as `{settleSec: 10, drillSec: 0, resetSec: 0}`
 * would fake a Settle phase that means something else on screen and leave
 * two nonsense states expressible (drill durations with no drill; a drill
 * with no durations). `drillMode`/`difficulty` live *inside* the drill
 * arm for the same reason -- a plain rest has no difficulty to set.
 *
 * Mirrors assaultBike/types.ts's BikeRest, minus the drill identity the
 * state machine deliberately doesn't know about.
 */
export type RestPlan =
  | { kind: "plain"; restSec: number }
  | {
      kind: "drill";
      settleSec: number;
      drillSec: number;
      resetSec: number;
      drillMode: DrillMode;
      difficulty: Difficulty;
    };

/**
 * ARCHITECTURE.md's original list also named a flat `restSec` alongside
 * the rest breakdown, but never gave it a purpose distinct from that
 * breakdown's own sub-durations; dropped as redundant rather than
 * carrying an unused field that could drift out of sync -- see
 * PROJECT_FACTS.md. **No bike hardware integration, and nothing
 * persisted** -- both still confirmed scope limits (Phase 12 adds a live
 * score and an end-of-session summary, but they're in-memory only and
 * gone once the screen unmounts; no storage, no backend).
 *
 * Deliberately carries no `protocol` discriminant naming which of the
 * four it is -- the template's own `name` already says, and a second
 * source of truth for the same fact is what this file keeps avoiding.
 */
export interface AssaultBikeConfig {
  roundsTarget: number;
  workSec: number;
  rest: RestPlan;
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
