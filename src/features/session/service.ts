import { generateCombo } from "../comboEngine/service";
import { nextDefenseCueFireTime, pickDefenseCue } from "../defenseCues/service";
import { nextGapFireTime } from "../../lib/gapTiming";
import type { Preset, Punch, Settings } from "../settings/types";
import type { TimerState } from "../timer/types";
import type {
  InterruptionDecision,
  InterruptionEvent,
  RandomFn,
  SessionAction,
  SessionState,
} from "./types";

export function createSession(): SessionState {
  return { nextComboAt: null, nextDefenseCueAt: null, currentCombo: null, comboCount: 0 };
}

/**
 * The recurring "what should fire now" decision, mirroring timer/service.ts's
 * tick(): a pure function returning descriptive actions rather than calling
 * speech/audio directly, so the decision logic is testable and the actual
 * native calls live in a thin, untested consumer (session/useSession.ts).
 *
 * Combo timing seeds from timerState.firstComboAt (the proven clamped-window
 * first-combo calculation already in the timer engine), then re-arms itself
 * using settings.comboGapMin/MaxSec via the same shared nextGapFireTime
 * primitive timer/service.ts uses. Defense-cue timing is fully independent
 * (its own gap range, its own arm/fire cycle) -- deliberately not mixed into
 * combo scheduling, matching how Combo/comboEngine stays untouched.
 *
 * Never fires more than one action of a given kind per call, even after a
 * large jump in `now` (app resumed after backgrounding) -- same
 * non-retroactive philosophy as tick()'s rest-countdown latch: reschedule
 * forward from `now`, don't burst-replay everything that was missed.
 */
export function sessionTick(
  session: SessionState,
  timerState: TimerState,
  settings: Settings,
  punches: Punch[],
  presets: Preset[],
  now: number,
  random: RandomFn = Math.random,
): { session: SessionState; actions: SessionAction[] } {
  const actions: SessionAction[] = [];
  let s = session;

  if (timerState.phase !== "work") {
    if (s.nextComboAt !== null || s.nextDefenseCueAt !== null) {
      s = { ...s, nextComboAt: null, nextDefenseCueAt: null };
    }
    return { session: s, actions };
  }

  if (s.nextComboAt === null && timerState.firstComboAt !== null) {
    s = { ...s, nextComboAt: timerState.firstComboAt };
  }
  if (s.nextComboAt !== null && now >= s.nextComboAt) {
    const combo = generateCombo(settings, punches, presets, random);
    actions.push({ type: "speak-combo", combo });
    s = {
      ...s,
      currentCombo: combo,
      comboCount: s.comboCount + 1,
      nextComboAt: nextGapFireTime(now, settings.comboGapMinSec * 1000, settings.comboGapMaxSec * 1000, random),
    };
  }

  if (settings.defenseCuesEnabled) {
    if (s.nextDefenseCueAt === null) {
      s = { ...s, nextDefenseCueAt: nextDefenseCueFireTime(now, settings, random) };
    }
    if (s.nextDefenseCueAt !== null && now >= s.nextDefenseCueAt) {
      const cue = pickDefenseCue(random);
      actions.push({ type: "speak-defense-cue", cue });
      s = { ...s, nextDefenseCueAt: nextDefenseCueFireTime(now, settings, random) };
    }
  }

  return { session: s, actions };
}

/**
 * Decides how to react to a native audio-focus interruption (phone call,
 * another app taking audio focus) -- Phase 2b's pause()/resume() only ever
 * built the *mechanism*, not detection; this is that missing decision,
 * wired to the real event by Phase 7a's useSession.ts.
 *
 * The one subtlety worth a named function for: an "ended, shouldResume"
 * event must never auto-resume a timer the *user* paused manually before
 * the interruption started -- only a pause this same function caused
 * (tracked via the returned pausedByInterruption flag, round-tripped back
 * in on the next call) is eligible to be auto-resumed.
 */
export function decideInterruptionAction(
  event: InterruptionEvent,
  isPaused: boolean,
  pausedByInterruption: boolean,
): InterruptionDecision {
  if (event.type === "began") {
    if (isPaused) {
      return { shouldPause: false, shouldResume: false, pausedByInterruption };
    }
    return { shouldPause: true, shouldResume: false, pausedByInterruption: true };
  }

  if (pausedByInterruption && event.shouldResume) {
    return { shouldPause: false, shouldResume: true, pausedByInterruption: false };
  }
  return { shouldPause: false, shouldResume: false, pausedByInterruption: false };
}
