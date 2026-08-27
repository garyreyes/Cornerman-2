import { createDefaultSettings, createDefaultPunches, createPreset } from "../settings/service";
import type { Punch, Settings } from "../settings/types";
import { clearAll, setItem } from "../../lib/storage";
import { estimateComboSpeechMs } from "../../lib/speechTiming";
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
  test("getWorkoutTemplates seeds the 6 boxing built-ins plus the 4 bike protocols on first read", () => {
    const templates = getWorkoutTemplates();
    expect(templates).toHaveLength(10);
    expect(templates.every((t) => t.isBuiltIn)).toBe(true);
    expect(templates.map((t) => t.name)).toEqual([
      "Easy · Punches",
      "Easy · Punches + Kicks",
      "Moderate · Punches",
      "Moderate · Punches + Kicks",
      "Intense · Punches",
      "Intense · Punches + Kicks",
      "Bike · Aerobic Power",
      "Bike · Lactic Capacity",
      "Bike · Alactic Power",
      "Bike · Combat Effort",
    ]);
    expect(templates.slice(0, 6).every((t) => t.workoutType === "boxing")).toBe(true);
    expect(templates.slice(6).every((t) => t.workoutType === "assault-bike-cognitive")).toBe(true);
  });

  describe("the boxing built-ins carry bagwork.md's actual programming", () => {
    function boxing(): Extract<WorkoutTemplate, { workoutType: "boxing" }>[] {
      return getWorkoutTemplates().filter(
        (t): t is Extract<WorkoutTemplate, { workoutType: "boxing" }> => t.workoutType === "boxing",
      );
    }

    test("round count, 2-minute rounds and 60s rest match the template table", () => {
      expect(
        boxing().map((t) => [t.name, t.config.roundPlan.length, t.config.baseWorkDurationSec, t.config.baseRestDurationSec]),
      ).toEqual([
        ["Easy · Punches", 6, 120, 60],
        ["Easy · Punches + Kicks", 6, 120, 60],
        ["Moderate · Punches", 8, 120, 60],
        ["Moderate · Punches + Kicks", 8, 120, 60],
        ["Intense · Punches", 10, 120, 60],
        ["Intense · Punches + Kicks", 10, 120, 60],
      ]);
    });

    test("the gap widens as the template gets easier", () => {
      expect(boxing().map((t) => [t.config.baseComboGapMinSec, t.config.baseComboGapMaxSec])).toEqual([
        [8, 12],
        [8, 12],
        [6, 9],
        [6, 9],
        [4, 6],
        [4, 6],
      ]);
    });

    test("every template's gap leaves time to actually throw its own longest combo", () => {
      // The reported bug -- "I couldn't keep up on the sheer quantity of
      // combos even in easy". The gap is throwing time now (the call-out no
      // longer eats it, see lib/speechTiming.ts), so what has to hold is
      // that it outlasts the combo itself at a brisk ~0.5s per strike.
      const THROW_MS_PER_STRIKE = 500;
      for (const template of boxing()) {
        const longest = Math.max(
          ...template.config.roundPlan.flatMap((r) =>
            r.comboSource.type === "combo-pool" ? r.comboSource.combos.map((c) => c.length) : [0],
          ),
        );
        expect([template.name, template.config.baseComboGapMinSec * 1000 >= longest * THROW_MS_PER_STRIKE]).toEqual([
          template.name,
          true,
        ]);
      }
    });

    test("a call-out can no longer start before the previous one has finished being spoken", () => {
      for (const template of boxing()) {
        expect(template.config.baseComboGapMinSec).toBeGreaterThan(0);
      }
      // The old "Intense" 1-2s gap was measured from when a combo *started*,
      // so a 5-punch call-out (this long) ran straight into the next one.
      expect(estimateComboSpeechMs(5, 1)).toBeGreaterThan(2_000);
    });

    test("every round names its focus and draws from real combos, never an unstructured random draw", () => {
      for (const template of boxing()) {
        for (const round of template.config.roundPlan) {
          expect(round.label).toBeTruthy();
          expect(round.comboSource.type).toBe("combo-pool");
        }
      }
    });

    test("a punches-only template never calls a kick; its kicks counterpart does", () => {
      const kickNums = createDefaultPunches().filter((p) => p.name.includes("Kick")).map((p) => p.num);
      const numsIn = (t: Extract<WorkoutTemplate, { workoutType: "boxing" }>) =>
        t.config.roundPlan.flatMap((r) => (r.comboSource.type === "combo-pool" ? r.comboSource.combos.flat() : []));

      for (const [punchesOnly, withKicks] of [
        [boxing()[0]!, boxing()[1]!],
        [boxing()[2]!, boxing()[3]!],
        [boxing()[4]!, boxing()[5]!],
      ]) {
        expect(numsIn(punchesOnly).some((n) => kickNums.includes(n))).toBe(false);
        expect(numsIn(withKicks).some((n) => kickNums.includes(n))).toBe(true);
      }
    });

    test("every number any built-in calls resolves to a real seeded punch, never a \"Punch 42\" fallback", () => {
      const seeded = createDefaultPunches().map((p) => p.num);
      for (const template of boxing()) {
        for (const round of template.config.roundPlan) {
          if (round.comboSource.type !== "combo-pool") continue;
          for (const num of round.comboSource.combos.flat()) {
            expect([template.name, round.label, num, seeded.includes(num)]).toEqual([
              template.name,
              round.label,
              num,
              true,
            ]);
          }
        }
      }
    });
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

/**
 * The three original boxing built-ins (Relax / Zone-2, Moderate, Intense)
 * called unstructured random punches on every round -- the reason a session
 * felt nothing like the programming it was named after. They are replaced
 * by the six bagwork templates, which is a stored-data change for anyone
 * who has already run the app.
 */
describe("migrateStoredTemplates -- replacing the original random-only boxing built-ins", () => {
  /** Exactly the shape the old built-ins were written in: no round labels,
   * every round a bare random draw. */
  const legacyBoxingBuiltIn: WorkoutTemplate = {
    id: "legacy-moderate",
    name: "Moderate",
    isBuiltIn: true,
    workoutType: "boxing",
    config: {
      baseWorkDurationSec: 180,
      baseRestDurationSec: 60,
      warmupDurationSec: 60,
      baseComboGapMinSec: 2,
      baseComboGapMaxSec: 3.5,
      roundPlan: [{ comboSource: { type: "random" } }, { comboSource: { type: "random" } }],
    },
  };

  const customBoxing: WorkoutTemplate = {
    id: "custom-1",
    name: "My Rounds",
    isBuiltIn: false,
    workoutType: "boxing",
    config: uniformConfig(),
  };

  test("drops the old random-only built-ins and seeds the six bagwork templates", () => {
    const result = migrateStoredTemplates([legacyBoxingBuiltIn]);
    expect(result.some((t) => t.id === "legacy-moderate")).toBe(false);
    expect(result.filter((t) => t.workoutType === "boxing")).toHaveLength(6);
  });

  test("a custom template the user built survives untouched, even though it is also random-only", () => {
    const result = migrateStoredTemplates([customBoxing, legacyBoxingBuiltIn]);
    expect(result.find((t) => t.id === "custom-1")).toEqual(customBoxing);
  });

  test("runs once -- a second read neither duplicates the six nor regenerates their ids", () => {
    setItem("workoutTemplates", [legacyBoxingBuiltIn]);
    const first = getWorkoutTemplates();
    expect(getWorkoutTemplates()).toEqual(first);
    expect(first.filter((t) => t.workoutType === "boxing")).toHaveLength(6);
  });

  test("a built-in the user has since deleted stays deleted", () => {
    const remaining = getWorkoutTemplates().filter((t) => t.name !== "Easy · Punches");
    expect(migrateStoredTemplates(remaining).some((t) => t.name === "Easy · Punches")).toBe(false);
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

  // bagwork.md lists several combos per round (Moderate R3 is both `1-2b-3`
  // and `2-3b-2`), which none of the sources above could express: one fixed
  // sequence, one punch, one preset, or unstructured random.
  describe("combo-pool", () => {
    const source: ComboSource = {
      type: "combo-pool",
      combos: [
        [1, 2],
        [3, 2, 3],
      ],
    };

    test("draws one whole combo from the pool, resolved to live names", () => {
      expect(resolveRoundCombo(source, punches, [], settings, () => 0)).toEqual([
        { num: 1, name: "Jab" },
        { num: 2, name: "Cross" },
      ]);
    });

    test("a later draw picks a different combo from the same pool", () => {
      expect(resolveRoundCombo(source, punches, [], settings, () => 0.99)).toEqual([
        { num: 3, name: "Lead Hook" },
        { num: 2, name: "Cross" },
        { num: 3, name: "Lead Hook" },
      ]);
    });

    test("a pool of one is the rep-to-reflex case -- always the same combo", () => {
      const single: ComboSource = { type: "combo-pool", combos: [[1, 1, 2]] };
      for (const r of [0, 0.5, 0.99]) {
        expect(resolveRoundCombo(single, punches, [], settings, () => r)).toEqual([
          { num: 1, name: "Jab" },
          { num: 1, name: "Jab" },
          { num: 2, name: "Cross" },
        ]);
      }
    });

    test("an empty pool degrades to a random combo rather than a silent round", () => {
      const empty: ComboSource = { type: "combo-pool", combos: [] };
      expect(resolveRoundCombo(empty, punches, [], settings, () => 0).length).toBeGreaterThan(0);
    });

    test("a number matching no current punch still degrades gracefully, same as every other source", () => {
      const stale: ComboSource = { type: "combo-pool", combos: [[1, 999]] };
      expect(resolveRoundCombo(stale, punches, [], settings, () => 0)).toEqual([
        { num: 1, name: "Jab" },
        { num: 999, name: "Punch 999" },
      ]);
    });
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
