import { generateCombo } from "../comboEngine/service";
import type { Combo } from "../comboEngine/types";
import { nextDefenseCueFireTime, pickDefenseCue } from "../defenseCues/service";
import { nextGapFireTime } from "../../lib/gapTiming";
import type { Preset, Punch, Settings } from "../settings/types";
import type { TimerState } from "../timer/types";
import { resolveRoundCombo } from "../workoutTemplates/service";
import type {
  ActiveTemplateSession,
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
 * Shifts `nextComboAt`/`nextDefenseCueAt` forward by the exact paused
 * duration on resume -- the SessionState counterpart to
 * timer/service.ts's `resume()`, which does the same for
 * `phaseEndAt`/`firstComboAt` (extraction doc §1.3's exact-remaining-time
 * fidelity). Without this, a combo/cue that was armed for some point
 * during the pause would fire the instant the session resumes instead of
 * waiting out whatever gap actually remained when it was paused. Leaves
 * null timestamps null (not in Work phase, or defense cues disabled).
 */
export function shiftSessionForResume(session: SessionState, pausedDurationMs: number): SessionState {
  return {
    ...session,
    nextComboAt: session.nextComboAt !== null ? session.nextComboAt + pausedDurationMs : null,
    nextDefenseCueAt: session.nextDefenseCueAt !== null ? session.nextDefenseCueAt + pausedDurationMs : null,
  };
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
/**
 * Resolves the combo to speak and the gap range to re-arm with -- branches
 * on whether a Workout Template (Phase 10+) is driving this session.
 * Template-driven: the *current round's own* comboSource (fixed-punch/
 * fixed-sequence/preset/random) via workoutTemplates' resolveRoundCombo,
 * and that round's own comboGapMin/MaxSec override when set, else the
 * template's base gap. Quick-start (activeTemplate null, the default):
 * unchanged -- Settings-driven generateCombo + settings.comboGapMin/MaxSec,
 * exactly as before this branch existed.
 */
function resolveComboAndGap(
  activeTemplate: ActiveTemplateSession | null,
  round: number,
  settings: Settings,
  punches: Punch[],
  presets: Preset[],
  random: RandomFn,
): { combo: Combo; gapMinSec: number; gapMaxSec: number } {
  if (activeTemplate === null) {
    return {
      combo: generateCombo(settings, punches, presets, random),
      gapMinSec: settings.comboGapMinSec,
      gapMaxSec: settings.comboGapMaxSec,
    };
  }
  const activeRound = activeTemplate.roundPlan[round - 1];
  // Round index out of range shouldn't happen (totalRounds is derived
  // from roundPlan.length -- see workoutTemplates/service.ts's
  // toTimerConfig), but degrade to the template's base gap + a random
  // draw rather than crashing, same graceful-fallback spirit as elsewhere.
  const source = activeRound?.comboSource ?? { type: "random" as const };
  return {
    combo: resolveRoundCombo(source, punches, presets, settings, random),
    gapMinSec: activeRound?.comboGapMinSec ?? activeTemplate.baseComboGapMinSec,
    gapMaxSec: activeRound?.comboGapMaxSec ?? activeTemplate.baseComboGapMaxSec,
  };
}

export function sessionTick(
  session: SessionState,
  timerState: TimerState,
  settings: Settings,
  punches: Punch[],
  presets: Preset[],
  now: number,
  random: RandomFn = Math.random,
  activeTemplate: ActiveTemplateSession | null = null,
): { session: SessionState; actions: SessionAction[] } {
  const actions: SessionAction[] = [];
  let s = session;

  // A paused TimerState never advances phase (tick() returns its input
  // state unchanged while isPaused -- see timer/service.ts), so without
  // this check `now` keeps racing ahead of `nextComboAt`/`nextDefenseCueAt`
  // in the background: combos and defense cues kept firing (and comboCount
  // kept climbing) for the whole duration of a "paused" session, which is
  // exactly the bug the user found by watching the combo counter climb
  // while paused. Left untouched (not reset to null, unlike the
  // leaving-Work-phase branch below) so the exact remaining gap survives a
  // resume -- see useSession.ts's togglePause, which shifts these forward
  // by the paused duration via shiftSessionForResume, mirroring how
  // timer/service.ts's own resume() preserves phaseEndAt/firstComboAt.
  if (timerState.isPaused) {
    return { session: s, actions };
  }

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
    const { combo, gapMinSec, gapMaxSec } = resolveComboAndGap(
      activeTemplate,
      timerState.round,
      settings,
      punches,
      presets,
      random,
    );
    actions.push({ type: "speak-combo", combo });
    s = {
      ...s,
      currentCombo: combo,
      comboCount: s.comboCount + 1,
      nextComboAt: nextGapFireTime(now, gapMinSec * 1000, gapMaxSec * 1000, random),
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
