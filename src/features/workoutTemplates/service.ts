import * as Crypto from "expo-crypto";

import type { BikeConfig } from "../assaultBike/types";
import { generatePresetCombo, generateRandomCombo, resolvePunchName } from "../comboEngine/service";
import type { Combo, RandomFn } from "../comboEngine/types";
import { getItem, setItem } from "../../lib/storage";
import type { Preset, Punch, Settings } from "../settings/types";
import type { RoundOverride, TimerConfig } from "../timer/types";
import type { AssaultBikeConfig, BoxingConfig, ComboSource, RoundConfig, WorkoutTemplate } from "./types";

const WORKOUT_TEMPLATES_KEY = "workoutTemplates";

function uniformRoundPlan(rounds: number): RoundConfig[] {
  return Array.from({ length: rounds }, () => ({ comboSource: { type: "random" } as const }));
}

/**
 * The three boxing templates' pace/round-count defaults are chosen for a
 * plausible training feel, not sourced from any spec (PRD/ARCHITECTURE
 * name the four templates but not their numbers) -- easy to retune once
 * felt on a real device, same spirit as 4a's placeholder-then-sourced
 * audio. The fourth (Assault Bike Cognitive) is real, per-figure sourced
 * from docs/user-flows.md Flow 7 -- see createBuiltInAssaultBikeConfig.
 */
export function createBuiltInWorkoutTemplates(): WorkoutTemplate[] {
  return [
    {
      id: Crypto.randomUUID(),
      name: "Relax / Zone-2",
      isBuiltIn: true,
      workoutType: "boxing",
      config: {
        baseWorkDurationSec: 180,
        baseRestDurationSec: 90,
        warmupDurationSec: 60,
        baseComboGapMinSec: 3,
        baseComboGapMaxSec: 5,
        roundPlan: uniformRoundPlan(6),
      },
    },
    {
      id: Crypto.randomUUID(),
      name: "Moderate",
      isBuiltIn: true,
      workoutType: "boxing",
      config: {
        baseWorkDurationSec: 180,
        baseRestDurationSec: 60,
        warmupDurationSec: 60,
        baseComboGapMinSec: 2,
        baseComboGapMaxSec: 3.5,
        roundPlan: uniformRoundPlan(8),
      },
    },
    {
      id: Crypto.randomUUID(),
      name: "Intense",
      isBuiltIn: true,
      workoutType: "boxing",
      config: {
        baseWorkDurationSec: 180,
        baseRestDurationSec: 45,
        warmupDurationSec: 60,
        baseComboGapMinSec: 1,
        baseComboGapMaxSec: 2,
        roundPlan: uniformRoundPlan(12),
      },
    },
    {
      id: Crypto.randomUUID(),
      name: "Assault Bike Cognitive",
      isBuiltIn: true,
      workoutType: "assault-bike-cognitive",
      config: createBuiltInAssaultBikeConfig(),
    },
  ];
}

/**
 * workSec/restPhases match docs/user-flows.md Flow 7's own stated figures
 * exactly (10s all-out work; 8s settle + 30s drill + 12s reset = the
 * PRD's "50s rest" reference number). roundsTarget/difficulty aren't
 * specified anywhere -- picked plausible HIIT-interval defaults, same
 * spirit as the boxing built-ins' own pace numbers (PROJECT_FACTS.md).
 * drillMode defaults to "visual" (Odd-One-Out, Phase 11c) over
 * "auditory" (Corner Commands, Phase 11d) -- every doc mention names
 * visual first, and it's sequenced first in ROADMAP.md; "mixed" is a
 * real DrillMode value but explicitly deferred, never constructed here.
 */
function createBuiltInAssaultBikeConfig(): AssaultBikeConfig {
  return {
    roundsTarget: 8,
    workSec: 10,
    restPhases: { settleSec: 8, drillSec: 30, resetSec: 12 },
    drillMode: "visual",
    drillType: "odd-one-out",
    difficulty: "medium",
  };
}

/** Seeds the built-ins into storage on first read -- same pattern as
 * getPunches, since ARCHITECTURE.md confirms built-ins are ordinary
 * editable rows a user can modify, not code-level constants. */
export function getWorkoutTemplates(): WorkoutTemplate[] {
  const stored = getItem<WorkoutTemplate[]>(WORKOUT_TEMPLATES_KEY);
  if (stored === undefined) {
    const defaults = createBuiltInWorkoutTemplates();
    setItem(WORKOUT_TEMPLATES_KEY, defaults);
    return defaults;
  }
  return stored;
}

function saveWorkoutTemplates(templates: WorkoutTemplate[]): void {
  setItem(WORKOUT_TEMPLATES_KEY, templates);
}

export function createWorkoutTemplate(name: string, config: BoxingConfig): WorkoutTemplate {
  const template: WorkoutTemplate = { id: Crypto.randomUUID(), name, isBuiltIn: false, workoutType: "boxing", config };
  saveWorkoutTemplates([...getWorkoutTemplates(), template]);
  return template;
}

/** Boxing only -- guarded by `t.workoutType === "boxing"`, not just the id
 * match. Without it, `{ ...t, name, config }` could merge a BoxingConfig
 * into an assault-bike template's entry if this were ever called with
 * its id (nothing does today -- the Round Builder is guarded to boxing
 * templates -- but the function itself wasn't type-safe against the
 * misuse; TypeScript caught this for real once WorkoutTemplate became a
 * discriminated union, see PROJECT_FACTS.md). A ***non***-matching id
 * still leaves every other entry, of either workoutType, untouched. */
export function updateWorkoutTemplate(id: string, name: string, config: BoxingConfig): void {
  saveWorkoutTemplates(
    getWorkoutTemplates().map((t) => (t.id === id && t.workoutType === "boxing" ? { ...t, name, config } : t)),
  );
}

/** No built-in protection -- ARCHITECTURE.md: built-ins are "ordinary
 * editable rows, not specially locked". */
export function deleteWorkoutTemplate(id: string): void {
  saveWorkoutTemplates(getWorkoutTemplates().filter((t) => t.id !== id));
}

/**
 * Resolves one round's comboSource to an actual Combo. Deliberately kept
 * out of comboEngine/service.ts (mirrors how defenseCues stayed a sibling
 * feature rather than merging in) -- this calls comboEngine's existing
 * exported functions rather than duplicating their logic. "random" reuses
 * Settings' own comboLengthMin/Max range; a per-round punchPool override
 * is layered on by overriding just that one field, not by duplicating
 * generateRandomCombo's pool/length logic.
 */
export function resolveRoundCombo(
  source: ComboSource,
  punches: Punch[],
  presets: Preset[],
  settings: Settings,
  random: RandomFn = Math.random,
): Combo {
  switch (source.type) {
    case "fixed-punch":
      return [resolvePunchName(punches, source.punchNum)];
    case "fixed-sequence":
      return source.sequence.map((num) => resolvePunchName(punches, num));
    case "preset": {
      const preset = presets.find((p) => p.id === source.presetId);
      if (preset) {
        return generatePresetCombo(preset, punches);
      }
      // No matching preset (e.g. it was since deleted) -- degrade to a
      // random combo rather than crashing or returning an empty round,
      // same graceful-fallback spirit as comboEngine.generateCombo.
      return generateRandomCombo(punches, settings, random);
    }
    case "random":
      return generateRandomCombo(
        punches,
        source.punchPool ? { ...settings, randomPunchPool: source.punchPool } : settings,
        random,
      );
  }
}

/**
 * Converts a template's BoxingConfig into the timer engine's own
 * TimerConfig, in ms -- the Phase 10d sibling to useSession.ts's own
 * `toTimerConfig(settings: Settings)` for quick-start. `totalRounds`
 * comes straight from `roundPlan.length` (a template's round count *is*
 * its round list, not a separate field to keep in sync). Each round's
 * optional workDurationSec/restDurationSec becomes that round's ms
 * override; a round with neither set produces an all-undefined entry,
 * which timer/service.ts's effectiveWorkDurationMs/effectiveRestDurationMs
 * already treat identically to a missing entry.
 */
export function toTimerConfig(config: BoxingConfig): TimerConfig {
  const roundOverrides: RoundOverride[] = config.roundPlan.map((round) => ({
    workDurationMs: round.workDurationSec !== undefined ? round.workDurationSec * 1000 : undefined,
    restDurationMs: round.restDurationSec !== undefined ? round.restDurationSec * 1000 : undefined,
  }));
  return {
    totalRounds: config.roundPlan.length,
    workDurationMs: config.baseWorkDurationSec * 1000,
    restDurationMs: config.baseRestDurationSec * 1000,
    warmupDurationMs: config.warmupDurationSec * 1000,
    roundOverrides,
  };
}

/**
 * Flattens AssaultBikeConfig's `restPhases` into assaultBike/service.ts's
 * own BikeConfig shape (Phase 11b) -- the bike state machine stays
 * decoupled from the template entity's exact field layout, same
 * "purely additive, engine doesn't know about the template layer"
 * boundary toTimerConfig above already keeps for the boxing timer.
 * Both sides use seconds (unlike toTimerConfig's ms), so this is a
 * plain reshape, no unit conversion.
 */
export function toBikeConfig(config: AssaultBikeConfig): BikeConfig {
  return {
    roundsTarget: config.roundsTarget,
    workSec: config.workSec,
    settleSec: config.restPhases.settleSec,
    drillSec: config.restPhases.drillSec,
    resetSec: config.restPhases.resetSec,
  };
}
