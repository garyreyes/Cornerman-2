import { createDefaultSettings, createDefaultPunches, createPreset } from "../settings/service";
import type { Punch, Settings } from "../settings/types";
import { clearAll } from "../../lib/storage";
import {
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  getWorkoutTemplates,
  resolveRoundCombo,
  toTimerConfig,
  updateWorkoutTemplate,
} from "./service";
import type { BoxingConfig, ComboSource } from "./types";

beforeEach(() => {
  clearAll();
});

const punches: Punch[] = createDefaultPunches();
const settings: Settings = createDefaultSettings();

function uniformConfig(): BoxingConfig {
  return {
    baseWorkDurationSec: 180,
    baseRestDurationSec: 60,
    warmupDurationSec: 0,
    baseComboGapMinSec: 1.5,
    baseComboGapMaxSec: 3,
    roundPlan: [{ comboSource: { type: "random" } }],
  };
}

describe("built-in workout templates", () => {
  test("getWorkoutTemplates seeds exactly the 3 boxing built-ins on first read", () => {
    const templates = getWorkoutTemplates();
    expect(templates).toHaveLength(3);
    expect(templates.every((t) => t.isBuiltIn)).toBe(true);
    expect(templates.every((t) => t.workoutType === "boxing")).toBe(true);
    expect(templates.map((t) => t.name)).toEqual(["Relax / Zone-2", "Moderate", "Intense"]);
  });

  test("seeded built-ins persist -- a second read returns the same rows, not freshly regenerated ones", () => {
    const first = getWorkoutTemplates();
    const second = getWorkoutTemplates();
    expect(second).toEqual(first);
  });
});

describe("workout template CRUD", () => {
  test("createWorkoutTemplate adds a non-built-in template alongside the seeded built-ins", () => {
    const before = getWorkoutTemplates();
    const created = createWorkoutTemplate("My Template", uniformConfig());

    expect(created.isBuiltIn).toBe(false);
    expect(getWorkoutTemplates()).toEqual([...before, created]);
  });

  test("updateWorkoutTemplate replaces name and config by id, leaving other templates untouched", () => {
    const created = createWorkoutTemplate("Draft", uniformConfig());
    const newConfig = { ...uniformConfig(), baseWorkDurationSec: 120 };

    updateWorkoutTemplate(created.id, "Final", newConfig);

    const updated = getWorkoutTemplates().find((t) => t.id === created.id);
    expect(updated?.name).toBe("Final");
    expect(updated?.config).toEqual(newConfig);
  });

  test("deleteWorkoutTemplate removes a template by id with no built-in protection", () => {
    const builtIns = getWorkoutTemplates();
    const created = createWorkoutTemplate("Temp", uniformConfig());

    // Deleting a built-in is allowed -- ARCHITECTURE.md: "ordinary editable
    // rows, not specially locked".
    deleteWorkoutTemplate(builtIns[0]!.id);
    deleteWorkoutTemplate(created.id);

    const remaining = getWorkoutTemplates();
    expect(remaining).toHaveLength(2);
    expect(remaining.find((t) => t.id === builtIns[0]!.id)).toBeUndefined();
    expect(remaining.find((t) => t.id === created.id)).toBeUndefined();
  });
});

describe("resolveRoundCombo", () => {
  test("fixed-punch always returns that one punch, resolved to its live name", () => {
    const source: ComboSource = { type: "fixed-punch", punchNum: 1 };
    const combo = resolveRoundCombo(source, punches, [], settings);
    expect(combo).toEqual([{ num: 1, name: "Jab" }]);
  });

  test("fixed-sequence resolves every number in order, same as a Preset's sequence", () => {
    const source: ComboSource = { type: "fixed-sequence", sequence: [1, 2, 3] };
    const combo = resolveRoundCombo(source, punches, [], settings);
    expect(combo).toEqual([
      { num: 1, name: "Jab" },
      { num: 2, name: "Cross" },
      { num: 3, name: "Lead Hook" },
    ]);
  });

  test("preset draws from the referenced saved Preset by id", () => {
    const preset = createPreset("1-2", [1, 2]);
    const source: ComboSource = { type: "preset", presetId: preset.id };
    const combo = resolveRoundCombo(source, punches, [preset], settings);
    expect(combo).toEqual([
      { num: 1, name: "Jab" },
      { num: 2, name: "Cross" },
    ]);
  });

  test("preset with an id matching nothing degrades to a random combo rather than crashing or returning empty", () => {
    const source: ComboSource = { type: "preset", presetId: "does-not-exist" };
    const combo = resolveRoundCombo(source, punches, [], settings, () => 0);
    expect(combo.length).toBeGreaterThan(0);
  });

  test("random with no punchPool override draws from Settings' own randomPunchPool/comboLength range", () => {
    const source: ComboSource = { type: "random" };
    // random()=0 always picks index 0 of whatever pool is in play, and the
    // minimum comboLength, making this deterministic.
    const combo = resolveRoundCombo(source, punches, [], settings, () => 0);
    expect(combo).toHaveLength(settings.comboLengthMin);
    expect(combo.every((p) => p.num === punches[0]!.num)).toBe(true);
  });

  test("random with a per-round punchPool override restricts the draw to just that pool, not Settings' pool", () => {
    const source: ComboSource = { type: "random", punchPool: [3] };
    const combo = resolveRoundCombo(source, punches, [], settings, () => 0);
    expect(combo.every((p) => p.num === 3)).toBe(true);
  });
});

describe("toTimerConfig (Phase 10d: driving the timer engine from a BoxingConfig)", () => {
  test("totalRounds/base durations come straight from the config, in ms", () => {
    const config: BoxingConfig = {
      baseWorkDurationSec: 120,
      baseRestDurationSec: 30,
      warmupDurationSec: 15,
      baseComboGapMinSec: 1,
      baseComboGapMaxSec: 2,
      roundPlan: [{ comboSource: { type: "random" } }, { comboSource: { type: "random" } }],
    };

    const timerConfig = toTimerConfig(config);

    expect(timerConfig).toEqual({
      totalRounds: 2,
      workDurationMs: 120_000,
      restDurationMs: 30_000,
      warmupDurationMs: 15_000,
      roundOverrides: [{ workDurationMs: undefined, restDurationMs: undefined }, { workDurationMs: undefined, restDurationMs: undefined }],
    });
  });

  test("a round's own workDurationSec/restDurationSec become that round's ms override", () => {
    const config: BoxingConfig = {
      baseWorkDurationSec: 120,
      baseRestDurationSec: 30,
      warmupDurationSec: 0,
      baseComboGapMinSec: 1,
      baseComboGapMaxSec: 2,
      roundPlan: [
        { comboSource: { type: "random" }, workDurationSec: 45 },
        { comboSource: { type: "random" }, restDurationSec: 90 },
      ],
    };

    const timerConfig = toTimerConfig(config);

    expect(timerConfig.roundOverrides![0]).toEqual({ workDurationMs: 45_000, restDurationMs: undefined });
    expect(timerConfig.roundOverrides![1]).toEqual({ workDurationMs: undefined, restDurationMs: 90_000 });
  });

  test("round count matches roundPlan.length exactly, even for a single-round template", () => {
    const config: BoxingConfig = {
      baseWorkDurationSec: 60,
      baseRestDurationSec: 15,
      warmupDurationSec: 0,
      baseComboGapMinSec: 1,
      baseComboGapMaxSec: 2,
      roundPlan: [{ comboSource: { type: "random" } }],
    };

    expect(toTimerConfig(config).totalRounds).toBe(1);
  });
});
