import { pause, resume, startTimer, tick } from "./service";
import type { TimerConfig } from "./types";

const config: TimerConfig = {
  totalRounds: 2,
  workDurationMs: 20_000,
  restDurationMs: 5_000,
  warmupDurationMs: 0,
};

describe("pause", () => {
  test("freezes phase/round and stops tick from advancing, however far `now` moves", () => {
    const now = 1_000_000;
    const running = startTimer(config, now);
    const paused = pause(running, now + 3_000);

    expect(paused.isPaused).toBe(true);
    expect(paused.phase).toBe("work");
    expect(paused.round).toBe(1);

    const { state: after, events } = tick(paused, config, now + 999_999);
    expect(after).toEqual(paused);
    expect(events).toEqual([]);
  });

  test("is a no-op when called during ready or finished", () => {
    const now = 1_000_000;
    let state = startTimer({ ...config, totalRounds: 1 }, now);
    ({ state } = tick(state, { ...config, totalRounds: 1 }, now + config.workDurationMs + 200));
    expect(state.phase).toBe("finished");

    expect(pause(state, now)).toEqual(state);
  });

  test("is idempotent -- pausing an already-paused state keeps the original pausedAt", () => {
    const now = 1_000_000;
    const running = startTimer(config, now);
    const firstPause = pause(running, now + 3_000);
    const secondPause = pause(firstPause, now + 8_000);
    expect(secondPause).toEqual(firstPause);
  });
});

describe("resume", () => {
  test("shifts phaseEndAt forward by exactly the paused duration -- no drift", () => {
    const now = 1_000_000;
    const running = startTimer(config, now);
    const remainingAtPause = running.phaseEndAt - (now + 3_000);

    const paused = pause(running, now + 3_000);
    // Paused for a long, arbitrary real-world duration.
    const resumed = resume(paused, now + 3_000 + 47_000);

    expect(resumed.isPaused).toBe(false);
    expect(resumed.pausedAt).toBeNull();
    // Remaining time at resume must equal remaining time at the moment of pause.
    const remainingAtResume = resumed.phaseEndAt - (now + 3_000 + 47_000);
    expect(remainingAtResume).toBe(remainingAtPause);
  });

  test("shifts a still-pending firstComboAt by the same paused duration", () => {
    const now = 1_000_000;
    const running = startTimer(config, now, () => 1); // firstComboAt = now + 1500
    const paused = pause(running, now + 500);
    const resumed = resume(paused, now + 500 + 10_000);

    expect(resumed.firstComboAt).toBe(running.firstComboAt! + 10_000);
  });

  test("is a no-op when called on a non-paused state", () => {
    const now = 1_000_000;
    const running = startTimer(config, now);
    expect(resume(running, now + 5_000)).toEqual(running);
  });

  test("preserves latch state across pause/resume -- an already-fired warning does not refire", () => {
    const now = 1_000_000;
    let state = startTimer(config, now);
    // Cross the 10s-remaining boundary before pausing.
    ({ state } = tick(state, config, now + 10_100));
    expect(state.tenWarned).toBe(true);

    const paused = pause(state, now + 10_200);
    const resumed = resume(paused, now + 10_200 + 60_000);

    const { events } = tick(resumed, config, now + 10_200 + 60_000 + 200);
    expect(events.filter((e) => e.type === "work-warning")).toHaveLength(0);
  });

  test("a warning that had NOT fired before pause still fires at the correct remaining time after resume", () => {
    const now = 1_000_000;
    // Pause with 12s remaining in a 20s work phase (before the 10s warning threshold).
    let state = startTimer(config, now);
    const pauseAt = now + 8_000; // 12s remaining
    state = pause(state, pauseAt);
    expect(state.tenWarned).toBe(false);

    // Paused for a long real-world duration -- must not count against the phase.
    const resumeAt = pauseAt + 500_000;
    state = resume(state, resumeAt);

    // 1.5s of running time after resume: still 10.5s remaining, warning should not fire yet.
    let result = tick(state, config, resumeAt + 1_500);
    expect(result.events.filter((e) => e.type === "work-warning")).toHaveLength(0);

    // 2.5s of running time after resume: 9.5s remaining, warning should fire now.
    result = tick(result.state, config, resumeAt + 2_500);
    expect(result.events.filter((e) => e.type === "work-warning")).toHaveLength(1);
  });

  test("rest-phase countdown latch is likewise preserved across a pause inside rest", () => {
    const now = 1_000_000;
    let state = startTimer(config, now);
    ({ state } = tick(state, config, now + config.workDurationMs));
    expect(state.phase).toBe("rest");

    const restStart = state.phaseEndAt - config.restDurationMs;
    // Pause with 2.5s remaining in rest (after "3" would have fired, before "2").
    let result = tick(state, config, restStart + 2_500);
    state = result.state;
    expect(result.events.map((e) => e.type)).toContain("rest-countdown");

    const pauseAt = restStart + 2_600;
    state = pause(state, pauseAt);
    const resumeAt = pauseAt + 200_000;
    state = resume(state, resumeAt);

    result = tick(state, config, resumeAt + 200);
    // Still just past the "3" mark relative to remaining time -- "2" must not
    // have fired yet, and "3" must not refire.
    expect(result.events).toEqual([]);
  });
});
