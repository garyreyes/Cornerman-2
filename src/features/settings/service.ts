import * as Crypto from "expo-crypto";

import { getItem, setItem } from "../../lib/storage";
import { DEFAULT_VOICE } from "../speech/types";
import type { Preset, Punch, Settings } from "./types";

const SETTINGS_KEY = "settings";
const PUNCHES_KEY = "punches";
const PRESETS_KEY = "presets";
/** One-time marker for the body-shot/kick backfill -- see seedExtendedPunchesOnce. */
const EXTENDED_PUNCHES_SEEDED_KEY = "extendedPunchesSeeded";

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
    randomPunchPool: PUNCH_ONLY_POOL,
    speechRate: 1.0,
    appVolume: 1.0,
    announceStyle: "name",
    defenseCuesEnabled: true,
    defenseCueGapMinSec: 15,
    defenseCueGapMaxSec: 30,
    hasCompletedOnboarding: false,
    themeMode: "system",
    ttsVoice: DEFAULT_VOICE,
  };
}

/**
 * Lead/rear naming (not left/right) so a punch name stays correct if the
 * user switches stance mid-session -- "Right Hook" means a different
 * physical punch in orthodox vs southpaw, "Rear Hook" never does.
 * Body Hook is num 7, not interleaved into 1-6, so the traditional
 * boxing 1-6 numbering (used by the number announce-style) stays intact.
 *
 * Every name here resolves to a clip in the bundled voice bank -- pinned
 * by a test in speech/service.test.ts, since a typo would silently fall
 * through to the on-device TTS voice mid-combo instead of failing.
 */
const DEFAULT_PUNCH_NAMES: readonly (readonly [number, string])[] = [
  [1, "Jab"],
  [2, "Cross"],
  [3, "Lead Hook"],
  [4, "Rear Hook"],
  [5, "Lead Uppercut"],
  [6, "Rear Uppercut"],
  [7, "Body Hook"],
  [8, "Body Jab"],
  [9, "Body Cross"],
  [10, "Lead Low Kick"],
  [11, "Rear Low Kick"],
  [12, "Lead Calf Kick"],
  [13, "Rear Calf Kick"],
  [14, "Lead Body Kick"],
  [15, "Rear Body Kick"],
  [16, "Lead High Kick"],
  [17, "Rear High Kick"],
  [18, "Lead Push Kick"],
  [19, "Rear Push Kick"],
  [20, "Lead Inside Kick"],
  [21, "Rear Inside Kick"],
];

/**
 * What Random mode draws from by default: the punches, not the kicks.
 *
 * The kicks are seeded as real punches so the "+ kicks" workout templates
 * can name them and get the bundled voice instead of "punch fourteen" --
 * but a boxing quick-start shouldn't start calling head kicks just
 * because they now exist. Opting one in is the per-row switch already on
 * the Punches screen.
 */
export const PUNCH_ONLY_POOL: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function createDefaultPunches(): Punch[] {
  return DEFAULT_PUNCH_NAMES.map(([num, name]) => ({ id: Crypto.randomUUID(), num, name }));
}

export function getSettings(): Settings {
  const stored = getItem<Partial<Settings>>(SETTINGS_KEY);
  return Object.assign(createDefaultSettings(), stored ?? {});
}

export function saveSettings(settings: Settings): void {
  setItem(SETTINGS_KEY, settings);
}

export function markOnboardingComplete(): void {
  saveSettings({ ...getSettings(), hasCompletedOnboarding: true });
}

/**
 * Body shots and kicks were added to the default punch list after this app
 * had already shipped, so an existing install holds only the original 1-7
 * and would announce "punch fourteen" for any kick a workout template names.
 *
 * `get*` returns stored rows as-is, so this is the migration that gap needs
 * -- but it runs exactly once, tracked by its own key rather than by
 * comparing against the defaults. Comparing would silently resurrect a punch
 * the user had deliberately deleted, every read, forever. It also pins a
 * still-`null` random pool to whatever they already had: `null` means "draw
 * from every punch I have", so without this their boxing quick-start would
 * suddenly start calling head kicks.
 */
function seedExtendedPunchesOnce(stored: Punch[]): Punch[] {
  if (getItem<boolean>(EXTENDED_PUNCHES_SEEDED_KEY) === true) {
    return stored;
  }
  setItem(EXTENDED_PUNCHES_SEEDED_KEY, true);

  const existingNums = stored.map((p) => p.num);
  const missing = DEFAULT_PUNCH_NAMES.filter(([num]) => !existingNums.includes(num)).map(([num, name]) => ({
    id: Crypto.randomUUID(),
    num,
    name,
  }));
  if (missing.length === 0) {
    return stored;
  }

  const settings = getSettings();
  if (settings.randomPunchPool === null) {
    saveSettings({ ...settings, randomPunchPool: existingNums });
  }

  const merged = [...stored, ...missing];
  setItem(PUNCHES_KEY, merged);
  return merged;
}

export function getPunches(): Punch[] {
  const stored = getItem<Punch[]>(PUNCHES_KEY);
  if (stored === undefined) {
    const defaults = createDefaultPunches();
    setItem(PUNCHES_KEY, defaults);
    setItem(EXTENDED_PUNCHES_SEEDED_KEY, true);
    return defaults;
  }
  return seedExtendedPunchesOnce(stored);
}

function savePunches(punches: Punch[]): void {
  setItem(PUNCHES_KEY, punches);
}

/**
 * Capitalizes the first letter of each word without touching the rest --
 * "jab" -> "Jab", "lead hook" -> "Lead Hook", and an already-capitalized
 * acronym like "MMA style" is left alone rather than being forced through
 * a full lowercase-then-titlecase pass. Applied on every punch save
 * (create + rename) so a user-typed name matches the seeded defaults'
 * Title Case convention instead of looking inconsistent next to them --
 * found 2026-08-25 via /impeccable critique (a custom "jab" entry stayed
 * lowercase forever, next to "Cross", "Lead Hook", etc.).
 */
function normalizePunchName(name: string): string {
  return name
    .trim()
    .split(" ")
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * A punch you just created joins the random pool even when the pool is
 * restricted. Without this, the kicks now seeded by default would make
 * every install's pool non-null, so a custom punch would silently never
 * be drawn until the user found the per-row switch -- the seeded kicks
 * are the only thing meant to start out excluded, not the user's own
 * additions. Toggling it back off afterwards still works as before.
 */
export function createPunch(name: string, num: number): Punch {
  const punch: Punch = { id: Crypto.randomUUID(), num, name: normalizePunchName(name) };
  savePunches([...getPunches(), punch]);
  const settings = getSettings();
  if (settings.randomPunchPool !== null && !settings.randomPunchPool.includes(num)) {
    saveSettings({ ...settings, randomPunchPool: [...settings.randomPunchPool, num] });
  }
  return punch;
}

export function renamePunch(id: string, name: string): void {
  const normalized = normalizePunchName(name);
  savePunches(getPunches().map((p) => (p.id === id ? { ...p, name: normalized } : p)));
}

/**
 * Reverses the earlier "numbers stay fixed" decision (extraction doc
 * §1.6) after real on-device use surfaced the actual need: recreating a
 * deleted punch at its original number (e.g. "Jab" back at 1), not just
 * whatever number happens to be next-unused. No uniqueness/positivity
 * check -- `num` was already explicitly allowed to be non-unique and
 * decoupled from name; a Preset referencing a number that moves away from
 * this punch just degrades to `resolvePunchName`'s existing generic
 * `"Punch " + num` fallback rather than breaking.
 */
export function renumberPunch(id: string, num: number): void {
  savePunches(getPunches().map((p) => (p.id === id ? { ...p, num } : p)));
}

export function deletePunch(id: string): void {
  const punches = getPunches();
  if (punches.length <= 1) {
    throw new LastPunchError("At least one punch is required");
  }
  savePunches(punches.filter((p) => p.id !== id));
}

/**
 * Re-inserts a just-deleted punch at (roughly) its original position --
 * backs the Punches screen's "Undo" banner (docs feedback 2026-08-25: a
 * deleted punch previously had no way back). Takes the full punch object
 * rather than reconstructing it, so the restored punch keeps its original
 * `id` -- no functional difference (Presets resolve by `num`, not `id`,
 * per the migration doc), but avoids the appearance of a "new" punch.
 */
export function restorePunch(punch: Punch, index: number): void {
  const punches = getPunches();
  const next = [...punches];
  next.splice(Math.min(index, next.length), 0, punch);
  savePunches(next);
}

/** Resets the punch list back to the 7 factory punches, discarding any
 * custom ones -- the Punches screen's "Restore defaults" escape hatch,
 * for when Undo's short window has already passed. Confirmed destructive
 * via an Alert before this is ever called (see punches.tsx). */
export function restoreDefaultPunches(): Punch[] {
  const defaults = createDefaultPunches();
  savePunches(defaults);
  return defaults;
}

/** `null` means "every current punch is eligible" -- see
 * toggleRandomPoolMembership. */
export function isPunchIncludedInRandomPool(pool: number[] | null, num: number): boolean {
  return pool === null || pool.includes(num);
}

/**
 * Toggles whether `num` is drawn in Random mode. Extends the existing
 * `randomPunchPool` field that Settings > Combinations' "Restrict punch
 * pool" switch + chip picker already own -- a second entry point onto the
 * same field (exposed directly on the Punches screen, confirmed
 * 2026-08-25), not a parallel mechanism. `null` means "every current
 * punch is eligible"; toggling one off for the first time materializes
 * that into an explicit allow-list of everyone else, and toggling the
 * last excluded punch back on collapses the list back to `null` rather
 * than leaving a full-but-explicit array around.
 */
export function toggleRandomPoolMembership(num: number): void {
  const settings = getSettings();
  const punches = getPunches();
  const allNums = Array.from(new Set(punches.map((p) => p.num)));
  const currentPool = settings.randomPunchPool ?? allNums;
  const nextPool = currentPool.includes(num)
    ? currentPool.filter((n) => n !== num)
    : Array.from(new Set([...currentPool, num]));
  const isUnrestricted = allNums.every((n) => nextPool.includes(n));
  saveSettings({ ...settings, randomPunchPool: isUnrestricted ? null : nextPool });
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

/**
 * Re-inserts a just-deleted preset at (roughly) its original position --
 * backs the Presets List screen's "Undo" banner (confirmed 2026-08-25 via
 * /impeccable critique: Presets deletion had no recovery path at all,
 * unlike Punches' own Undo banner added the same day for the same
 * reason). Mirrors restorePunch's exact shape/reasoning.
 */
export function restorePreset(preset: Preset, index: number): void {
  const presets = getPresets();
  const next = [...presets];
  next.splice(Math.min(index, next.length), 0, preset);
  savePresets(next);
}
