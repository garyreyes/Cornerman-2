import type { Preset, Punch, Settings } from "../settings/types";
import type { Combo, ComboPunch, RandomFn } from "./types";

/**
 * Resolves a punch number to its current live name. Falls back to a
 * generic label when the number no longer matches any existing punch
 * (extraction doc §1.5) -- never errors, matching the rest of the app's
 * graceful-fallback pattern.
 */
export function resolvePunchName(punches: Punch[], num: number): ComboPunch {
  const found = punches.find((p) => p.num === num);
  return found ? { num: found.num, name: found.name } : { num, name: `Punch ${num}` };
}

function effectivePool(punches: Punch[], pool: number[] | null): Punch[] {
  if (pool === null) return punches;
  const filtered = punches.filter((p) => pool.includes(p.num));
  // If the configured pool no longer matches any current punch (e.g. every
  // referenced number was since deleted), degrade to the full list rather
  // than generating an empty/broken combo.
  return filtered.length > 0 ? filtered : punches;
}

export function generateRandomCombo(punches: Punch[], settings: Settings, random: RandomFn = Math.random): Combo {
  const pool = effectivePool(punches, settings.randomPunchPool);
  const lengthRange = settings.comboLengthMax - settings.comboLengthMin + 1;
  const length = settings.comboLengthMin + Math.floor(random() * lengthRange);

  const combo: Combo = [];
  for (let i = 0; i < length; i++) {
    const punch = pool[Math.floor(random() * pool.length)]!;
    combo.push({ num: punch.num, name: punch.name });
  }
  return combo;
}

export function generatePresetCombo(preset: Preset, punches: Punch[]): Combo {
  return preset.sequence.map((num) => resolvePunchName(punches, num));
}

/**
 * Random and preset generation return the identical Array<{num,name}>
 * shape (extraction doc §1.4) -- callers never need to know which mode
 * produced a combo.
 */
export function generateCombo(
  settings: Settings,
  punches: Punch[],
  presets: Preset[],
  random: RandomFn = Math.random,
): Combo {
  if (settings.mode === "preset") {
    const preset = presets.find((p) => p.id === settings.activePresetId);
    if (preset) {
      return generatePresetCombo(preset, punches);
    }
    // No valid active preset selected -- degrade to a random combo rather
    // than returning nothing, same graceful-fallback spirit as elsewhere.
  }
  return generateRandomCombo(punches, settings, random);
}
