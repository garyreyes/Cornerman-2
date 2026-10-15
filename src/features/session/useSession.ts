import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { createAudioEngine } from "../audio/service";
import type { AudioEngine } from "../audio/types";
import type { Combo } from "../comboEngine/types";
import {
  hideSessionNotification,
  initBackgroundAudioSession,
  showSessionNotification,
  subscribeToInterruptions,
} from "../../lib/backgroundAudio";
import { createSpeechEngine } from "../speech/service";
import type { SpeechEngine } from "../speech/types";
import { getPresets, getPunches, getSettings } from "../settings/service";
import type { Preset, Punch, Settings } from "../settings/types";
import {
  effectiveRestDurationMs,
  effectiveWorkDurationMs,
  pause as pauseTimer,
  resume as resumeTimer,
  startTimer,
  tick,
} from "../timer/service";
import type { TimerConfig, TimerState } from "../timer/types";
import { consumePendingTemplateStart } from "../workoutTemplates/pendingStart";
import { getWorkoutTemplates, toTimerConfig as templateToTimerConfig } from "../workoutTemplates/service";
import type { RoundConfig, WorkoutTemplate } from "../workoutTemplates/types";
import type { ScheduleInputs } from "./schedule";
import { decideInterruptionAction } from "./service";
import type { ActiveTemplateSession } from "./types";
import { usePlayback } from "./usePlayback";

const TICK_INTERVAL_MS = 200;

function toTimerConfig(settings: Settings): TimerConfig {
  return {
    totalRounds: settings.rounds,
    workDurationMs: settings.workDurationSec * 1000,
    restDurationMs: settings.restDurationSec * 1000,
    warmupDurationMs: settings.warmupDurationSec * 1000,
  };
}

/** The active phase's actual effective duration (round-override aware) --
 * null outside an active phase (Ready has no TimerState yet; Finished has
 * no ring to size). Pure, so it's safe to call from either start() or the
 * tick loop below without touching a ref during render. */
function computePhaseDurationMs(config: TimerConfig, state: TimerState): number | null {
  if (state.phase === "warmup") {
    return config.warmupDurationMs;
  }
  if (state.phase === "rest") {
    return effectiveRestDurationMs(config, state.round);
  }
  if (state.phase === "work") {
    return effectiveWorkDurationMs(config, state.round);
  }
  return null;
}

export interface UseSessionResult {
  timerState: TimerState | null;
  /** The most recently spoken combo; stays visible through Rest. */
  currentCombo: Combo | null;
  comboCount: number;
  settings: Settings;
  audioError: boolean;
  /** The active session's actual round total -- configRef's snapshot once
   * running (which may be a template's roundPlan.length, not
   * settings.rounds), else settings.rounds as a Ready-state preview. */
  totalRounds: number;
  /** The current phase's actual effective duration in ms (round-override
   * aware), for the countdown ring's sweep fraction -- null in Ready/
   * Finished, where no ring is shown. Deliberately not derived from
   * `settings` directly (see this hook's own note on why): a template
   * round's own duration can differ from `settings.workDurationSec`. */
  phaseDurationMs: number | null;
  /** The running round's own entry in a template's round plan, for the
   * focus/cue shown on screen. Null outside a template-driven session, and
   * during Warmup/Finished, where no round is running. */
  currentRoundConfig: RoundConfig | null;
  /** Boxing only -- Main Timer has no Assault-Bike Session logic (that's
   * Phase 11b+'s own screen, per docs/user-flows.md Flow 7). Narrowed at
   * the type level, not just a runtime check, so passing the wrong
   * workoutType is a compile error at the call site. */
  start: (template?: Extract<WorkoutTemplate, { workoutType: "boxing" }>) => void;
  togglePause: () => void;
  reset: () => void;
}

/**
 * Wires the session's pure engines to native audio. Every bell, clap,
 * tick and call-out is queued ahead on the audio clock by usePlayback,
 * from the precomputed schedule in schedule.ts -- not fired from the 200ms
 * loop below, which only drives the display. A JS timer stops once the app
 * is backgrounded or the screen locks; the audio clock doesn't (see
 * PROJECT_FACTS.md's 2026-09-19 spike). The pure engines carry the real
 * test coverage; this native wiring is untested, as before.
 *
 * settings/punches/presets are re-synced from storage whenever this
 * screen regains focus -- e.g. returning from Settings/Punches after a
 * change -- and anything already queued after that moment is regenerated,
 * so the change reaches an already-running session instead of only the
 * next one (fixed 2026-08-25 after the user found a disabled punch still
 * getting called out; see PROJECT_FACTS.md). This is sufficient, not a
 * compromise: settings can only change via navigating to Settings/Punches
 * and back, which is exactly a focus transition. An earlier version of
 * that fix polled storage every 200ms tick instead -- that starved the JS
 * thread enough to make the Settings screen's scroll wheels unresponsive,
 * and was reverted (see PROJECT_FACTS.md). Playback reads these from refs,
 * not state, so nothing re-subscribes when they change.
 *
 * Round *structure* (rounds/work/rest/warmup duration) is the one
 * exception to "live": snapshotted into `configRef` once, when `start()`
 * is called, and held fixed for that session -- changing it mid-round
 * would require re-deriving `phaseEndAt`/`firstComboAt` from a moving
 * target, which nobody asked for and risks genuinely undefined timer
 * states.
 */
export function useSession(): UseSessionResult {
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const settingsRef = useRef<Settings>(settings);
  const punchesRef = useRef<Punch[]>(getPunches());
  const presetsRef = useRef<Preset[]>(getPresets());
  const configRef = useRef<TimerConfig>(toTimerConfig(getSettings()));
  // Non-null only for a template-driven session -- see this hook's own
  // start()/ActiveTemplateSession notes. Snapshotted alongside configRef,
  // held fixed for the same reason (round *structure* doesn't change
  // mid-session).
  const activeTemplateRef = useRef<ActiveTemplateSession | null>(null);

  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [audioError, setAudioError] = useState(false);
  // Mirrors of configRef's derived values, kept as real state rather than
  // read from the ref during render (ESLint's react-hooks/refs rule --
  // ref reads belong in effects/callbacks, not render). Updated at the
  // same two places configRef.current itself changes: start() and the
  // tick loop below. null lastStartedTotalRounds means "no session
  // started yet" -- see totalRounds' derivation below.
  const [phaseDurationMs, setPhaseDurationMs] = useState<number | null>(null);
  const [lastStartedTotalRounds, setLastStartedTotalRounds] = useState<number | null>(null);
  /** Same mirror-the-ref-into-state reason as the two above: the screen
   * shows the running round's own focus/cue, and a ref can't be read during
   * render. Null for a Settings-driven quick-start, which has no round plan. */
  const [activeRoundPlan, setActiveRoundPlan] = useState<RoundConfig[] | null>(null);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const speechEngineRef = useRef<SpeechEngine | null>(null);
  const pausedByInterruptionRef = useRef(false);
  /** When the running session was paused; null while running or idle. */
  const pausedAtRef = useRef<number | null>(null);

  const getScheduleInputs = useCallback(
    (): ScheduleInputs => ({
      config: configRef.current,
      settings: settingsRef.current,
      punches: punchesRef.current,
      presets: presetsRef.current,
      activeTemplate: activeTemplateRef.current,
      random: Math.random,
    }),
    [],
  );
  const playback = usePlayback(getScheduleInputs, audioEngineRef, speechEngineRef);
  const { begin, topUp, pause: pausePlayback, resume: resumePlayback, reschedule, end } = playback;

  // Cue/bell playback (bell, clapper, countdown tick) never depends on
  // voice -- built once and left alone for the hook's lifetime.
  useEffect(() => {
    const initAudioEngine = () => {
      try {
        audioEngineRef.current = createAudioEngine();
      } catch {
        // "The timer still runs visually ... with a small persistent banner"
        // -- docs/user-flows.md's proposed default for this edge case.
        setAudioError(true);
      }
    };
    initAudioEngine();
  }, []);

  // Rebuilds the speech engine only when the *voice itself* changes --
  // `settings.ttsVoice` is a primitive dep, so this only re-fires on a real
  // value change. appVolume/speechRate don't need a rebuild; they're
  // applied live via setVolume/setRate. Builds the replacement before
  // touching the ref, and only closes the previous engine once the new one
  // is confirmed working -- a failed voice *switch* keeps the old (working)
  // engine rather than surfacing the "sound unavailable" banner for a
  // problem that isn't "sound is unavailable". Closing the old engine
  // silences whatever it had queued, so a running session re-queues onto
  // the new one.
  useEffect(() => {
    const rebuildSpeechEngine = () => {
      let nextEngine: SpeechEngine;
      try {
        nextEngine = createSpeechEngine(settings.ttsVoice);
      } catch {
        if (speechEngineRef.current === null) {
          setAudioError(true);
        }
        return;
      }
      const previous = speechEngineRef.current;
      speechEngineRef.current = nextEngine;
      if (previous !== null) {
        void previous.close();
        reschedule(Date.now());
      }
    };
    rebuildSpeechEngine();
  }, [settings.ttsVoice, reschedule]);

  // Fires on mount (this screen is already focused then) and again every
  // time it regains focus -- e.g. returning from Settings/Punches. Declared
  // after the engine-construction effects above so on mount, by the time
  // volume/rate get applied, the engines those calls target already exist.
  useFocusEffect(
    useCallback(() => {
      const freshSettings = getSettings();
      settingsRef.current = freshSettings;
      setSettings(freshSettings);
      punchesRef.current = getPunches();
      presetsRef.current = getPresets();
      audioEngineRef.current?.setVolume(freshSettings.appVolume);
      speechEngineRef.current?.setVolume(freshSettings.appVolume);
      speechEngineRef.current?.setRate(freshSettings.speechRate);
      reschedule(Date.now());
    }, [reschedule]),
  );

  const pauseSession = useCallback(
    (now: number) => {
      if (pausedAtRef.current !== null || !pausePlayback(now)) {
        return;
      }
      pausedAtRef.current = now;
      setTimerState((prev) => (prev === null ? prev : pauseTimer(prev, now)));
      showSessionNotification("paused");
    },
    [pausePlayback],
  );

  const resumeSession = useCallback(
    (now: number) => {
      const pausedAt = pausedAtRef.current;
      if (pausedAt === null) {
        return;
      }
      pausedAtRef.current = null;
      resumePlayback(pausedAt, now);
      setTimerState((prev) => (prev === null ? prev : resumeTimer(prev, now)));
      showSessionNotification("playing");
    },
    [resumePlayback],
  );

  useEffect(() => {
    initBackgroundAudioSession();

    const unsubscribe = subscribeToInterruptions((event) => {
      const decision = decideInterruptionAction(event, pausedAtRef.current !== null, pausedByInterruptionRef.current);
      pausedByInterruptionRef.current = decision.pausedByInterruption;
      if (decision.shouldPause) {
        pauseSession(Date.now());
      } else if (decision.shouldResume) {
        resumeSession(Date.now());
      }
    });

    return unsubscribe;
  }, [pauseSession, resumeSession]);

  // Display only -- no audio fires from here. Also tops up playback while
  // the app is awake, as a backstop to each sound's own onEnded.
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      topUp(now);

      setTimerState((prevTimerState) => {
        if (prevTimerState === null) {
          return prevTimerState;
        }
        const { state: nextTimerState, events } = tick(prevTimerState, configRef.current, now);
        if (events.some((event) => event.type === "session-finished")) {
          hideSessionNotification();
        }
        // React bails out of re-rendering when the value is unchanged (most
        // ticks don't cross a phase/round boundary).
        setPhaseDurationMs(computePhaseDurationMs(configRef.current, nextTimerState));
        return nextTimerState;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [topUp]);

  const start = useCallback(
    (template?: Extract<WorkoutTemplate, { workoutType: "boxing" }>) => {
      pausedByInterruptionRef.current = false;
      pausedAtRef.current = null;
      // Snapshot round *structure* fresh, at the moment Start is pressed,
      // and hold it fixed for the rest of this session -- see this hook's
      // own doc comment for why. A template, when passed, drives this
      // instead of Settings -- Phase 10d.
      if (template) {
        configRef.current = templateToTimerConfig(template.config);
        activeTemplateRef.current = {
          roundPlan: template.config.roundPlan,
          baseComboGapMinSec: template.config.baseComboGapMinSec,
          baseComboGapMaxSec: template.config.baseComboGapMaxSec,
        };
        setActiveRoundPlan(template.config.roundPlan);
      } else {
        configRef.current = toTimerConfig(getSettings());
        activeTemplateRef.current = null;
        setActiveRoundPlan(null);
      }
      const now = Date.now();
      const initial = startTimer(configRef.current, now);
      // Queues the opening bell (schedule.ts fires it for the first phase,
      // which startTimer itself never emits an event for) and everything
      // after it.
      begin(now);
      setTimerState(initial);
      setLastStartedTotalRounds(configRef.current.totalRounds);
      setPhaseDurationMs(computePhaseDurationMs(configRef.current, initial));
      showSessionNotification("playing");
    },
    [begin],
  );

  const togglePause = useCallback(() => {
    pausedByInterruptionRef.current = false;
    if (pausedAtRef.current === null) {
      pauseSession(Date.now());
    } else {
      resumeSession(Date.now());
    }
  }, [pauseSession, resumeSession]);

  const reset = useCallback(() => {
    pausedByInterruptionRef.current = false;
    pausedAtRef.current = null;
    activeTemplateRef.current = null;
    end();
    setTimerState(null);
    setPhaseDurationMs(null);
    setLastStartedTotalRounds(null);
    setActiveRoundPlan(null);
    hideSessionNotification();
  }, [end]);

  // Consumes a "start this template" signal left by the Templates Picker
  // (docs/user-flows.md Flow 6: tapping a template starts it directly, no
  // separate confirmation) -- Main Timer stays mounted underneath
  // Templates the whole time, so router.back() alone carries no params to
  // signal this; see workoutTemplates/pendingStart.ts.
  useFocusEffect(
    useCallback(() => {
      const pendingId = consumePendingTemplateStart();
      if (pendingId === null) {
        return;
      }
      const template = getWorkoutTemplates().find((t) => t.id === pendingId);
      // Belt-and-suspenders with the Picker's own guard (templates/index.tsx's
      // handleStart) -- Main Timer must never attempt an assault-bike
      // template regardless of what set the signal.
      if (template?.workoutType === "boxing") {
        start(template);
      }
    }, [start]),
  );

  // While Ready (no session started yet), tracks settings.rounds live.
  // Once a session has started, freezes to whatever was snapshotted at
  // start(), even after settings.rounds later changes.
  const totalRounds = timerState === null ? settings.rounds : (lastStartedTotalRounds ?? settings.rounds);

  // Warmup runs before round 1 and Finished after the last, so neither has
  // a round whose focus to show.
  const isRunningARound = timerState !== null && (timerState.phase === "work" || timerState.phase === "rest");
  const currentRoundConfig =
    isRunningARound && activeRoundPlan !== null ? (activeRoundPlan[timerState.round - 1] ?? null) : null;

  return {
    timerState,
    currentCombo: playback.currentCombo,
    comboCount: playback.comboCount,
    settings,
    audioError,
    totalRounds,
    phaseDurationMs,
    currentRoundConfig,
    start,
    togglePause,
    reset,
  };
}
