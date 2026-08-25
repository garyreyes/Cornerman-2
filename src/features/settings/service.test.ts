import { clearAll } from "../../lib/storage";
import {
  createDefaultSettings,
  createPreset,
  createPunch,
  deletePreset,
  deletePunch,
  getPresets,
  getPunches,
  getSettings,
  isPunchIncludedInRandomPool,
  LastPunchError,
  markOnboardingComplete,
  renumberPunch,
  restoreDefaultPunches,
  restorePunch,
  saveSettings,
  toggleRandomPoolMembership,
} from "./service";

beforeEach(() => {
  clearAll();
});

describe("settings persistence", () => {
  test("returns default settings when nothing has been saved", () => {
    expect(getSettings()).toEqual(createDefaultSettings());
  });

  test("new default fields apply on top of an older saved shape with zero migration code", () => {
    // Simulates an old app version's saved data missing a field the
    // current defaults object has (extraction doc §1.13's proven pattern).
    saveSettings({
      ...createDefaultSettings(),
      speechRate: 2,
    } as ReturnType<typeof createDefaultSettings>);

    const settings = getSettings();
    expect(settings.speechRate).toBe(2);
    // Every other field still resolves from current defaults.
    expect(settings.rounds).toBe(createDefaultSettings().rounds);
  });

  test("combo-length and pool fields default correctly when entirely absent from saved data", () => {
    // Simulates data saved before these fields existed at all (not just
    // one field overridden, per the previous test -- the keys are
    // literally missing, matching a real pre-3a saved settings blob).
    const preExistingShape = {
      rounds: 10,
      workDurationSec: 180,
      restDurationSec: 60,
      warmupDurationSec: 0,
      mode: "random",
      activePresetId: null,
      comboGapMinSec: 1.5,
      comboGapMaxSec: 3,
      speechRate: 1.0,
      appVolume: 1.0,
    };
    saveSettings(preExistingShape as ReturnType<typeof createDefaultSettings>);

    const settings = getSettings();
    expect(settings.comboLengthMin).toBe(2);
    expect(settings.comboLengthMax).toBe(4);
    expect(settings.randomPunchPool).toBeNull();
  });

  test("announceStyle and defense-cue fields default correctly when entirely absent from saved data", () => {
    // Simulates data saved before Phase 5d's fields existed (pre-5d shape,
    // same zero-migration pattern as the previous test).
    const preExistingShape = {
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
    };
    saveSettings(preExistingShape as ReturnType<typeof createDefaultSettings>);

    const settings = getSettings();
    expect(settings.announceStyle).toBe("name");
    expect(settings.defenseCuesEnabled).toBe(true);
    expect(settings.defenseCueGapMinSec).toBe(15);
    expect(settings.defenseCueGapMaxSec).toBe(30);
  });

  test("saved settings round-trip exactly", () => {
    const custom = { ...createDefaultSettings(), rounds: 5, appVolume: 0.5 };
    saveSettings(custom);
    expect(getSettings()).toEqual(custom);
  });

  test("hasCompletedOnboarding defaults to false when entirely absent from saved data", () => {
    // Simulates data saved before Phase 7b's field existed.
    const preExistingShape = {
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
    saveSettings(preExistingShape as ReturnType<typeof createDefaultSettings>);

    expect(getSettings().hasCompletedOnboarding).toBe(false);
  });

  test("markOnboardingComplete persists true and leaves every other field untouched", () => {
    const custom = { ...createDefaultSettings(), rounds: 5 };
    saveSettings(custom);

    markOnboardingComplete();

    expect(getSettings()).toEqual({ ...custom, hasCompletedOnboarding: true });
  });
});

describe("punches", () => {
  test("seeds the standard orthodox 1-7 punches (lead/rear naming) on first read", () => {
    const punches = getPunches();
    expect(punches.map((p) => [p.num, p.name])).toEqual([
      [1, "Jab"],
      [2, "Cross"],
      [3, "Lead Hook"],
      [4, "Rear Hook"],
      [5, "Lead Uppercut"],
      [6, "Rear Uppercut"],
      [7, "Body Hook"],
    ]);
  });

  test("punch numbers are not required to be unique", () => {
    const first = createPunch("Body Shot", 3);
    const second = createPunch("Liver Shot", 3);
    expect(first.num).toBe(second.num);
    expect(first.id).not.toBe(second.id);
  });

  test("refuses to delete the last remaining punch", () => {
    getPunches().forEach((p, i) => {
      if (i > 0) deletePunch(p.id);
    });
    const [last] = getPunches();
    expect(() => deletePunch(last.id)).toThrow(LastPunchError);
    expect(getPunches()).toHaveLength(1);
  });

  test("renumberPunch changes num and persists, leaving name/id untouched", () => {
    const [first] = getPunches();

    renumberPunch(first!.id, 42);

    const updated = getPunches().find((p) => p.id === first!.id);
    expect(updated?.num).toBe(42);
    expect(updated?.name).toBe(first!.name);
    expect(updated?.id).toBe(first!.id);
  });

  test("renumberPunch allows colliding with another punch's number -- num was never required to be unique", () => {
    const [first, second] = getPunches();

    renumberPunch(second!.id, first!.num);

    const nums = getPunches().map((p) => p.num);
    expect(nums.filter((n) => n === first!.num)).toHaveLength(2);
  });

  test("restorePunch brings a deleted punch back at its original position", () => {
    const before = getPunches();
    const target = before[2]!; // "Lead Hook"

    deletePunch(target.id);
    expect(getPunches().map((p) => p.id)).not.toContain(target.id);

    restorePunch(target, 2);
    expect(getPunches()).toEqual(before);
  });

  test("restoreDefaultPunches discards custom punches and resets to the factory 7", () => {
    createPunch("Superman Punch", 99);
    deletePunch(getPunches()[0]!.id);

    const restored = restoreDefaultPunches();

    expect(restored.map((p) => [p.num, p.name])).toEqual([
      [1, "Jab"],
      [2, "Cross"],
      [3, "Lead Hook"],
      [4, "Rear Hook"],
      [5, "Lead Uppercut"],
      [6, "Rear Uppercut"],
      [7, "Body Hook"],
    ]);
    expect(getPunches()).toEqual(restored);
  });

  test("isPunchIncludedInRandomPool: a null pool includes every number", () => {
    expect(isPunchIncludedInRandomPool(null, 1)).toBe(true);
    expect(isPunchIncludedInRandomPool(null, 999)).toBe(true);
  });

  test("isPunchIncludedInRandomPool: a set pool only includes listed numbers", () => {
    expect(isPunchIncludedInRandomPool([1, 2], 1)).toBe(true);
    expect(isPunchIncludedInRandomPool([1, 2], 3)).toBe(false);
  });

  test("toggleRandomPoolMembership: excluding one punch from an unrestricted (null) pool materializes everyone else", () => {
    const nums = getPunches().map((p) => p.num); // [1..7]

    toggleRandomPoolMembership(1);

    expect(getSettings().randomPunchPool).toEqual(nums.filter((n) => n !== 1));
  });

  test("toggleRandomPoolMembership: re-including the last excluded punch collapses back to null", () => {
    toggleRandomPoolMembership(1); // exclude
    expect(getSettings().randomPunchPool).not.toBeNull();

    toggleRandomPoolMembership(1); // re-include

    expect(getSettings().randomPunchPool).toBeNull();
  });

  test("toggleRandomPoolMembership only ever affects the toggled number, not its siblings", () => {
    toggleRandomPoolMembership(1);
    toggleRandomPoolMembership(2);

    const pool = getSettings().randomPunchPool!;
    expect(pool).not.toContain(1);
    expect(pool).not.toContain(2);
    expect(pool).toContain(3);
  });
});

describe("presets", () => {
  test("starts empty", () => {
    expect(getPresets()).toEqual([]);
  });

  test("create, then delete, a preset", () => {
    const preset = createPreset("Combo A", [1, 2, 3]);
    expect(getPresets()).toContainEqual(preset);

    deletePreset(preset.id);
    expect(getPresets()).toEqual([]);
  });
});
