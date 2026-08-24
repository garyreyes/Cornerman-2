import { createDefaultSettings } from "../settings/service";
import type { Settings } from "../settings/types";
import { DEFENSE_CUES, nextDefenseCueFireTime, pickDefenseCue } from "./service";

describe("pickDefenseCue", () => {
  test("random() = 0 picks the first cue in the fixed set", () => {
    expect(pickDefenseCue(() => 0)).toBe(DEFENSE_CUES[0]);
  });

  test("random() near 1 picks the last cue in the fixed set", () => {
    expect(pickDefenseCue(() => 0.999)).toBe(DEFENSE_CUES[DEFENSE_CUES.length - 1]);
  });

  test("always returns one of the 6 bundled defense/movement words", () => {
    for (const r of [0, 0.1, 0.5, 0.83, 0.999]) {
      expect(DEFENSE_CUES).toContain(pickDefenseCue(() => r));
    }
  });

  test("is deterministic given an injected random source", () => {
    expect(pickDefenseCue(() => 0.4)).toBe(pickDefenseCue(() => 0.4));
  });
});

describe("nextDefenseCueFireTime", () => {
  test("clamps to settings.defenseCueGapMinSec when random() returns 0", () => {
    const settings: Settings = { ...createDefaultSettings(), defenseCueGapMinSec: 15, defenseCueGapMaxSec: 30 };
    expect(nextDefenseCueFireTime(1_000_000, settings, () => 0)).toBe(1_000_000 + 15_000);
  });

  test("clamps to settings.defenseCueGapMaxSec when random() returns 1", () => {
    const settings: Settings = { ...createDefaultSettings(), defenseCueGapMinSec: 15, defenseCueGapMaxSec: 30 };
    expect(nextDefenseCueFireTime(1_000_000, settings, () => 1)).toBe(1_000_000 + 30_000);
  });

  test("respects a custom gap range, not a hardcoded one", () => {
    const settings: Settings = { ...createDefaultSettings(), defenseCueGapMinSec: 5, defenseCueGapMaxSec: 10 };
    expect(nextDefenseCueFireTime(1_000_000, settings, () => 0)).toBe(1_000_000 + 5_000);
    expect(nextDefenseCueFireTime(1_000_000, settings, () => 1)).toBe(1_000_000 + 10_000);
  });
});
