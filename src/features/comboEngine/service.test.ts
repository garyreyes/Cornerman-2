import { createDefaultSettings } from "../settings/service";
import type { Preset, Punch, Settings } from "../settings/types";
import {
  generateCombo,
  generatePresetCombo,
  generateRandomCombo,
  resolveAnnounceText,
  resolvePunchName,
} from "./service";

const punches: Punch[] = [
  { id: "p1", num: 1, name: "Jab" },
  { id: "p2", num: 2, name: "Cross" },
  { id: "p3", num: 3, name: "Left Hook" },
  { id: "p4", num: 4, name: "Right Hook" },
];

describe("resolvePunchName", () => {
  test("resolves a live punch number to its current name", () => {
    expect(resolvePunchName(punches, 2)).toEqual({ num: 2, name: "Cross" });
  });

  test("falls back to a generic label when the number no longer exists (extraction doc §1.5)", () => {
    expect(resolvePunchName(punches, 99)).toEqual({ num: 99, name: "Punch 99" });
  });
});

describe("resolveAnnounceText -- announceStyle: name vs number (Phase 5d)", () => {
  test("\"name\" style returns the punch's name regardless of num", () => {
    expect(resolveAnnounceText({ num: 4, name: "Rear Hook" }, "name")).toBe("Rear Hook");
  });

  test("\"number\" style maps 1-6 to their bundled word-spelled form, not the numeral", () => {
    expect(resolveAnnounceText({ num: 1, name: "Jab" }, "number")).toBe("one");
    expect(resolveAnnounceText({ num: 6, name: "Rear Uppercut" }, "number")).toBe("six");
  });

  test("\"number\" style falls back to a plain numeral string outside 1-6 (e.g. Body Hook, num 7)", () => {
    expect(resolveAnnounceText({ num: 7, name: "Body Hook" }, "number")).toBe("7");
    expect(resolveAnnounceText({ num: 12, name: "Crescent Kick" }, "number")).toBe("12");
  });
});

describe("generateRandomCombo", () => {
  test("returns a combo whose length is within [comboLengthMin, comboLengthMax]", () => {
    const settings: Settings = { ...createDefaultSettings(), comboLengthMin: 2, comboLengthMax: 4 };
    // random() = 0 -> the shortest possible length, minimizes flakiness of this assertion
    const combo = generateRandomCombo(punches, settings, () => 0);
    expect(combo.length).toBeGreaterThanOrEqual(2);
    expect(combo.length).toBeLessThanOrEqual(4);
  });

  test("respects an exact fixed length when min equals max", () => {
    const settings: Settings = { ...createDefaultSettings(), comboLengthMin: 3, comboLengthMax: 3 };
    const combo = generateRandomCombo(punches, settings, () => 0.5);
    expect(combo).toHaveLength(3);
  });

  test("is deterministic given an injected random source", () => {
    const settings: Settings = { ...createDefaultSettings(), comboLengthMin: 2, comboLengthMax: 2 };
    // random() = 0 always selects the first punch in the effective pool
    const combo = generateRandomCombo(punches, settings, () => 0);
    expect(combo).toEqual([
      { num: 1, name: "Jab" },
      { num: 1, name: "Jab" },
    ]);
  });

  test("only draws from randomPunchPool when set", () => {
    const settings: Settings = {
      ...createDefaultSettings(),
      comboLengthMin: 5,
      comboLengthMax: 5,
      randomPunchPool: [3, 4],
    };
    // random() near 1 always selects the last punch in the effective pool
    const combo = generateRandomCombo(punches, settings, () => 0.999);
    for (const punch of combo) {
      expect([3, 4]).toContain(punch.num);
    }
  });

  test("falls back to the full punch list if the pool no longer matches any current punch", () => {
    const settings: Settings = {
      ...createDefaultSettings(),
      comboLengthMin: 3,
      comboLengthMax: 3,
      randomPunchPool: [999], // references a since-deleted punch number
    };
    const combo = generateRandomCombo(punches, settings, () => 0);
    expect(combo).toHaveLength(3);
    expect(punches.map((p) => p.num)).toContain(combo[0]!.num);
  });
});

describe("generatePresetCombo", () => {
  test("resolves every number in the sequence to its live punch name, in order", () => {
    const preset: Preset = { id: "preset1", name: "1-2-3", sequence: [1, 2, 3] };
    expect(generatePresetCombo(preset, punches)).toEqual([
      { num: 1, name: "Jab" },
      { num: 2, name: "Cross" },
      { num: 3, name: "Left Hook" },
    ]);
  });

  test("falls back to a generic label for a deleted punch number rather than erroring", () => {
    const preset: Preset = { id: "preset2", name: "Old combo", sequence: [1, 42] };
    expect(generatePresetCombo(preset, punches)).toEqual([
      { num: 1, name: "Jab" },
      { num: 42, name: "Punch 42" },
    ]);
  });
});

describe("generateCombo -- shared shape contract regardless of mode (extraction doc §1.4)", () => {
  test("random mode produces the same Array<{num,name}> shape as preset mode", () => {
    const randomSettings: Settings = { ...createDefaultSettings(), mode: "random" };
    const randomCombo = generateCombo(randomSettings, punches, [], () => 0);

    const preset: Preset = { id: "preset1", name: "1-2", sequence: [1, 2] };
    const presetSettings: Settings = { ...createDefaultSettings(), mode: "preset", activePresetId: "preset1" };
    const presetCombo = generateCombo(presetSettings, punches, [preset]);

    for (const combo of [randomCombo, presetCombo]) {
      for (const punch of combo) {
        expect(punch).toEqual(expect.objectContaining({ num: expect.any(Number), name: expect.any(String) }));
      }
    }
  });

  test("preset mode returns the active preset's resolved sequence", () => {
    const preset: Preset = { id: "preset1", name: "1-2", sequence: [1, 2] };
    const settings: Settings = { ...createDefaultSettings(), mode: "preset", activePresetId: "preset1" };
    expect(generateCombo(settings, punches, [preset])).toEqual([
      { num: 1, name: "Jab" },
      { num: 2, name: "Cross" },
    ]);
  });

  test("preset mode with no matching active preset degrades to a random combo rather than returning nothing", () => {
    const settings: Settings = {
      ...createDefaultSettings(),
      mode: "preset",
      activePresetId: "does-not-exist",
      comboLengthMin: 2,
      comboLengthMax: 2,
    };
    const combo = generateCombo(settings, punches, [], () => 0);
    expect(combo).toHaveLength(2);
  });
});
