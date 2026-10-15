import { mapEventToCue } from "../audio/service";
import type { CueName } from "../audio/types";
import { resolveAnnounceText } from "../comboEngine/service";
import type { Preset, Punch, Settings } from "../settings/types";
import { nextEventTime, startTimer, tick } from "../timer/service";
import type { RandomFn, TimerConfig } from "../timer/types";
import { createSession, sessionTick } from "./service";
import type { ActiveTemplateSession } from "./types";

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

/**
 * Belt-and-suspenders only. 0s work/rest is a real, pickable config, but
 * tick() cascades through zero-length phases within a single call, so the
 * loop below still advances (see schedule.test.ts's zero-duration cases).
 * This exists to fail loudly instead of hanging the JS thread if a future
 * engine change ever breaks that.
 */
const MAX_SCHEDULE_ITERATIONS = 100_000;

/**
 * Precomputes an entire session's cue and combo/defense-cue timeline as
 * plain data, up front, by walking `tick()`/`sessionTick()` from event to
 * event (via timer/service.ts's `nextEventTime`) rather than polling them
 * every 200ms. Both are already pure and fully deterministic given an
 * injected `RandomFn` and an advancing `now`, so a whole session is
 * computable in one pass -- see PROJECT_FACTS.md's 2026-09-19 background-
 * audio spike, which is *why* this exists: a JS interval cannot be relied
 * on once the app is backgrounded, but `AudioBufferSourceNode.start(when)`
 * can be scheduled from this data ahead of time and will still fire.
 *
 * Deliberately does not itself touch AudioContext, MMKV, or any native
 * call -- this stays pure and exact-value testable, matching every other
 * engine in this codebase. The impure consumer (useSession.ts) turns this
 * data into real scheduled playback.
 */
export function buildSessionSchedule(
  config: TimerConfig,
  settings: Settings,
  punches: Punch[],
  presets: Preset[],
  activeTemplate: ActiveTemplateSession | null,
  startAtMs: number,
  random: RandomFn = Math.random,
): SessionSchedule {
  const cues: ScheduledCue[] = [];
  const speech: ScheduledSpeech[] = [];

  let timerState = startTimer(config, startAtMs, random);

  // startTimer computes the first TimerState directly rather than through
  // tick() (there's no prior state to transition from), so it never emits
  // a TimerEvent on its own -- see useSession.ts's start(), which fires
  // this same synthetic first phase-changed cue for the identical reason:
  // otherwise Round 1's bell would silently never sound whenever warmup is
  // off (the default).
  const firstCue = mapEventToCue({ type: "phase-changed", phase: timerState.phase, round: timerState.round });
  if (firstCue) {
    cues.push({ atMs: startAtMs, cue: firstCue });
  }

  // Seeds nextComboAt from firstComboAt (and nextDefenseCueAt, if enabled)
  // at the exact start instant -- no action fires yet, since firstComboAt
  // is always in the future relative to startAtMs.
  let session = createSession();
  ({ session } = sessionTick(session, timerState, settings, punches, presets, startAtMs, random, activeTemplate));

  let cursor = startAtMs;
  let iterations = 0;

  while (timerState.phase !== "finished") {
    iterations += 1;
    if (iterations > MAX_SCHEDULE_ITERATIONS) {
      throw new Error("buildSessionSchedule: exceeded max iterations -- check for a zero-duration phase in config");
    }

    // nextEventTime is never null here: the loop condition excludes
    // "finished", and this walk never pauses.
    const candidates = [nextEventTime(timerState, config), session.nextComboAt, session.nextDefenseCueAt].filter(
      (candidate): candidate is number => candidate !== null,
    );
    cursor = Math.min(...candidates);

    const tickResult = tick(timerState, config, cursor, random);
    timerState = tickResult.state;
    for (const event of tickResult.events) {
      const cue = mapEventToCue(event);
      if (cue) {
        cues.push({ atMs: cursor, cue });
      }
    }

    const sessionResult = sessionTick(session, timerState, settings, punches, presets, cursor, random, activeTemplate);
    session = sessionResult.session;
    for (const action of sessionResult.actions) {
      if (action.type === "speak-combo") {
        const words = action.combo.map((punch) => resolveAnnounceText(punch, settings.announceStyle));
        speech.push({ atMs: cursor, words });
      } else {
        speech.push({ atMs: cursor, words: [action.cue] });
      }
    }
  }

  return { cues, speech, finishesAtMs: cursor };
}
