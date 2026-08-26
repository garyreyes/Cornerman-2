import { nextGapFireTime } from "../../lib/gapTiming";
import type { Phase, RandomFn, TimerConfig, TimerEvent, TimerState } from "./types";

const FIRST_COMBO_MIN_MS = 500;
const FIRST_COMBO_MAX_MS = 1500; // clamped window (extraction doc §1.2)
const REST_COUNTDOWN_START_SEC = 3;
const WORK_WARNING_THRESHOLD_MS = 10_000;

/** `round`'s own override when present, else the base duration -- exported
 * so a display layer (e.g. the countdown ring's sweep fraction) can show
 * the same effective duration this engine actually timed the round with,
 * rather than re-deriving it (or worse, reading the wrong base value)
 * itself. Phase 10+ (Workout Templates) is the only current producer of
 * `roundOverrides`; with none set this is just `config.workDurationMs`. */
export function effectiveWorkDurationMs(config: TimerConfig, round: number): number {
  return config.roundOverrides?.[round - 1]?.workDurationMs ?? config.workDurationMs;
}

export function effectiveRestDurationMs(config: TimerConfig, round: number): number {
  return config.roundOverrides?.[round - 1]?.restDurationMs ?? config.restDurationMs;
}

function beginWork(
  round: number,
  transitionAt: number,
  config: TimerConfig,
  random: RandomFn,
): TimerState {
  return {
    phase: "work",
    round,
    phaseEndAt: transitionAt + effectiveWorkDurationMs(config, round),
    tenWarned: false,
    lastRestCountdown: null,
    firstComboAt: nextGapFireTime(transitionAt, FIRST_COMBO_MIN_MS, FIRST_COMBO_MAX_MS, random),
    isPaused: false,
    pausedAt: null,
  };
}

function beginRest(round: number, transitionAt: number, config: TimerConfig): TimerState {
  return {
    phase: "rest",
    round,
    phaseEndAt: transitionAt + effectiveRestDurationMs(config, round),
    tenWarned: false,
    lastRestCountdown: null,
    firstComboAt: null,
    isPaused: false,
    pausedAt: null,
  };
}

export function startTimer(
  config: TimerConfig,
  now: number,
  random: RandomFn = Math.random,
): TimerState {
  if (config.warmupDurationMs > 0) {
    return {
      phase: "warmup",
      round: 0,
      phaseEndAt: now + config.warmupDurationMs,
      tenWarned: false,
      lastRestCountdown: null,
      firstComboAt: null,
      isPaused: false,
      pausedAt: null,
    };
  }
  return beginWork(1, now, config, random);
}

const TICKING_PHASES: ReadonlySet<Phase> = new Set(["warmup", "work", "rest"]);

export function tick(
  state: TimerState,
  config: TimerConfig,
  now: number,
  random: RandomFn = Math.random,
): { state: TimerState; events: TimerEvent[] } {
  if (state.isPaused) {
    return { state, events: [] };
  }

  const events: TimerEvent[] = [];
  let s = state;

  while (TICKING_PHASES.has(s.phase) && now >= s.phaseEndAt) {
    if (s.phase === "warmup") {
      s = beginWork(1, s.phaseEndAt, config, random);
      events.push({ type: "phase-changed", phase: "work", round: s.round });
    } else if (s.phase === "work") {
      if (s.round >= config.totalRounds) {
        s = { ...s, phase: "finished", firstComboAt: null };
        events.push({ type: "phase-changed", phase: "finished", round: s.round });
        events.push({ type: "session-finished" });
      } else {
        s = beginRest(s.round, s.phaseEndAt, config);
        events.push({ type: "phase-changed", phase: "rest", round: s.round });
      }
    } else {
      // rest
      s = beginWork(s.round + 1, s.phaseEndAt, config, random);
      events.push({ type: "phase-changed", phase: "work", round: s.round });
    }
  }

  if (s.phase === "work" && !s.tenWarned && effectiveWorkDurationMs(config, s.round) > WORK_WARNING_THRESHOLD_MS) {
    const remainingMs = s.phaseEndAt - now;
    if (remainingMs <= WORK_WARNING_THRESHOLD_MS) {
      s = { ...s, tenWarned: true };
      events.push({ type: "work-warning" });
    }
  } else if (s.phase === "rest") {
    const remainingSec = Math.ceil((s.phaseEndAt - now) / 1000);
    if (
      remainingSec >= 1 &&
      remainingSec <= REST_COUNTDOWN_START_SEC &&
      (s.lastRestCountdown === null || remainingSec < s.lastRestCountdown)
    ) {
      const secondsRemaining = remainingSec as 3 | 2 | 1;
      s = { ...s, lastRestCountdown: secondsRemaining };
      events.push({ type: "rest-countdown", secondsRemaining });
    }
  }

  return { state: s, events };
}

/**
 * Freezes a running session exactly where it is. Detecting *why* to pause
 * (a phone call, losing audio focus) is native/platform wiring built
 * later (Phase 7) -- this is just the mechanism itself.
 */
export function pause(state: TimerState, now: number): TimerState {
  if (state.isPaused || !TICKING_PHASES.has(state.phase)) {
    return state;
  }
  return { ...state, isPaused: true, pausedAt: now };
}

/**
 * Resumes at exactly the remaining time captured at pause() -- every
 * forward-looking timestamp shifts by the paused duration rather than
 * being recomputed from wall-clock phase boundaries, which is what
 * avoids drift (extraction doc §1.3).
 */
export function resume(state: TimerState, now: number): TimerState {
  if (!state.isPaused || state.pausedAt === null) {
    return state;
  }
  const pausedDurationMs = now - state.pausedAt;
  return {
    ...state,
    isPaused: false,
    pausedAt: null,
    phaseEndAt: state.phaseEndAt + pausedDurationMs,
    firstComboAt: state.firstComboAt !== null ? state.firstComboAt + pausedDurationMs : null,
  };
}
