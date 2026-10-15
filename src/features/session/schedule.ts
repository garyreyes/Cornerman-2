import { mapEventToCue } from "../audio/service";
import type { CueName } from "../audio/types";
import { resolveAnnounceText } from "../comboEngine/service";
import type { Combo } from "../comboEngine/types";
import type { Preset, Punch, Settings } from "../settings/types";
import { nextEventTime, startTimer, tick } from "../timer/service";
import type { RandomFn, TimerConfig, TimerState } from "../timer/types";
import { createSession, sessionTick } from "./service";
import type { ActiveTemplateSession, SessionState } from "./types";

export interface ScheduledCue {
  /** Absolute wall-clock ms, same clock as the `startAtMs` this was built from. */
  atMs: number;
  cue: CueName;
}

export interface ScheduledSpeech {
  atMs: number;
  /** A combo's punch words in order, or a single defense/movement cue word. */
  words: string[];
}

export interface SessionSchedule {
  cues: ScheduledCue[];
  speech: ScheduledSpeech[];
  /** When session-finished fires -- the last moment anything in this schedule happens. */
  finishesAtMs: number;
}

export type ScheduledItem =
  | { kind: "cue"; atMs: number; cue: CueName }
  | { kind: "combo"; atMs: number; words: string[]; combo: Combo }
  | { kind: "defense"; atMs: number; words: string[] };

/** Everything the walk reads besides its own position. Re-read on every
 * step, so a settings change reaches whatever is generated after it. */
export interface ScheduleInputs {
  config: TimerConfig;
  settings: Settings;
  punches: Punch[];
  presets: Preset[];
  activeTemplate: ActiveTemplateSession | null;
  random: RandomFn;
}

/** The walk's position: the engine states right after the last step. */
export interface ScheduleCursor {
  timerState: TimerState;
  session: SessionState;
}

/** Everything that happens at one instant. */
export interface ScheduleStep {
  atMs: number;
  items: ScheduledItem[];
}

/**
 * Belt-and-suspenders only. 0s work/rest is a real, pickable config, but
 * tick() cascades through zero-length phases within a single call, so the
 * walk still advances (see schedule.test.ts's zero-duration cases). This
 * exists to fail loudly instead of hanging the JS thread if a future
 * engine change ever breaks that.
 */
const MAX_SCHEDULE_ITERATIONS = 100_000;

/**
 * The session's first step, at `startAtMs`. startTimer computes the first
 * TimerState directly rather than through tick(), so it never emits a
 * TimerEvent on its own -- this fires the same phase-changed cue tick()
 * would have, or Round 1's bell would never sound whenever warmup is off
 * (the default). Also seeds nextComboAt from firstComboAt (and
 * nextDefenseCueAt, if enabled); no speech fires yet, since firstComboAt is
 * always in the future relative to the start.
 */
export function startSchedule(inputs: ScheduleInputs, startAtMs: number): { cursor: ScheduleCursor; step: ScheduleStep } {
  const { config, settings, punches, presets, activeTemplate, random } = inputs;
  const timerState = startTimer(config, startAtMs, random);

  const items: ScheduledItem[] = [];
  const firstCue = mapEventToCue({ type: "phase-changed", phase: timerState.phase, round: timerState.round });
  if (firstCue) {
    items.push({ kind: "cue", atMs: startAtMs, cue: firstCue });
  }

  const { session } = sessionTick(createSession(), timerState, settings, punches, presets, startAtMs, random, activeTemplate);
  return { cursor: { timerState, session }, step: { atMs: startAtMs, items } };
}

/**
 * Walks `tick()`/`sessionTick()` forward to the next instant anything
 * happens (via timer/service.ts's `nextEventTime`), rather than polling
 * them every 200ms. Both are pure and deterministic given the injected
 * `RandomFn`, so this is too. `null` once the session has finished.
 *
 * Exists because a JS interval cannot be relied on once the app is
 * backgrounded, but `AudioBufferSourceNode.start(when)` can be scheduled
 * from this data ahead of time and will still fire -- see PROJECT_FACTS.md's
 * 2026-09-19 background-audio spike.
 */
export function advanceSchedule(
  cursor: ScheduleCursor,
  inputs: ScheduleInputs,
): { cursor: ScheduleCursor; step: ScheduleStep } | null {
  if (cursor.timerState.phase === "finished") {
    return null;
  }
  const { config, settings, punches, presets, activeTemplate, random } = inputs;

  // nextEventTime is never null here: "finished" returned above, and this
  // walk never pauses.
  const candidates = [nextEventTime(cursor.timerState, config), cursor.session.nextComboAt, cursor.session.nextDefenseCueAt].filter(
    (candidate): candidate is number => candidate !== null,
  );
  const atMs = Math.min(...candidates);
  const items: ScheduledItem[] = [];

  const tickResult = tick(cursor.timerState, config, atMs, random);
  for (const event of tickResult.events) {
    const cue = mapEventToCue(event);
    if (cue) {
      items.push({ kind: "cue", atMs, cue });
    }
  }

  const sessionResult = sessionTick(cursor.session, tickResult.state, settings, punches, presets, atMs, random, activeTemplate);
  for (const action of sessionResult.actions) {
    if (action.type === "speak-combo") {
      const words = action.combo.map((punch) => resolveAnnounceText(punch, settings.announceStyle));
      items.push({ kind: "combo", atMs, words, combo: action.combo });
    } else {
      items.push({ kind: "defense", atMs, words: [action.cue] });
    }
  }

  return { cursor: { timerState: tickResult.state, session: sessionResult.session }, step: { atMs, items } };
}

/** A whole session's timeline in one pass -- the step-by-step walk above,
 * run to the end. */
export function buildSessionSchedule(
  config: TimerConfig,
  settings: Settings,
  punches: Punch[],
  presets: Preset[],
  activeTemplate: ActiveTemplateSession | null,
  startAtMs: number,
  random: RandomFn = Math.random,
): SessionSchedule {
  const inputs: ScheduleInputs = { config, settings, punches, presets, activeTemplate, random };
  const cues: ScheduledCue[] = [];
  const speech: ScheduledSpeech[] = [];

  const collect = (step: ScheduleStep) => {
    for (const item of step.items) {
      if (item.kind === "cue") {
        cues.push({ atMs: item.atMs, cue: item.cue });
      } else {
        speech.push({ atMs: item.atMs, words: item.words });
      }
    }
  };

  const start = startSchedule(inputs, startAtMs);
  collect(start.step);
  let cursor = start.cursor;
  let finishesAtMs = startAtMs;

  for (let iterations = 1; ; iterations++) {
    if (iterations > MAX_SCHEDULE_ITERATIONS) {
      throw new Error("buildSessionSchedule: exceeded max iterations -- the walk stopped advancing");
    }
    const next = advanceSchedule(cursor, inputs);
    if (next === null) {
      break;
    }
    collect(next.step);
    cursor = next.cursor;
    finishesAtMs = next.step.atMs;
  }

  return { cues, speech, finishesAtMs };
}
