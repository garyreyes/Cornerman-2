import { pause, resume, startBikeSession, tick } from "./service";
import type { BikeConfig, BikeEvent, BikeState } from "./types";

const config: BikeConfig = {
  roundsTarget: 2,
  workSec: 10,
  settleSec: 8,
  drillSec: 30,
  resetSec: 12,
};

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

describe("phase cycle: work -> settle -> drill -> reset -> work (next round)", () => {
  test("advances through all four sub-phases of round 1 in order, with correct durations", () => {
    const now = 1_000_000;
    let state = startBikeSession(config, now);
    let cursor = now;

    ({ state } = advanceTicks(state, config, cursor, cursor + config.workSec * 1000));
    expect(state.phase).toBe("settle");
    expect(state.round).toBe(1);
    expect(state.phaseEndAt).toBe(now + config.workSec * 1000 + config.settleSec * 1000);
    cursor = state.phaseEndAt - config.settleSec * 1000;

    ({ state } = advanceTicks(state, config, cursor, cursor + config.settleSec * 1000));
    expect(state.phase).toBe("drill");
    expect(state.round).toBe(1);

    cursor = state.phaseEndAt - config.drillSec * 1000;
    ({ state } = advanceTicks(state, config, cursor, cursor + config.drillSec * 1000));
    expect(state.phase).toBe("reset");
    expect(state.round).toBe(1);

    cursor = state.phaseEndAt - config.resetSec * 1000;
    ({ state } = advanceTicks(state, config, cursor, cursor + config.resetSec * 1000));
    expect(state.phase).toBe("work");
    expect(state.round).toBe(2);
  });

  test("fires exactly one phase-changed event per transition, in order", () => {
    const now = 1_000_000;
    const state = startBikeSession(config, now);
    const totalCycleMs = (config.workSec + config.settleSec + config.drillSec + config.resetSec) * 1000;

    const { events } = advanceTicks(state, config, now, now + totalCycleMs);

    const phases = events.filter((e) => e.type === "phase-changed").map((e) => (e as { phase: string }).phase);
    expect(phases).toEqual(["settle", "drill", "reset", "work"]);
  });
});

describe("session completion", () => {
  test("every round -- including the last -- runs its full Settle/Drill/Reset cycle; finished fires only after the last round's Reset ends, not right after its Work", () => {
    const now = 1_000_000;
    const oneRoundConfig: BikeConfig = { ...config, roundsTarget: 1 };
    let state = startBikeSession(oneRoundConfig, now);

    // End of round 1's Work: must NOT be finished yet (unlike the boxing
    // timer, which skips a trailing rest after the final round's work).
    const { state: afterWork } = advanceTicks(state, oneRoundConfig, now, now + oneRoundConfig.workSec * 1000);
    expect(afterWork.phase).toBe("settle");

    const totalCycleMs =
      (oneRoundConfig.workSec + oneRoundConfig.settleSec + oneRoundConfig.drillSec + oneRoundConfig.resetSec) * 1000;
    const { state: final, events } = advanceTicks(state, oneRoundConfig, now, now + totalCycleMs);

    expect(final.phase).toBe("finished");
    expect(events.filter((e) => e.type === "session-finished")).toHaveLength(1);
    expect(events).toContainEqual({ type: "phase-changed", phase: "finished", round: 1 });
  });

  test("further ticks after finished return the same phase and no events", () => {
    const now = 1_000_000;
    const oneRoundConfig: BikeConfig = { ...config, roundsTarget: 1 };
    let state = startBikeSession(oneRoundConfig, now);
    const totalCycleMs =
      (oneRoundConfig.workSec + oneRoundConfig.settleSec + oneRoundConfig.drillSec + oneRoundConfig.resetSec) * 1000;
    ({ state } = advanceTicks(state, oneRoundConfig, now, now + totalCycleMs));
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
    const totalCycleMs =
      (oneRoundConfig.workSec + oneRoundConfig.settleSec + oneRoundConfig.drillSec + oneRoundConfig.resetSec) * 1000;
    ({ state } = advanceTicks(state, oneRoundConfig, now, now + totalCycleMs));

    const paused = pause(state, now + totalCycleMs + 1_000);
    expect(paused).toEqual(state);
  });
});

describe("a large jump in `now` (e.g. resuming after the app was suspended)", () => {
  test("cascades through multiple sub-phases and into the next round correctly, without crashing or double-firing", () => {
    const now = 1_000_000;
    const state = startBikeSession(config, now);
    // Jump straight past round 1's entire cycle into round 2's work phase, mid-way.
    const totalCycleMs = (config.workSec + config.settleSec + config.drillSec + config.resetSec) * 1000;
    const farFuture = now + totalCycleMs + 3_000;

    const { state: after, events } = tick(state, config, farFuture);

    expect(after.phase).toBe("work");
    expect(after.round).toBe(2);
    expect(events.filter((e) => e.type === "phase-changed" && e.phase === "work")).toHaveLength(1);
  });
});
