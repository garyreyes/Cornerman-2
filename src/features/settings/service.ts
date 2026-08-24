import * as Crypto from "expo-crypto";

import { getItem, setItem } from "../../lib/storage";
import type { Preset, Punch, Settings } from "./types";

const SETTINGS_KEY = "settings";
const PUNCHES_KEY = "punches";
const PRESETS_KEY = "presets";

export class LastPunchError extends Error {}

export function createDefaultSettings(): Settings {
  return {
    rounds: 10,
    workDurationSec: 180,
    restDurationSec: 60,
    warmupDurationSec: 0,
    mode: "random",
    activePresetId: null,
    comboGapMinSec: 1.5,
    comboGapMaxSec: 3,
    comboLengthMin: 2,
    comboLengthMax: 4,
    randomPunchPool: null,
    speechRate: 1.0,
    appVolume: 1.0,
    announceStyle: "name",
    defenseCuesEnabled: true,
    defenseCueGapMinSec: 15,
    defenseCueGapMaxSec: 30,
  };
}

/**
 * Lead/rear naming (not left/right) so a punch name stays correct if the
 * user switches stance mid-session -- "Right Hook" means a different
 * physical punch in orthodox vs southpaw, "Rear Hook" never does.
 * Body Hook is num 7, not interleaved into 1-6, so the traditional
 * boxing 1-6 numbering (used by the number announce-style) stays intact.
 */
export function createDefaultPunches(): Punch[] {
  return [
    { id: Crypto.randomUUID(), num: 1, name: "Jab" },
    { id: Crypto.randomUUID(), num: 2, name: "Cross" },
    { id: Crypto.randomUUID(), num: 3, name: "Lead Hook" },
    { id: Crypto.randomUUID(), num: 4, name: "Rear Hook" },
    { id: Crypto.randomUUID(), num: 5, name: "Lead Uppercut" },
    { id: Crypto.randomUUID(), num: 6, name: "Rear Uppercut" },
    { id: Crypto.randomUUID(), num: 7, name: "Body Hook" },
  ];
}

export function getSettings(): Settings {
  const stored = getItem<Partial<Settings>>(SETTINGS_KEY);
  return Object.assign(createDefaultSettings(), stored ?? {});
}

export function saveSettings(settings: Settings): void {
  setItem(SETTINGS_KEY, settings);
}

export function getPunches(): Punch[] {
  const stored = getItem<Punch[]>(PUNCHES_KEY);
  if (stored === undefined) {
    const defaults = createDefaultPunches();
    setItem(PUNCHES_KEY, defaults);
    return defaults;
  }
  return stored;
}

function savePunches(punches: Punch[]): void {
  setItem(PUNCHES_KEY, punches);
}

export function createPunch(name: string, num: number): Punch {
  const punch: Punch = { id: Crypto.randomUUID(), num, name };
  savePunches([...getPunches(), punch]);
  return punch;
}

export function renamePunch(id: string, name: string): void {
  savePunches(getPunches().map((p) => (p.id === id ? { ...p, name } : p)));
}

export function deletePunch(id: string): void {
  const punches = getPunches();
  if (punches.length <= 1) {
    throw new LastPunchError("At least one punch is required");
  }
  savePunches(punches.filter((p) => p.id !== id));
}

export function getPresets(): Preset[] {
  return getItem<Preset[]>(PRESETS_KEY) ?? [];
}

function savePresets(presets: Preset[]): void {
  setItem(PRESETS_KEY, presets);
}

export function createPreset(name: string, sequence: number[]): Preset {
  const preset: Preset = { id: Crypto.randomUUID(), name, sequence };
  savePresets([...getPresets(), preset]);
  return preset;
}

export function updatePreset(id: string, name: string, sequence: number[]): void {
  savePresets(
    getPresets().map((p) => (p.id === id ? { ...p, name, sequence } : p)),
  );
}

export function deletePreset(id: string): void {
  savePresets(getPresets().filter((p) => p.id !== id));
}
