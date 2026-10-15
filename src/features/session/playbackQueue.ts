import { pause as pauseTimer, resume as resumeTimer } from "../timer/service";
import {
  advanceSchedule,
  startSchedule,
  type ScheduleCursor,
  type ScheduledItem,
  type ScheduleInputs,
  type ScheduleStep,
} from "./schedule";
import { shiftSessionForResume } from "./service";

/** How far ahead playback is queued on the audio clock. Short enough that
 * the wall-clock-to-audio-clock mapping is refreshed often (~0.3% drift
 * measured in the 2026-09-19 spike), long enough to ride out a slow
 * onEnded wake-up. */
export const HORIZON_MS = 30_000;

/** Queued regardless of the horizon, so a long silence (a 60s rest has
 * nothing between its bell and the 3-2-1) still leaves a sound queued
 * whose onEnded can wake JS to top up again. */
export const MIN_STEPS_AHEAD = 4;

/** A step this late when first reached is dropped, not played -- no burst
 * of missed cues after JS was asleep (extraction doc §1.1). */
export const LATE_TOLERANCE_MS = 500;

interface QueuedStep extends ScheduleStep {
  /** The walk's position just before this step, so it can be regenerated. */
  before: ScheduleCursor;
  handedOver: boolean;
}

/**
 * The generated-but-not-yet-reached part of a session's timeline, plus the
 * walk's position after it. `cursor` is null once the walk has reached the
 * end of the session.
 */
export interface PlaybackQueue {
  cursor: ScheduleCursor | null;
  steps: QueuedStep[];
}

export function startPlayback(
  inputs: ScheduleInputs,
  startAtMs: number,
): { queue: PlaybackQueue; firstItems: ScheduledItem[] } {
  const { cursor, step } = startSchedule(inputs, startAtMs);
  return { queue: { cursor, steps: [] }, firstItems: step.items };
}

/**
 * Generates far enough ahead, hands over every newly generated item that
 * isn't too late to play (`toSchedule` -- the caller queues these on the
 * audio clock), and retires everything now due (`played`, for the display).
 * Each item is handed over at most once, so calling this as often as
 * anything wakes JS -- the display tick, every sound's onEnded, AppState --
 * is safe.
 */
export function topUpPlayback(
  queue: PlaybackQueue,
  inputs: ScheduleInputs,
  nowMs: number,
): { queue: PlaybackQueue; toSchedule: ScheduledItem[]; played: ScheduledItem[] } {
  let cursor = queue.cursor;
  const steps = [...queue.steps];
  const lastAtMs = () => (steps.length > 0 ? steps[steps.length - 1]!.atMs : -Infinity);
  const stepsAhead = () => steps.filter((step) => step.atMs > nowMs).length;

  while (cursor !== null && (lastAtMs() < nowMs + HORIZON_MS || stepsAhead() < MIN_STEPS_AHEAD)) {
    const next = advanceSchedule(cursor, inputs);
    if (next === null) {
      cursor = null;
      break;
    }
    if (next.step.items.length > 0) {
      steps.push({ ...next.step, before: cursor, handedOver: false });
    }
    cursor = next.cursor;
  }

  const toSchedule: ScheduledItem[] = [];
  const played: ScheduledItem[] = [];
  const remaining: QueuedStep[] = [];
  for (const step of steps) {
    let handedOver = step.handedOver;
    if (!handedOver && step.atMs >= nowMs - LATE_TOLERANCE_MS) {
      toSchedule.push(...step.items);
      handedOver = true;
    }
    if (step.atMs <= nowMs) {
      if (handedOver) {
        played.push(...step.items);
      }
    } else {
      remaining.push({ ...step, handedOver });
    }
  }

  return { queue: { cursor, steps: remaining }, toSchedule, played };
}

/**
 * Discards every step after `nowMs` and moves the walk back to just before
 * the first of them, so the next top-up regenerates them -- with new
 * inputs after a settings change, or shifted after a pause. The caller
 * cancels whatever it had queued for after `nowMs`.
 */
export function rewindPlayback(queue: PlaybackQueue, nowMs: number): PlaybackQueue {
  const firstFuture = queue.steps.find((step) => step.atMs > nowMs);
  if (firstFuture === undefined) {
    return queue;
  }
  return { cursor: firstFuture.before, steps: queue.steps.filter((step) => step.atMs <= nowMs) };
}

/**
 * Shifts the walk forward by the paused duration, using the same pause/
 * resume math the timer and session engines already use, so a resumed
 * session keeps exactly the remaining time it had (extraction doc §1.3).
 * Expects a queue already rewound at `pausedAtMs`.
 */
export function shiftPlaybackForResume(queue: PlaybackQueue, pausedAtMs: number, resumedAtMs: number): PlaybackQueue {
  if (queue.cursor === null) {
    return queue;
  }
  const { timerState, session } = queue.cursor;
  return {
    ...queue,
    cursor: {
      timerState: resumeTimer(pauseTimer(timerState, pausedAtMs), resumedAtMs),
      session: shiftSessionForResume(session, resumedAtMs - pausedAtMs),
    },
  };
}
