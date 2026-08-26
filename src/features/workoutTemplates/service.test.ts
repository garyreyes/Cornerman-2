import { createDefaultSettings, createDefaultPunches, createPreset } from "../settings/service";
import type { Punch, Settings } from "../settings/types";
import { clearAll, setItem } from "../../lib/storage";
import {
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  getWorkoutTemplates,
  migrateStoredTemplates,
  resolveRoundCombo,
  toTimerConfig,
  updateWorkoutTemplate,
} from "./service";
import type { BoxingConfig, ComboSource, WorkoutTemplate } from "./types";

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
  test("getWorkoutTemplates seeds exactly the 3 boxing built-ins plus the 4 bike protocols on first read", () => {
    const templates = getWorkoutTemplates();
    expect(templates).toHaveLength(7);
    expect(templates.every((t) => t.isBuiltIn)).toBe(true);
    expect(templates.map((t) => t.name)).toEqual([
      "Relax / Zone-2",
      "Moderate",
      "Intense",
      "Bike · Aerobic Power",
      "Bike · Lactic Capacity",
      "Bike · Alactic Power",
      "Bike · Combat Effort",
    ]);
    expect(templates.slice(0, 3).every((t) => t.workoutType === "boxing")).toBe(true);
    expect(templates.slice(3).every((t) => t.workoutType === "assault-bike-cognitive")).toBe(true);
  });

  test("each bike protocol's work/rest/round figures match the reference protocol table", () => {
    const bikes = getWorkoutTemplates().filter((t) => t.workoutType === "assault-bike-cognitive");
    const shape = bikes.map((t) => {
      if (t.workoutType !== "assault-bike-cognitive") throw new Error("unreachable");
      const { rest } = t.config;
      const restSec = rest.kind === "plain" ? rest.restSec : rest.settleSec + rest.drillSec + rest.resetSec;
      return { rounds: t.config.roundsTarget, workSec: t.config.workSec, restSec };
    });

    expect(shape).toEqual([
      { rounds: 4, workSec: 240, restSec: 180 }, // 4 min hard / 3 min easy x4
      { rounds: 8, workSec: 20, restSec: 10 }, //  20s all-out / 10s easy x8
      { rounds: 6, workSec: 10, restSec: 150 }, // 8-10s all-out / 2-3 min full rest x5-6
      { rounds: 12, workSec: 10, restSec: 40 }, // 10s hard / 35-40s easy x10-12
    ]);
  });

  test("Lactic Capacity is the only protocol with no drill -- a 10s rest can't fit the phone-up/phone-down cycle", () => {
    const bikes = getWorkoutTemplates().filter((t) => t.workoutType === "assault-bike-cognitive");
    const kinds = bikes.map((t) => (t.workoutType === "assault-bike-cognitive" ? t.config.rest.kind : "?"));
    expect(kinds).toEqual(["drill", "plain", "drill", "drill"]);
  });

  test("seeded built-ins persist -- a second read returns the same rows, not freshly regenerated ones", () => {
    const first = getWorkoutTemplates();
    const second = getWorkoutTemplates();
    expect(second).toEqual(first);
  });
});

/**
 * Phase 12a reshaped AssaultBikeConfig from `{restPhases, drillMode,
 * drillType, difficulty}` to `{rest: RestPlan}`. Anything already
 * installed has the old shape in MMKV, and getWorkoutTemplates returns
 * stored rows as-is -- so without this, an existing install would hand
 * toBikeConfig a config with no `rest` field at all and break the bike
 * screen. Boxing templates are unaffected (their shape never changed)
 * and must survive untouched, custom ones included.
 */
describe("migrateStoredTemplates -- Phase 11 -> 12 stored-shape change", () => {
  /** Exactly what Phase 11a wrote to storage. */
  const legacyBike = {
    id: "legacy-bike",
    name: "Assault Bike Cognitive",
    isBuiltIn: true,
    workoutType: "assault-bike-cognitive",
    config: {
      roundsTarget: 8,
      workSec: 10,
      restPhases: { settleSec: 8, drillSec: 30, resetSec: 12 },
      drillMode: "visual",
      drillType: "odd-one-out",
      difficulty: "medium",
    },
  } as unknown as WorkoutTemplate;

  const customBoxing: WorkoutTemplate = {
    id: "custom-1",
    name: "My Rounds",
    isBuiltIn: false,
    workoutType: "boxing",
    config: uniformConfig(),
  };

  test("drops a stored bike template still using the old restPhases shape", () => {
    const result = migrateStoredTemplates([legacyBike]);
    expect(result.some((t) => t.id === "legacy-bike")).toBe(false);
  });

  test("re-seeds the four protocols once the stale bike row is gone", () => {
    const result = migrateStoredTemplates([legacyBike]);
    const bikes = result.filter((t) => t.workoutType === "assault-bike-cognitive");
    expect(bikes).toHaveLength(4);
    expect(bikes.every((t) => t.workoutType === "assault-bike-cognitive" && t.config.rest !== undefined)).toBe(true);
  });

  test("never touches boxing templates -- a custom one survives the migration intact", () => {
    const result = migrateStoredTemplates([customBoxing, legacyBike]);
    expect(result.find((t) => t.id === "custom-1")).toEqual(customBoxing);
  });

  test("is a no-op on already-current data -- no duplicate protocols on every read", () => {
    const current = getWorkoutTemplates();
    expect(migrateStoredTemplates(current)).toEqual(current);
    expect(migrateStoredTemplates(migrateStoredTemplates(current))).toEqual(current);
  });

  test("getWorkoutTemplates migrates on read and writes the result back", () => {
    setItem("workoutTemplates", [customBoxing, legacyBike]);

    const first = getWorkoutTemplates();
    expect(first.filter((t) => t.workoutType === "assault-bike-cognitive")).toHaveLength(4);
    expect(first.find((t) => t.id === "custom-1")).toEqual(customBoxing);

    // Persisted, so ids stay stable across reads rather than being
    // regenerated every time the picker mounts.
    expect(getWorkoutTemplates()).toEqual(first);
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

  test("updateWorkoutTemplate never merges a BoxingConfig into a non-boxing template, even if its id somehow matches", () => {
    const bike = getWorkoutTemplates().find((t) => t.workoutType === "assault-bike-cognitive");
    if (bike === undefined) {
      throw new Error("expected the assault-bike built-in to be seeded");
    }

    updateWorkoutTemplate(bike.id, "Hijacked", uniformConfig());

    const stillBike = getWorkoutTemplates().find((t) => t.id === bike.id);
    expect(stillBike).toEqual(bike);
  });

  test("deleteWorkoutTemplate removes a template by id with no built-in protection", () => {
    const builtIns = getWorkoutTemplates();
    const created = createWorkoutTemplate("Temp", uniformConfig());

    // Deleting a built-in is allowed -- ARCHITECTURE.md: "ordinary editable
    // rows, not specially locked".
    deleteWorkoutTemplate(builtIns[0]!.id);
    deleteWorkoutTemplate(created.id);

    const remaining = getWorkoutTemplates();
    // builtIns.length + the 1 created, minus the 2 just deleted -- computed
    // rather than hardcoded so this doesn't silently drift if the seeded
    // built-in count ever changes again.
    expect(remaining).toHaveLength(builtIns.length + 1 - 2);
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
