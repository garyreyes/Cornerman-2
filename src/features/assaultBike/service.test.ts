import { pause, resume, startBikeSession, tick } from "./service";
import type { BikeConfig, BikeEvent, BikeState } from "./types";

/** Held as a narrow literal (not read back off `BikeConfig["rest"]`) so
 * tests can reach `.drillSec` without re-narrowing the union every time. */
const drillRest = { kind: "drill", settleSec: 8, drillSec: 30, resetSec: 12 } as const;
const plainRest = { kind: "plain", restSec: 10 } as const;

const config: BikeConfig = { roundsTarget: 2, workSec: 10, rest: drillRest };
/** Anaerobic Lactic Capacity's real shape: 20s all-out / 10s easy spin,
 * no room for a drill (Phase 12a). */
const plainConfig: BikeConfig = { roundsTarget: 2, workSec: 20, rest: plainRest };

const drillCycleMs = (c: BikeConfig) => (c.workSec + drillRest.settleSec + drillRest.drillSec + drillRest.resetSec) * 1000;
const plainCycleMs = (c: BikeConfig) => (c.workSec + plainRest.restSec) * 1000;

/** Simulates the real ~200ms poll cadence and collects every event fired. */
function advanceTicks(
  state: BikeState,
  cfg: BikeConfig,
  startNow: number,
  endNow: number,
  stepMs = 200,
): { state: BikeState; events: BikeEvent[] } {
  let current = state;
  const events: BikeEvent[] = [];
  for (let now = startNow; now <= endNow; now += stepMs) {
    const result = tick(current, cfg, now);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

function phaseNames(events: BikeEvent[]): string[] {
  return events.filter((e) => e.type === "phase-changed").map((e) => (e as { phase: string }).phase);
}

describe("startBikeSession", () => {
  test("starts directly in work, round 1 -- no warmup/ready phase in this state machine", () => {
    const now = 1_000_000;
    const state = startBikeSession(config, now);
    expect(state.phase).toBe("work");
    expect(state.round).toBe(1);
    expect(state.phaseEndAt).toBe(now + config.workSec * 1000);
    expect(state.isPaused).toBe(false);
  });
});

describe("drill-rest protocol: work -> settle -> drill -> reset -> work (next round)", () => {
  test("advances through all four sub-phases of round 1 in order, with correct durations", () => {
    const now = 1_000_000;
    let state = startBikeSession(config, now);
    let cursor = now;

    ({ state } = advanceTicks(state, config, cursor, cursor + config.workSec * 1000));
    expect(state.phase).toBe("settle");
    expect(state.round).toBe(1);
    expect(state.phaseEndAt).toBe(now + config.workSec * 1000 + drillRest.settleSec * 1000);
    cursor = state.phaseEndAt - drillRest.settleSec * 1000;

    ({ state } = advanceTicks(state, config, cursor, cursor + drillRest.settleSec * 1000));
    expect(state.phase).toBe("drill");
    expect(state.round).toBe(1);

    cursor = state.phaseEndAt - drillRest.drillSec * 1000;
    ({ state } = advanceTicks(state, config, cursor, cursor + drillRest.drillSec * 1000));
    expect(state.phase).toBe("reset");
    expect(state.round).toBe(1);

    cursor = state.phaseEndAt - drillRest.resetSec * 1000;
    ({ state } = advanceTicks(state, config, cursor, cursor + drillRest.resetSec * 1000));
    expect(state.phase).toBe("work");
    expect(state.round).toBe(2);
  });

  test("fires exactly one phase-changed event per transition, in order", () => {
    const now = 1_000_000;
    const state = startBikeSession(config, now);

    const { events } = advanceTicks(state, config, now, now + drillCycleMs(config));

    expect(phaseNames(events)).toEqual(["settle", "drill", "reset", "work"]);
  });
});

/**
 * Phase 12a. The Anaerobic Lactic Capacity protocol's 10s rest can't fit
 * a drill, so its cycle is genuinely two phases, not four with three of
 * them zeroed -- these tests pin that it never enters settle/drill/reset
 * at all.
 */
describe("plain-rest protocol: work -> rest -> work (next round)", () => {
  test("advances work -> rest -> next round's work, with correct durations", () => {
    const now = 1_000_000;
    let state = startBikeSession(plainConfig, now);

    expect(state.phaseEndAt).toBe(now + plainConfig.workSec * 1000);

    ({ state } = advanceTicks(state, plainConfig, now, now + plainConfig.workSec * 1000));
    expect(state.phase).toBe("rest");
    expect(state.round).toBe(1);
    expect(state.phaseEndAt).toBe(now + (plainConfig.workSec + plainRest.restSec) * 1000);

    const cursor = state.phaseEndAt - plainRest.restSec * 1000;
    ({ state } = advanceTicks(state, plainConfig, cursor, cursor + plainRest.restSec * 1000));
    expect(state.phase).toBe("work");
    expect(state.round).toBe(2);
  });

  test("never enters settle, drill, or reset", () => {
    const now = 1_000_000;
    const state = startBikeSession(plainConfig, now);

    const { events } = advanceTicks(state, plainConfig, now, now + plainCycleMs(plainConfig) * 2);

    expect(phaseNames(events)).not.toContain("settle");
    expect(phaseNames(events)).not.toContain("drill");
    expect(phaseNames(events)).not.toContain("reset");
  });

  test("fires exactly one phase-changed event per transition, in order", () => {
    const now = 1_000_000;
    const state = startBikeSession(plainConfig, now);

    const { events } = advanceTicks(state, plainConfig, now, now + plainCycleMs(plainConfig));

    expect(phaseNames(events)).toEqual(["rest", "work"]);
  });

  test("the last round still runs its full rest before finishing -- same rule as the drill cycle", () => {
    const now = 1_000_000;
    const oneRound: BikeConfig = { ...plainConfig, roundsTarget: 1 };

    const { state: afterWork } = advanceTicks(
      startBikeSession(oneRound, now),
      oneRound,
      now,
      now + oneRound.workSec * 1000,
    );
    expect(afterWork.phase).toBe("rest");

    const { state: final, events } = advanceTicks(
      startBikeSession(oneRound, now),
      oneRound,
      now,
      now + plainCycleMs(oneRound),
    );
    expect(final.phase).toBe("finished");
    expect(events.filter((e) => e.type === "session-finished")).toHaveLength(1);
  });

  test("a large jump cascades through a whole plain cycle into the next round", () => {
    const now = 1_000_000;
    const state = startBikeSession(plainConfig, now);

    const { state: after, events } = tick(state, plainConfig, now + plainCycleMs(plainConfig) + 3_000);

    expect(after.phase).toBe("work");
    expect(after.round).toBe(2);
    expect(events.filter((e) => e.type === "phase-changed" && e.phase === "work")).toHaveLength(1);
  });
});

describe("session completion", () => {
  test("every round -- including the last -- runs its full Settle/Drill/Reset cycle; finished fires only after the last round's Reset ends, not right after its Work", () => {
    const now = 1_000_000;
    const oneRoundConfig: BikeConfig = { ...config, roundsTarget: 1 };

    // End of round 1's Work: must NOT be finished yet (unlike the boxing
    // timer, which skips a trailing rest after the final round's work).
    const { state: afterWork } = advanceTicks(
      startBikeSession(oneRoundConfig, now),
      oneRoundConfig,
      now,
      now + oneRoundConfig.workSec * 1000,
    );
    expect(afterWork.phase).toBe("settle");

    const { state: final, events } = advanceTicks(
      startBikeSession(oneRoundConfig, now),
      oneRoundConfig,
      now,
      now + drillCycleMs(oneRoundConfig),
    );

    expect(final.phase).toBe("finished");
    expect(events.filter((e) => e.type === "session-finished")).toHaveLength(1);
    expect(events).toContainEqual({ type: "phase-changed", phase: "finished", round: 1 });
  });

  test("further ticks after finished return the same phase and no events", () => {
    const now = 1_000_000;
    const oneRoundConfig: BikeConfig = { ...config, roundsTarget: 1 };
    let state = startBikeSession(oneRoundConfig, now);
    ({ state } = advanceTicks(state, oneRoundConfig, now, now + drillCycleMs(oneRoundConfig)));
    expect(state.phase).toBe("finished");

    const { state: after, events } = tick(state, oneRoundConfig, now + 999_999);
    expect(after.phase).toBe("finished");
    expect(events).toEqual([]);
  });
});

describe("pause/resume -- exact remaining-time preservation", () => {
  test("resume shifts phaseEndAt forward by exactly the paused duration", () => {
    const now = 1_000_000;
    const state = startBikeSession(config, now);
    const paused = pause(state, now + 3_000);
    expect(paused.isPaused).toBe(true);

    const resumed = resume(paused, now + 3_000 + 7_500);
    expect(resumed.isPaused).toBe(false);
    expect(resumed.phaseEndAt).toBe(state.phaseEndAt + 7_500);
  });

  test("tick is a no-op while paused, even long past the original phaseEndAt", () => {
    const now = 1_000_000;
    const state = startBikeSession(config, now);
    const paused = pause(state, now + 1_000);

    const { state: after, events } = tick(paused, config, now + config.workSec * 1000 + 60_000);

    expect(after).toEqual(paused);
    expect(events).toEqual([]);
  });

  test("pause is a no-op once finished", () => {
    const now = 1_000_000;
    const oneRoundConfig: BikeConfig = { ...config, roundsTarget: 1 };
    let state = startBikeSession(oneRoundConfig, now);
    ({ state } = advanceTicks(state, oneRoundConfig, now, now + drillCycleMs(oneRoundConfig)));

    const paused = pause(state, now + drillCycleMs(oneRoundConfig) + 1_000);
    expect(paused).toEqual(state);
  });
});

describe("a large jump in `now` (e.g. resuming after the app was suspended)", () => {
  test("cascades through multiple sub-phases and into the next round correctly, without crashing or double-firing", () => {
    const now = 1_000_000;
    const state = startBikeSession(config, now);
    // Jump straight past round 1's entire cycle into round 2's work phase, mid-way.
    const farFuture = now + drillCycleMs(config) + 3_000;

    const { state: after, events } = tick(state, config, farFuture);

    expect(after.phase).toBe("work");
    expect(after.round).toBe(2);
    expect(events.filter((e) => e.type === "phase-changed" && e.phase === "work")).toHaveLength(1);
  });
});
