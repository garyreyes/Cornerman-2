import * as Crypto from "expo-crypto";

import { generatePresetCombo, generateRandomCombo, resolvePunchName } from "../comboEngine/service";
import type { Combo, RandomFn } from "../comboEngine/types";
import { getItem, setItem } from "../../lib/storage";
import type { Preset, Punch, Settings } from "../settings/types";
import type { BoxingConfig, ComboSource, RoundConfig, WorkoutTemplate } from "./types";

const WORKOUT_TEMPLATES_KEY = "workoutTemplates";

function uniformRoundPlan(rounds: number): RoundConfig[] {
  return Array.from({ length: rounds }, () => ({ comboSource: { type: "random" } as const }));
}

/**
 * Pace/round-count defaults chosen for a plausible boxing-training feel,
 * not sourced from any spec (PRD/ARCHITECTURE name the three templates but
 * not their numbers) -- easy to retune once felt on a real device, same
 * spirit as 4a's placeholder-then-sourced audio.
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

export function updateWorkoutTemplate(id: string, name: string, config: BoxingConfig): void {
  saveWorkoutTemplates(getWorkoutTemplates().map((t) => (t.id === id ? { ...t, name, config } : t)));
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
