import { startTimer, tick } from "./service";
import type { TimerConfig, TimerEvent, TimerState } from "./types";

const baseConfig: TimerConfig = {
  totalRounds: 2,
  workDurationMs: 15_000,
  restDurationMs: 5_000,
  warmupDurationMs: 0,
};

/** Simulates the real ~200ms poll cadence and collects every event fired. */
function advanceTicks(
  state: TimerState,
  config: TimerConfig,
  startNow: number,
  endNow: number,
  random: () => number = Math.random,
  stepMs = 200,
): { state: TimerState; events: TimerEvent[] } {
  let current = state;
  const events: TimerEvent[] = [];
  for (let now = startNow; now <= endNow; now += stepMs) {
    const result = tick(current, config, now, random);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

describe("startTimer", () => {
  test("with no warmup, starts directly in work, round 1", () => {
    const now = 1_000_000;
    const state = startTimer(baseConfig, now);
    expect(state.phase).toBe("work");
    expect(state.round).toBe(1);
    expect(state.phaseEndAt).toBe(now + baseConfig.workDurationMs);
  });

  test("with a warmup configured, starts in warmup, round 0", () => {
    const now = 1_000_000;
    const config: TimerConfig = { ...baseConfig, warmupDurationMs: 3_000 };
    const state = startTimer(config, now);
    expect(state.phase).toBe("warmup");
    expect(state.round).toBe(0);
    expect(state.phaseEndAt).toBe(now + 3_000);
    expect(state.firstComboAt).toBeNull();
  });

  test("first combo timing uses the clamped [500ms, 1500ms] window, not the general gap range", () => {
    const now = 1_000_000;
    expect(startTimer(baseConfig, now, () => 0).firstComboAt).toBe(now + 500);
    expect(startTimer(baseConfig, now, () => 1).firstComboAt).toBe(now + 1500);
    expect(startTimer(baseConfig, now, () => 0.5).firstComboAt).toBe(now + 1000);
  });
});

describe("warmup -> work transition", () => {
  test("moves to work round 1 once the warmup elapses", () => {
    const now = 1_000_000;
    const config: TimerConfig = { ...baseConfig, warmupDurationMs: 2_000 };
    const state = startTimer(config, now);

    const { state: after, events } = advanceTicks(state, config, now, now + 2_200);

    expect(after.phase).toBe("work");
    expect(after.round).toBe(1);
    expect(
      events.filter((e) => e.type === "phase-changed" && e.phase === "work"),
    ).toHaveLength(1);
  });
});

describe("the 10-second work-warning latch (extraction doc §1.1)", () => {
  test("fires exactly once as a 200ms poll crosses the 10-second boundary, not ~5 times", () => {
    const now = 1_000_000;
    const state = startTimer(baseConfig, now);
    // workDurationMs=15000, so the 10s-remaining boundary is at now+5000
    const { events } = advanceTicks(state, baseConfig, now, now + 6_000);

    const warnings = events.filter((e) => e.type === "work-warning");
    expect(warnings).toHaveLength(1);
  });

  test("does not fire before the boundary is crossed", () => {
    const now = 1_000_000;
    const state = startTimer(baseConfig, now);
    const { events } = advanceTicks(state, baseConfig, now, now + 4_800);
    expect(events.filter((e) => e.type === "work-warning")).toHaveLength(0);
  });

  test("never fires when the whole work round is 10 seconds or shorter -- there's no meaningful '10 seconds left' moment separate from the round just starting", () => {
    const now = 1_000_000;
    const shortConfig: TimerConfig = { ...baseConfig, workDurationMs: 8_000 };
    const state = startTimer(shortConfig, now);
    const { events } = advanceTicks(state, shortConfig, now, now + 8_000);
    expect(events.filter((e) => e.type === "work-warning")).toHaveLength(0);
  });

  test("still fires normally right at the 10-second boundary when the round is longer than 10 seconds", () => {
    const now = 1_000_000;
    const exactConfig: TimerConfig = { ...baseConfig, workDurationMs: 10_000 };
    const state = startTimer(exactConfig, now);
    const { events } = advanceTicks(state, exactConfig, now, now + 200);
    // workDurationMs === WORK_WARNING_THRESHOLD_MS: the "10s left" moment
    // and the round's start are the same instant, so this is really the
    // same "too short to mean anything" case as the test above, not a
    // separate boundary worth warning at.
    expect(events.filter((e) => e.type === "work-warning")).toHaveLength(0);
  });

  test("fires normally for a round just over the threshold", () => {
    const now = 1_000_000;
    const config: TimerConfig = { ...baseConfig, workDurationMs: 10_200 };
    const state = startTimer(config, now);
    const { events } = advanceTicks(state, config, now, now + 400);
    expect(events.filter((e) => e.type === "work-warning")).toHaveLength(1);
  });
});

describe("the rest-phase 3-2-1 countdown latch (extraction doc §1.1)", () => {
  function enterRest(now: number): TimerState {
    const started = startTimer(baseConfig, now);
    const { state } = advanceTicks(started, baseConfig, now, now + baseConfig.workDurationMs);
    return state;
  }

  test("fires 3, 2, then 1 exactly once each across a realistic 200ms cadence", () => {
    const now = 1_000_000;
    const restState = enterRest(now);
    expect(restState.phase).toBe("rest");
    const restStart = restState.phaseEndAt - baseConfig.restDurationMs;

    const { events } = advanceTicks(restState, baseConfig, restStart, restStart + baseConfig.restDurationMs);

    const countdowns = events.filter((e) => e.type === "rest-countdown");
    expect(countdowns.map((e) => (e as { secondsRemaining: number }).secondsRemaining)).toEqual([3, 2, 1]);
  });
});

describe("round progression", () => {
  test("after a non-final round's work phase, moves to rest (not finished)", () => {
    const now = 1_000_000;
    const state = startTimer(baseConfig, now);
    const { state: after, events } = advanceTicks(state, baseConfig, now, now + baseConfig.workDurationMs);

    expect(after.phase).toBe("rest");
    expect(after.round).toBe(1);
    expect(events).toContainEqual({ type: "phase-changed", phase: "rest", round: 1 });
  });

  test("after rest, advances to work round 2 with fresh latches and a new firstComboAt", () => {
    const now = 1_000_000;
    let state = startTimer(baseConfig, now);
    let cursor = now;

    ({ state } = advanceTicks(state, baseConfig, cursor, cursor + baseConfig.workDurationMs));
    cursor += baseConfig.workDurationMs + 200;
    ({ state } = advanceTicks(state, baseConfig, cursor, cursor + baseConfig.restDurationMs, () => 0.9));

    expect(state.phase).toBe("work");
    expect(state.round).toBe(2);
    expect(state.tenWarned).toBe(false);
    expect(state.lastRestCountdown).toBeNull();
    expect(state.firstComboAt).toBe(state.phaseEndAt - baseConfig.workDurationMs + 500 + 0.9 * 1000);
  });

  test("after the final round's work phase, goes straight to finished with no trailing rest", () => {
    const now = 1_000_000;
    let state = startTimer(baseConfig, now);
    let cursor = now;
    let allEvents: TimerEvent[] = [];

    for (let round = 1; round <= baseConfig.totalRounds; round++) {
      const workResult = advanceTicks(state, baseConfig, cursor, cursor + baseConfig.workDurationMs);
      state = workResult.state;
      allEvents = allEvents.concat(workResult.events);
      cursor += baseConfig.workDurationMs + 200;

      if (round < baseConfig.totalRounds) {
        const restResult = advanceTicks(state, baseConfig, cursor, cursor + baseConfig.restDurationMs);
        state = restResult.state;
        allEvents = allEvents.concat(restResult.events);
        cursor += baseConfig.restDurationMs + 200;
      }
    }

    expect(state.phase).toBe("finished");
    expect(allEvents).toContainEqual({ type: "session-finished" });
    expect(allEvents.filter((e) => e.type === "phase-changed" && e.phase === "rest")).toHaveLength(
      baseConfig.totalRounds - 1,
    );
  });
});

describe("tick is a no-op once finished", () => {
  test("further ticks after finished return the same phase and no events", () => {
    const now = 1_000_000;
    let state = startTimer({ ...baseConfig, totalRounds: 1 }, now);
    ({ state } = advanceTicks(state, { ...baseConfig, totalRounds: 1 }, now, now + baseConfig.workDurationMs + 200));
    expect(state.phase).toBe("finished");

    const { state: after, events } = tick(state, { ...baseConfig, totalRounds: 1 }, now + 999_999);
    expect(after.phase).toBe("finished");
    expect(events).toEqual([]);
  });
});

describe("a large jump in `now` (e.g. resuming after the app was suspended)", () => {
  test("resolves to the correct current phase/round without crashing or double-firing stale latches", () => {
    const now = 1_000_000;
    const state = startTimer(baseConfig, now);
    // Jump straight past round 1's work+rest into round 2's work phase, mid-way.
    const farFuture = now + baseConfig.workDurationMs + baseConfig.restDurationMs + 3_000;

    const { state: after, events } = tick(state, baseConfig, farFuture);

    expect(after.phase).toBe("work");
    expect(after.round).toBe(2);
    // The 3-2-1 rest countdown that would have fired mid-jump must not be
    // announced retroactively after the fact -- it no longer makes sense.
    expect(events.filter((e) => e.type === "rest-countdown")).toHaveLength(0);
  });
});
