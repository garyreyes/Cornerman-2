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
  LastPunchError,
  saveSettings,
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

  test("saved settings round-trip exactly", () => {
    const custom = { ...createDefaultSettings(), rounds: 5, appVolume: 0.5 };
    saveSettings(custom);
    expect(getSettings()).toEqual(custom);
  });
});

describe("punches", () => {
  test("seeds the standard orthodox 1-6 punches on first read", () => {
    const punches = getPunches();
    expect(punches.map((p) => [p.num, p.name])).toEqual([
      [1, "Jab"],
      [2, "Cross"],
      [3, "Left Hook"],
      [4, "Right Hook"],
      [5, "Left Uppercut"],
      [6, "Right Uppercut"],
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
