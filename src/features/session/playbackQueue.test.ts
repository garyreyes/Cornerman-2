import { createDefaultSettings } from "../settings/service";
import type { Punch, Settings } from "../settings/types";
import type { TimerConfig } from "../timer/types";
import {
  HORIZON_MS,
  LATE_TOLERANCE_MS,
  MIN_STEPS_AHEAD,
  rewindPlayback,
  shiftPlaybackForResume,
  startPlayback,
  topUpPlayback,
  type PlaybackQueue,
} from "./playbackQueue";
import { advanceSchedule, startSchedule, type ScheduleInputs, type ScheduledItem } from "./schedule";

const START = 1_000_000;

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

// Long enough that the horizon matters (a 3-minute round is far longer than
// HORIZON_MS), with a real 60s rest whose only events are its opening bell
// and the 3-2-1 at its very end -- the longest silence in a real session.
const config: TimerConfig = {
  totalRounds: 2,
  workDurationMs: 180_000,
  restDurationMs: 60_000,
  warmupDurationMs: 0,
};

function inputsWith(overrides: Partial<ScheduleInputs> = {}): ScheduleInputs {
  return { config, settings, punches, presets: [], activeTemplate: null, random: () => 0.5, ...overrides };
}

/** The whole session, flattened -- what playback must hand over, exactly once each. */
function fullTimeline(inputs: ScheduleInputs): ScheduledItem[] {
  const start = startSchedule(inputs, START);
  const items = [...start.step.items];
  let cursor = start.cursor;
  for (;;) {
    const next = advanceSchedule(cursor, inputs);
    if (next === null) {
      return items;
    }
    items.push(...next.step.items);
    cursor = next.cursor;
  }
}

const SESSION_END = START + 2 * 180_000 + 60_000;

describe("startPlayback", () => {
  test("hands over the opening bell at the exact start instant", () => {
    const { firstItems } = startPlayback(inputsWith(), START);
    expect(firstItems).toEqual([{ kind: "cue", atMs: START, cue: "bell" }]);
  });
});

describe("topUpPlayback", () => {
  test("one top-up covers the horizon: exactly the timeline's items up to the first step past now + HORIZON_MS", () => {
    const inputs = inputsWith();
    const { queue } = startPlayback(inputs, START);
    const { toSchedule } = topUpPlayback(queue, inputs, START);

    const expected = fullTimeline(inputs).filter((item) => item.atMs > START);
    const firstBeyond = expected.find((item) => item.atMs >= START + HORIZON_MS)!.atMs;
    expect(toSchedule).toEqual(expected.filter((item) => item.atMs <= firstBeyond));
  });

  test("a top-up at the same instant hands over nothing new", () => {
    const inputs = inputsWith();
    const { queue } = startPlayback(inputs, START);
    const first = topUpPlayback(queue, inputs, START);
    const second = topUpPlayback(first.queue, inputs, START);
    expect(second.toSchedule).toEqual([]);
  });

  test("topping up every 200ms across a whole session hands over the full timeline exactly once", () => {
    const inputs = inputsWith();
    const started = startPlayback(inputs, START);
    let queue: PlaybackQueue = started.queue;
    const handedOver = [...started.firstItems];

    for (let now = START; now <= SESSION_END + 1_000; now += 200) {
      const result = topUpPlayback(queue, inputs, now);
      queue = result.queue;
      handedOver.push(...result.toSchedule);
    }

    expect(handedOver).toEqual(fullTimeline(inputs));
  });

  test("topping up only when a handed-over item finishes (all a locked phone allows) still covers the whole session", () => {
    const inputs = inputsWith();
    const started = startPlayback(inputs, START);
    let queue: PlaybackQueue = started.queue;
    const handedOver = [...started.firstItems];
    // Each item's onEnded fires a little after it starts; nothing else wakes JS.
    const wakeUps = started.firstItems.map((item) => item.atMs + 800);

    while (wakeUps.length > 0) {
      wakeUps.sort((a, b) => a - b);
      const now = wakeUps.shift()!;
      const result = topUpPlayback(queue, inputs, now);
      queue = result.queue;
      handedOver.push(...result.toSchedule);
      wakeUps.push(...result.toSchedule.map((item) => item.atMs + 800));
    }

    expect(handedOver).toEqual(fullTimeline(inputs));
  });

  test(`keeps at least MIN_STEPS_AHEAD steps handed over even when they lie beyond the horizon`, () => {
    const inputs = inputsWith();
    const timeline = fullTimeline(inputs);
    const restBell = timeline.filter((item) => item.kind === "cue" && item.cue === "bell")[1]!;
    const started = startPlayback(inputs, START);

    // Catch up to the rest bell, so the next events are the 3-2-1 (57-59s
    // away, past the horizon) and the round-2 bell.
    const before = topUpPlayback(started.queue, inputs, restBell.atMs - 1);
    const after = topUpPlayback(before.queue, inputs, restBell.atMs + 1);

    const handedAhead = [...before.toSchedule, ...after.toSchedule].filter((item) => item.atMs > restBell.atMs);
    expect(handedAhead.slice(0, MIN_STEPS_AHEAD).map((item) => item.atMs - restBell.atMs)).toEqual([
      57_000, 58_000, 59_000, 60_000,
    ]);
  });

  test("after a long gap with no top-ups, missed items are dropped rather than played late in a burst", () => {
    const inputs = inputsWith();
    const started = startPlayback(inputs, START);
    const first = topUpPlayback(started.queue, inputs, START);
    const now = START + 120_000;
    const late = topUpPlayback(first.queue, inputs, now);

    expect(late.toSchedule.length).toBeGreaterThan(0);
    for (const item of late.toSchedule) {
      expect(item.atMs).toBeGreaterThanOrEqual(now - LATE_TOLERANCE_MS);
    }
  });

  test("reports each handed-over item as played once its time arrives, and never a dropped one", () => {
    const inputs = inputsWith();
    const started = startPlayback(inputs, START);
    const first = topUpPlayback(started.queue, inputs, START);
    const handedCombos = first.toSchedule.filter((item) => item.kind === "combo");

    const now = handedCombos[1]!.atMs;
    const result = topUpPlayback(first.queue, inputs, now);
    expect(result.played.filter((item) => item.kind === "combo")).toEqual(handedCombos.slice(0, 2));

    // Jumping far past items that were never handed over: only handed-over
    // ones (earlier, or just now within the late tolerance) count as played.
    const jumped = topUpPlayback(result.queue, inputs, START + 150_000);
    const everHanded = [...first.toSchedule, ...result.toSchedule, ...jumped.toSchedule];
    expect(jumped.played.length).toBeGreaterThan(0);
    for (const item of jumped.played) {
      expect(everHanded).toContainEqual(item);
    }
  });

  test("once the session has finished, nothing more is ever handed over", () => {
    const inputs = inputsWith();
    let { queue } = startPlayback(inputs, START);
    for (let now = START; now <= SESSION_END; now += 1_000) {
      queue = topUpPlayback(queue, inputs, now).queue;
    }
    expect(topUpPlayback(queue, inputs, SESSION_END + 5_000).toSchedule).toEqual([]);
  });
});

describe("pause and resume", () => {
  test("resuming hands over the rest of the session shifted by exactly the paused duration", () => {
    const inputs = inputsWith();
    let { queue } = startPlayback(inputs, START);
    const pausedAt = START + 42_300;
    for (let now = START; now <= pausedAt; now += 200) {
      queue = topUpPlayback(queue, inputs, now).queue;
    }

    queue = rewindPlayback(queue, pausedAt);
    const pausedForMs = 7_000;
    queue = shiftPlaybackForResume(queue, pausedAt, pausedAt + pausedForMs);

    const handedAfterResume: ScheduledItem[] = [];
    for (let now = pausedAt + pausedForMs; now <= SESSION_END + pausedForMs + 1_000; now += 200) {
      const result = topUpPlayback(queue, inputs, now);
      queue = result.queue;
      handedAfterResume.push(...result.toSchedule);
    }

    const expected = fullTimeline(inputs)
      .filter((item) => item.atMs > pausedAt)
      .map((item) => ({ ...item, atMs: item.atMs + pausedForMs }));
    expect(handedAfterResume).toEqual(expected);
  });
});

describe("rewindPlayback", () => {
  test("after a settings change, already-queued future combos are regenerated from the new inputs at the same times", () => {
    const inputs = inputsWith();
    let { queue } = startPlayback(inputs, START);
    const changedAt = START + 20_000;
    for (let now = START; now <= changedAt; now += 200) {
      queue = topUpPlayback(queue, inputs, now).queue;
    }

    const crossOnly = inputsWith({ punches: [{ id: "p2", num: 2, name: "Cross" }] });
    queue = rewindPlayback(queue, changedAt);
    const { toSchedule } = topUpPlayback(queue, crossOnly, changedAt);

    const combos = toSchedule.filter((item) => item.kind === "combo");
    const originalComboTimes = fullTimeline(inputs)
      .filter((item) => item.kind === "combo" && item.atMs > changedAt)
      .map((item) => item.atMs)
      .slice(0, combos.length);

    expect(combos.length).toBeGreaterThan(0);
    expect(combos.map((item) => item.atMs)).toEqual(originalComboTimes);
    for (const combo of combos) {
      expect(combo.kind === "combo" && combo.words).toEqual(["Cross", "Cross"]);
    }
  });

  test("never re-hands-over anything already due at the moment of the rewind", () => {
    const inputs = inputsWith();
    let { queue } = startPlayback(inputs, START);
    const rewoundAt = START + 20_000;
    for (let now = START; now <= rewoundAt; now += 200) {
      queue = topUpPlayback(queue, inputs, now).queue;
    }

    queue = rewindPlayback(queue, rewoundAt);
    const { toSchedule } = topUpPlayback(queue, inputs, rewoundAt);
    for (const item of toSchedule) {
      expect(item.atMs).toBeGreaterThan(rewoundAt);
    }
  });
});
