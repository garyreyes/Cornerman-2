import { createDefaultSettings } from "../settings/service";
import type { Preset, Punch, Settings } from "../settings/types";
import type { TimerConfig } from "../timer/types";
import { buildSessionSchedule } from "./schedule";
import type { ActiveTemplateSession } from "./types";

// A short config keeps these tests fast to write and read while still
// exercising every kind of event: work-warning, all three rest-countdown
// beats, a round transition, and session-finished.
const config: TimerConfig = {
  totalRounds: 2,
  workDurationMs: 15_000,
  restDurationMs: 5_000,
  warmupDurationMs: 0,
};

const punches: Punch[] = [
  { id: "p1", num: 1, name: "Jab" },
  { id: "p2", num: 2, name: "Cross" },
];

const settings: Settings = {
  ...createDefaultSettings(),
  comboGapMinSec: 1.5,
  comboGapMaxSec: 3,
  comboLengthMin: 2,
  comboLengthMax: 2,
  defenseCuesEnabled: false,
};

describe("buildSessionSchedule", () => {
  test("fires a synthetic first cue at the exact start time, mirroring useSession.ts's start()", () => {
    const startAt = 1_000_000;
    const schedule = buildSessionSchedule(config, settings, punches, [], null, startAt, () => 0.5);

    expect(schedule.cues[0]).toEqual({ atMs: startAt, cue: "bell" });
  });

  test("schedules the first combo at firstComboAt, not the generic combo gap window", () => {
    const startAt = 1_000_000;
    const schedule = buildSessionSchedule(config, settings, punches, [], null, startAt, () => 0);
    // firstComboAt = startAt + 500 (clamped [500,1500]ms window, random=0)
    expect(schedule.speech[0]).toEqual({ atMs: startAt + 500, words: ["Jab", "Jab"] });
  });

  test("produces every event kind across one full round: work-warning, all three rest beats, round-change bell, no duplicates", () => {
    const startAt = 1_000_000;
    const schedule = buildSessionSchedule(config, settings, punches, [], null, startAt, () => 0.999);

    const cueKinds = schedule.cues.map((c) => c.cue);
    // bell (round 1 start) -> clapper (round 1's own 10s warning) -> bell
    // (round 1 end / rest start) -> countdownTick x3 (rest 3-2-1) -> bell
    // (round 2 start) -> clapper (round 2 gets its own fresh 10s warning --
    // tenWarned resets every round) -> finalBell (session-finished; the
    // phase-changed{phase:"finished"} event alongside it maps to no cue).
    expect(cueKinds).toEqual([
      "bell",
      "clapper",
      "bell",
      "countdownTick",
      "countdownTick",
      "countdownTick",
      "bell",
      "clapper",
      "finalBell",
    ]);

    // Exact-value spot checks on the two boundary-derived cues.
    const workEnd = startAt + config.workDurationMs;
    expect(schedule.cues.find((c) => c.cue === "clapper")?.atMs).toBe(workEnd - 10_000);
    expect(schedule.cues.filter((c) => c.cue === "bell")[1]?.atMs).toBe(workEnd);
  });

  test("session-finished: no trailing rest, finishesAtMs lands exactly on the final work phase end", () => {
    const startAt = 1_000_000;
    const oneRound: TimerConfig = { ...config, totalRounds: 1 };
    const schedule = buildSessionSchedule(oneRound, settings, punches, [], null, startAt, () => 0.999);

    expect(schedule.finishesAtMs).toBe(startAt + oneRound.workDurationMs);
    // Final cue is session-finished's finalBell, not a rest/round-change
    // bell -- round 1 is the only round, so work ending goes straight to
    // "finished" (phase-changed{phase:"finished"} itself maps to no cue).
    expect(schedule.cues.at(-1)).toEqual({ atMs: schedule.finishesAtMs, cue: "finalBell" });
  });

  test("re-arms combos using the configured gap, measured from when the combo finishes speaking", () => {
    const startAt = 1_000_000;
    const schedule = buildSessionSchedule(config, settings, punches, [], null, startAt, () => 0);

    expect(schedule.speech.length).toBeGreaterThan(1);
    const gapMs = schedule.speech[1]!.atMs - schedule.speech[0]!.atMs;
    // Must be strictly more than the configured minimum gap alone -- the
    // combo's own speech duration has to be added first (session/service.ts's
    // "gap starts when the call-out ends, not when it begins" fix).
    expect(gapMs).toBeGreaterThan(settings.comboGapMinSec * 1000);
  });

  test("defense cues, when enabled, appear as their own independent speech entries", () => {
    const startAt = 1_000_000;
    const withDefense: Settings = { ...settings, defenseCuesEnabled: true, defenseCueGapMinSec: 1, defenseCueGapMaxSec: 1 };
    const schedule = buildSessionSchedule(config, withDefense, punches, [], null, startAt, () => 0);

    const defenseWords = schedule.speech.filter((s) => s.words.length === 1 && s.words[0] === "roll");
    expect(defenseWords.length).toBeGreaterThan(0);
  });

  test("number announce style speaks digits-as-words, not punch names", () => {
    const startAt = 1_000_000;
    const numberStyle: Settings = { ...settings, announceStyle: "number" };
    const schedule = buildSessionSchedule(config, numberStyle, punches, [], null, startAt, () => 0);

    expect(schedule.speech[0]!.words).toEqual(["one", "one"]);
  });

  test("a template-driven session resolves each round's own combo source, not Settings' random pool", () => {
    const startAt = 1_000_000;
    const activeTemplate: ActiveTemplateSession = {
      roundPlan: [
        { comboSource: { type: "fixed-sequence", sequence: [2] } },
        { comboSource: { type: "fixed-sequence", sequence: [1] } },
      ],
      baseComboGapMinSec: 1.5,
      baseComboGapMaxSec: 3,
    };
    const schedule = buildSessionSchedule(config, settings, punches, [], activeTemplate, startAt, () => 0);

    expect(schedule.speech[0]!.words).toEqual(["Cross"]);
  });

  test("a preset with no matching combo source degrades gracefully instead of throwing", () => {
    const startAt = 1_000_000;
    const presets: Preset[] = [];
    const presetSettings: Settings = { ...settings, mode: "preset", activePresetId: "missing" };
    expect(() => buildSessionSchedule(config, presetSettings, punches, presets, null, startAt, () => 0)).not.toThrow();
  });

  test("deterministic: identical inputs (including the injected random) produce an identical schedule", () => {
    const startAt = 1_000_000;
    const a = buildSessionSchedule(config, settings, punches, [], null, startAt, () => 0.3);
    const b = buildSessionSchedule(config, settings, punches, [], null, startAt, () => 0.3);
    expect(a).toEqual(b);
  });

  // The settings wheels genuinely offer 0s for work and rest
  // (RoundSection.tsx's WORK_VALUES/REST_VALUES both start at 0), so these
  // are real configs a user can start, not hypotheticals.
  test.each([
    ["work 0s, rest 0s", 0, 0],
    ["work 0s, rest 5s", 0, 5_000],
    ["work 15s, rest 0s", 15_000, 0],
  ])("a zero-duration phase (%s) still builds a finite, time-ordered schedule", (_label, workDurationMs, restDurationMs) => {
    const startAt = 1_000_000;
    const zeroConfig: TimerConfig = { totalRounds: 3, workDurationMs, restDurationMs, warmupDurationMs: 0 };
    const schedule = buildSessionSchedule(zeroConfig, settings, punches, [], null, startAt, () => 0.5);

    expect(schedule.finishesAtMs).toBe(startAt + 3 * workDurationMs + 2 * restDurationMs);
    const times = [...schedule.cues, ...schedule.speech].map((item) => item.atMs);
    for (const atMs of times) {
      expect(atMs).toBeGreaterThanOrEqual(startAt);
      expect(atMs).toBeLessThanOrEqual(schedule.finishesAtMs);
    }
    expect(schedule.cues.at(-1)).toEqual({ atMs: schedule.finishesAtMs, cue: "finalBell" });
  });

  test("never emits two cues or two speech entries at the exact same instant of the same kind", () => {
    const startAt = 1_000_000;
    const longConfig: TimerConfig = { ...config, totalRounds: 4 };
    const schedule = buildSessionSchedule(longConfig, settings, punches, [], null, startAt, Math.random);

    const seen = new Set<string>();
    for (const cue of schedule.cues) {
      const key = `${cue.atMs}:${cue.cue}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
