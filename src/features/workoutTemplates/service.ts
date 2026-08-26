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
    ...createBuiltInBikeTemplates(),
  ];
}

/**
 * The four real assault-bike energy-system protocols (Phase 12a),
 * replacing Phase 11's single generic "Assault Bike Cognitive" entry.
 * Work/rest/round figures come from the user's own reference protocol
 * table, not from Flow 7 (whose single 10s/50s example is preserved
 * almost exactly by Combat Effort below).
 *
 * The rest *split* within each drill protocol is ours, and follows one
 * rule the user set explicitly: give generous prep on both sides rather
 * than drilling the whole window -- roughly "pick the phone up, drill,
 * put it down and get set again". Combat Effort's 10/20/10 is that rule
 * stated verbatim; the longer-rest protocols scale the drill up but
 * deliberately leave the remainder as recovery rather than filling it.
 *
 * Lactic Capacity is the one protocol with no drill at all: a 10s easy
 * spin can't fit the phone-up/phone-down cycle, confirmed by the user.
 *
 * Difficulty is "medium" across the board for now -- retunable once
 * these are ridden for real, same spirit as the boxing built-ins' own
 * pace numbers (PROJECT_FACTS.md). Every drill protocol starts on
 * "odd-one-out"; Color Call becomes reachable per-session from the bike
 * screen itself (Phase 12c) rather than by multiplying these rows.
 */
function createBuiltInBikeTemplates(): WorkoutTemplate[] {
  const bike = (name: string, config: AssaultBikeConfig): WorkoutTemplate => ({
    id: Crypto.randomUUID(),
    name,
    isBuiltIn: true,
    workoutType: "assault-bike-cognitive",
    config,
  });

  return [
    // 4 min hard / 3 min easy spin x4 -- HR climbing to 90-95% max by the
    // end of each block.
    bike("Bike · Aerobic Power", {
      roundsTarget: 4,
      workSec: 240,
      rest: { kind: "drill", settleSec: 20, drillSec: 60, resetSec: 100, drillMode: "odd-one-out", difficulty: "medium" },
    }),
    // 20s all-out / 10s easy spin x8 -- max effort every rep, not paced to
    // survive. No drill: 10s is the whole rest.
    bike("Bike · Lactic Capacity", {
      roundsTarget: 8,
      workSec: 20,
      rest: { kind: "plain", restSec: 10 },
    }),
    // 8-10s all-out / 2-3 min FULL rest x5-6 -- every rep should hit the
    // same peak watts, so the rest is genuinely long.
    bike("Bike · Alactic Power", {
      roundsTarget: 6,
      workSec: 10,
      rest: { kind: "drill", settleSec: 20, drillSec: 60, resetSec: 70, drillMode: "odd-one-out", difficulty: "medium" },
    }),
    // 10s hard / 35-40s easy x10-12 -- hard but not a max sprint, mimics
    // burst/reset. This is Flow 7's original example protocol.
    bike("Bike · Combat Effort", {
      roundsTarget: 12,
      workSec: 10,
      rest: { kind: "drill", settleSec: 10, drillSec: 20, resetSec: 10, drillMode: "odd-one-out", difficulty: "medium" },
    }),
  ];
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
 * Narrows AssaultBikeConfig's `rest` into assaultBike/service.ts's own
 * BikeRest (Phase 11b) -- the bike state machine stays decoupled from the
 * template entity's exact field layout, same "engine doesn't know about
 * the template layer" boundary toTimerConfig above already keeps for the
 * boxing timer. Both sides use seconds (unlike toTimerConfig's ms), so
 * this is a plain reshape, no unit conversion.
 *
 * The drop of `drillMode`/`difficulty` here is the whole point, not an
 * omission: the state machine needs the drill phase's *duration* and
 * nothing else about it (Phase 12a). The screen reads those two off the
 * template config directly.
 */
export function toBikeConfig(config: AssaultBikeConfig): BikeConfig {
  const { rest } = config;
  return {
    roundsTarget: config.roundsTarget,
    workSec: config.workSec,
    rest:
      rest.kind === "plain"
        ? { kind: "plain", restSec: rest.restSec }
        : { kind: "drill", settleSec: rest.settleSec, drillSec: rest.drillSec, resetSec: rest.resetSec },
  };
}
