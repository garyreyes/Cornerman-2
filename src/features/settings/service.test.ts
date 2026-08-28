import { clearAll, setItem } from "../../lib/storage";
import {
  createDefaultPunches,
  createDefaultSettings,
  PUNCH_ONLY_POOL,
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
  renamePunch,
  renumberPunch,
  restoreDefaultPunches,
  restorePreset,
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
    expect(settings.randomPunchPool).toEqual(PUNCH_ONLY_POOL);
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
  test("seeds the orthodox 1-9 punches (lead/rear naming) then the 12 kicks on first read", () => {
    const punches = getPunches();
    expect(punches.map((p) => [p.num, p.name])).toEqual([
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
    ]);
  });

  test("a fresh install's random pool is the punches only -- kicks exist but are never drawn until opted in", () => {
    expect(createDefaultSettings().randomPunchPool).toEqual(PUNCH_ONLY_POOL);
    expect(PUNCH_ONLY_POOL).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("punches -- appending kicks to an install that predates them", () => {
  /** An install from before kicks existed: the old 1-7 punch list, and the
   * old `null` pool meaning "draw from every punch I have". */
  function seedLegacyInstall(): void {
    setItem("punches", [
      { id: "a", num: 1, name: "Jab" },
      { id: "b", num: 2, name: "Cross" },
      { id: "c", num: 3, name: "Lead Hook" },
      { id: "d", num: 4, name: "Rear Hook" },
      { id: "e", num: 5, name: "Lead Uppercut" },
      { id: "f", num: 6, name: "Rear Uppercut" },
      { id: "g", num: 7, name: "Body Hook" },
    ]);
    saveSettings({ ...createDefaultSettings(), randomPunchPool: null });
  }

  test("appends the missing body shots and kicks, keeping the existing punches' own ids", () => {
    seedLegacyInstall();
    const after = getPunches();
    expect(after).toHaveLength(21);
    expect(after.find((p) => p.num === 1)!.id).toBe("a");
    expect(after.map((p) => p.name)).toContain("Rear Calf Kick");
  });

  test("pins the pool to what they already had, so Random mode does not suddenly start calling head kicks", () => {
    seedLegacyInstall();
    getPunches();
    expect(getSettings().randomPunchPool).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test("runs exactly once -- a kick deleted afterwards stays deleted", () => {
    seedLegacyInstall();
    const kick = getPunches().find((p) => p.name === "Rear High Kick")!;
    deletePunch(kick.id);
    expect(getPunches().some((p) => p.name === "Rear High Kick")).toBe(false);
  });

  test("the pinned pool is deduped -- punch numbers are allowed to repeat", () => {
    setItem("punches", [
      { id: "a", num: 1, name: "Jab" },
      { id: "b", num: 1, name: "Stiff Jab" },
      { id: "c", num: 2, name: "Cross" },
    ]);
    saveSettings({ ...createDefaultSettings(), randomPunchPool: null });

    getPunches();

    expect(getSettings().randomPunchPool).toEqual([1, 2]);
  });

  test("leaves a pool the user had already restricted exactly as they set it", () => {
    seedLegacyInstall();
    saveSettings({ ...getSettings(), randomPunchPool: [1, 2] });
    getPunches();
    expect(getSettings().randomPunchPool).toEqual([1, 2]);
  });

  test("a punch created later still joins the pool, so only the seeded kicks start out excluded", () => {
    const created = createPunch("Superman Punch", 30);
    expect(getSettings().randomPunchPool).toContain(created.num);
  });
});

describe("punches -- editing", () => {

  test("punch numbers are not required to be unique", () => {
    const first = createPunch("Body Shot", 3);
    const second = createPunch("Liver Shot", 3);
    expect(first.num).toBe(second.num);
    expect(first.id).not.toBe(second.id);
  });

  test("createPunch capitalizes each word of the name, matching the seeded defaults' Title Case", () => {
    expect(createPunch("jab", 99).name).toBe("Jab");
    expect(createPunch("lead hook", 99).name).toBe("Lead Hook");
    expect(createPunch("  crescent kick  ", 99).name).toBe("Crescent Kick");
  });

  test("createPunch leaves an already-uppercase word's own casing alone -- only the first letter is forced, never lowercased", () => {
    expect(createPunch("MMA style", 99).name).toBe("MMA Style");
  });

  test("renamePunch capitalizes the new name the same way createPunch does", () => {
    const punch = createPunch("Jab", 1);
    renamePunch(punch.id, "superman punch");
    expect(getPunches().find((p) => p.id === punch.id)?.name).toBe("Superman Punch");
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

  test("restoreDefaultPunches discards custom punches and resets to the full factory list", () => {
    createPunch("Superman Punch", 99);
    deletePunch(getPunches()[0]!.id);

    const restored = restoreDefaultPunches();

    expect(restored.map((p) => [p.num, p.name])).toEqual(
      createDefaultPunches().map((p) => [p.num, p.name]),
    );
    expect(restored.map((p) => p.num)).toEqual([...Array(21).keys()].map((i) => i + 1));
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
    // `null` is no longer the default pool (kicks ship excluded), but it is
    // still reachable -- both for an install predating them and via the
    // collapse-back below -- so this path still has to work.
    saveSettings({ ...getSettings(), randomPunchPool: null });
    const nums = getPunches().map((p) => p.num);

    toggleRandomPoolMembership(1);

    expect(getSettings().randomPunchPool).toEqual(nums.filter((n) => n !== 1));
  });

  test("toggleRandomPoolMembership: re-including the last excluded punch collapses back to null", () => {
    saveSettings({ ...getSettings(), randomPunchPool: null });
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

  test("restorePreset brings a deleted preset back at its original position", () => {
    const first = createPreset("Combo A", [1, 2]);
    const second = createPreset("Combo B", [3, 4]);
    const before = getPresets();

    deletePreset(first.id);
    expect(getPresets()).toEqual([second]);

    restorePreset(first, 0);
    expect(getPresets()).toEqual(before);
  });
});
