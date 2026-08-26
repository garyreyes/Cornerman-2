import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { createAudioEngine } from "../audio/service";
import type { AudioEngine } from "../audio/types";
import { resolveAnnounceText } from "../comboEngine/service";
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
import type { WorkoutTemplate } from "../workoutTemplates/types";
import { createSession, decideInterruptionAction, sessionTick, shiftSessionForResume } from "./service";
import type { ActiveTemplateSession, SessionState } from "./types";

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
  session: SessionState;
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
  start: (template?: WorkoutTemplate) => void;
  togglePause: () => void;
  reset: () => void;
}

/**
 * The untested effect-loop consumer of session/service.ts's pure
 * sessionTick decisions -- native audio/speech calls and the poll-interval
 * live here, matching how audio/speech's own native wiring was never unit
 * tested (see PROJECT_FACTS.md); sessionTick and tick() carry the real
 * test coverage.
 *
 * settings/punches/presets are re-synced from storage whenever this
 * screen regains focus -- e.g. returning from Settings/Punches after a
 * change -- so that change reaches an already-running session instead of
 * only the next one (fixed 2026-08-25 after the user found a disabled
 * punch still getting called out; see PROJECT_FACTS.md). This is
 * sufficient, not a compromise: settings can only change via navigating
 * to Settings/Punches and back, which is exactly a focus transition, so
 * there's no real case this misses. An earlier version of this fix
 * polled storage every 200ms tick instead -- that forced a background
 * re-render of this hook's whole subtree 5x/sec for the app's entire
 * lifetime (even idle, even while a totally different screen had focus,
 * since Main Timer stays mounted underneath), which starved the JS
 * thread enough to make the Settings screen's pure-JS scroll wheels
 * unresponsive. Reverted for that reason -- see PROJECT_FACTS.md. The
 * tick loop itself reads punches/presets from refs (updated only on
 * focus), not state, so it never needs `[punches, presets]` in its
 * effect deps and never re-subscribes its interval.
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
  const [session, setSession] = useState<SessionState>(() => createSession());
  const [audioError, setAudioError] = useState(false);
  // Mirrors of configRef's derived values, kept as real state rather than
  // read from the ref during render (ESLint's react-hooks/refs rule --
  // ref reads belong in effects/callbacks, not render). Updated at the
  // same two places configRef.current itself changes: start() and the
  // tick loop below. null lastStartedTotalRounds means "no session
  // started yet" -- see totalRounds' derivation below.
  const [phaseDurationMs, setPhaseDurationMs] = useState<number | null>(null);
  const [lastStartedTotalRounds, setLastStartedTotalRounds] = useState<number | null>(null);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const speechEngineRef = useRef<SpeechEngine | null>(null);
  const pausedByInterruptionRef = useRef(false);

  // Cue/bell playback (bell, clapper, countdown tick) never depends on
  // voice -- built once and left alone for the hook's lifetime, same as
  // before this change.
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

  // Rebuilds the speech engine only when the *voice itself* changes, not
  // on every settings tick -- `settings.ttsVoice` is a primitive dep, so
  // this only re-fires on a real value change even though `settings` gets
  // a new object identity every tick. appVolume/speechRate don't need a
  // rebuild; they're applied live in the tick loop below via
  // setVolume/setRate. Builds the replacement before touching the ref, and
  // only closes the previous engine once the new one is confirmed working
  // -- a failed voice *switch* keeps the old (working) engine rather than
  // leaving playback broken or surfacing the "sound unavailable" banner
  // for a problem that isn't "sound is unavailable".
  useEffect(() => {
    const rebuildSpeechEngine = () => {
      let nextEngine: SpeechEngine;
      try {
        nextEngine = createSpeechEngine(settings.ttsVoice);
      } catch {
        if (speechEngineRef.current === null) {
          // Initial construction genuinely failed -- sound really is
          // unavailable, unlike a failed later voice *switch* (which just
          // keeps whatever engine was already working).
          setAudioError(true);
        }
        return;
      }
      const previous = speechEngineRef.current;
      speechEngineRef.current = nextEngine;
      if (previous !== null) {
        void previous.close();
      }
    };
    rebuildSpeechEngine();
  }, [settings.ttsVoice]);

  // Fires on mount (this screen is already focused then) and again every
  // time it regains focus -- e.g. returning from Settings/Punches. Updates
  // both the ref (what the tick loop below actually reads) and the state
  // (what triggers the ttsVoice-rebuild effect above and what's returned
  // to the UI) together. Declared after the engine-construction effects
  // above so on mount, by the time volume/rate get applied, the engines
  // those calls target already exist.
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
    }, []),
  );

  useEffect(() => {
    initBackgroundAudioSession();

    const unsubscribe = subscribeToInterruptions((event) => {
      setTimerState((prev) => {
        if (prev === null) {
          return prev;
        }
        const decision = decideInterruptionAction(event, prev.isPaused, pausedByInterruptionRef.current);
        pausedByInterruptionRef.current = decision.pausedByInterruption;
        const now = Date.now();
        if (decision.shouldPause) {
          showSessionNotification("paused");
          return pauseTimer(prev, now);
        }
        if (decision.shouldResume) {
          showSessionNotification("playing");
          if (prev.pausedAt !== null) {
            const pausedDurationMs = now - prev.pausedAt;
            setSession((prevSession) => shiftSessionForResume(prevSession, pausedDurationMs));
          }
          return resumeTimer(prev, now);
        }
        return prev;
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();

      setTimerState((prevTimerState) => {
        if (prevTimerState === null) {
          return prevTimerState;
        }

        const { state: nextTimerState, events } = tick(prevTimerState, configRef.current, now);
        events.forEach((event) => {
          audioEngineRef.current?.handleTimerEvent(event);
          if (event.type === "session-finished") {
            hideSessionNotification();
          }
        });
        // Piggybacks on this same 200ms cadence rather than adding a new
        // one -- React bails out of re-rendering when the value is
        // unchanged (the common case, most ticks don't cross a phase/
        // round boundary), so this doesn't add extra renders beyond what
        // setTimerState below already causes every tick.
        setPhaseDurationMs(computePhaseDurationMs(configRef.current, nextTimerState));

        setSession((prevSession) => {
          const { session: nextSession, actions } = sessionTick(
            prevSession,
            nextTimerState,
            settingsRef.current,
            punchesRef.current,
            presetsRef.current,
            now,
            Math.random,
            activeTemplateRef.current,
          );
          actions.forEach((action) => {
            if (action.type === "speak-combo") {
              const words = action.combo.map((punch) =>
                resolveAnnounceText(punch, settingsRef.current.announceStyle),
              );
              speechEngineRef.current?.playCombo(words);
            } else {
              speechEngineRef.current?.playWord(action.cue);
            }
          });
          return nextSession;
        });

        return nextTimerState;
      });
    }, TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  const start = useCallback((template?: WorkoutTemplate) => {
    pausedByInterruptionRef.current = false;
    // Snapshot round *structure* fresh, at the moment Start is pressed --
    // not whatever was true when this hook first mounted (previously
    // frozen forever via configRef's initial value, since Main Timer is
    // the app's one long-lived screen and this ref was never
    // re-derived). Held fixed for the rest of this session once started --
    // see this hook's own doc comment for why. A template, when passed,
    // drives this instead of Settings -- Phase 10d.
    if (template) {
      configRef.current = templateToTimerConfig(template.config);
      activeTemplateRef.current = {
        roundPlan: template.config.roundPlan,
        baseComboGapMinSec: template.config.baseComboGapMinSec,
        baseComboGapMaxSec: template.config.baseComboGapMaxSec,
      };
    } else {
      configRef.current = toTimerConfig(getSettings());
      activeTemplateRef.current = null;
    }
    const initial = startTimer(configRef.current, Date.now());
    // startTimer computes the first TimerState directly rather than going
    // through tick() (there's no prior state to transition from), so it
    // never emits a TimerEvent -- every later phase change fires one via
    // the tick loop below, but this very first one otherwise wouldn't,
    // meaning the bell would silently skip Round 1's start whenever
    // warmup is off (the default) and Start goes straight to Work. Fire
    // the same "phase-changed" event here that tick() would have, so
    // audioEngineRef's handleTimerEvent/mapEventToCue (bell on work/rest,
    // nothing on warmup/ready/finished) applies uniformly.
    audioEngineRef.current?.handleTimerEvent({ type: "phase-changed", phase: initial.phase, round: initial.round });
    setTimerState(initial);
    setSession(createSession());
    setLastStartedTotalRounds(configRef.current.totalRounds);
    setPhaseDurationMs(computePhaseDurationMs(configRef.current, initial));
    showSessionNotification("playing");
  }, []);

  const togglePause = useCallback(() => {
    pausedByInterruptionRef.current = false;
    setTimerState((prev) => {
      if (prev === null) {
        return prev;
      }
      const now = Date.now();
      if (prev.isPaused) {
        showSessionNotification("playing");
        if (prev.pausedAt !== null) {
          const pausedDurationMs = now - prev.pausedAt;
          setSession((prevSession) => shiftSessionForResume(prevSession, pausedDurationMs));
        }
        return resumeTimer(prev, now);
      }
      showSessionNotification("paused");
      return pauseTimer(prev, now);
    });
  }, []);

  const reset = useCallback(() => {
    pausedByInterruptionRef.current = false;
    activeTemplateRef.current = null;
    setTimerState(null);
    setSession(createSession());
    setPhaseDurationMs(null);
    setLastStartedTotalRounds(null);
    hideSessionNotification();
  }, []);

  // Consumes a "start this template" signal left by the Templates Picker
  // (docs/user-flows.md Flow 6: tapping a template starts it directly, no
  // separate confirmation) -- Main Timer stays mounted underneath
  // Templates the whole time, so router.back() alone carries no params to
  // signal this; see workoutTemplates/pendingStart.ts. Same
  // useFocusEffect timing as the settings/punches/presets resync above,
  // just a separate effect since it depends on `start` (declared after
  // that one).
  useFocusEffect(
    useCallback(() => {
      const pendingId = consumePendingTemplateStart();
      if (pendingId === null) {
        return;
      }
      const template = getWorkoutTemplates().find((t) => t.id === pendingId);
      if (template) {
        start(template);
      }
    }, [start]),
  );

  // While Ready (no session started yet), tracks settings.rounds live --
  // same preview behavior as before Phase 10d. Once a session has
  // started (quick-start or template), freezes to whatever was actually
  // snapshotted at start(), even after settings.rounds later changes.
  const totalRounds = timerState === null ? settings.rounds : (lastStartedTotalRounds ?? settings.rounds);

  return { timerState, session, settings, audioError, totalRounds, phaseDurationMs, start, togglePause, reset };
}
