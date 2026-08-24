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
import { pause as pauseTimer, resume as resumeTimer, startTimer, tick } from "../timer/service";
import type { TimerConfig, TimerState } from "../timer/types";
import { createSession, decideInterruptionAction, sessionTick } from "./service";
import type { SessionState } from "./types";

const TICK_INTERVAL_MS = 200;

function toTimerConfig(settings: Settings): TimerConfig {
  return {
    totalRounds: settings.rounds,
    workDurationMs: settings.workDurationSec * 1000,
    restDurationMs: settings.restDurationSec * 1000,
    warmupDurationMs: settings.warmupDurationSec * 1000,
  };
}

export interface UseSessionResult {
  timerState: TimerState | null;
  session: SessionState;
  settings: Settings;
  audioError: boolean;
  start: () => void;
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
 * Reads settings/punches/presets once on mount -- there's no Settings
 * screen yet (Phase 8) to edit them mid-session, so this is intentionally
 * read-only for now.
 */
export function useSession(): UseSessionResult {
  const [settings] = useState<Settings>(() => getSettings());
  const [punches] = useState<Punch[]>(() => getPunches());
  const [presets] = useState<Preset[]>(() => getPresets());
  const configRef = useRef<TimerConfig>(toTimerConfig(settings));

  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [session, setSession] = useState<SessionState>(() => createSession());
  const [audioError, setAudioError] = useState(false);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const speechEngineRef = useRef<SpeechEngine | null>(null);
  const pausedByInterruptionRef = useRef(false);

  useEffect(() => {
    const initEngines = () => {
      try {
        const audioEngine = createAudioEngine();
        const speechEngine = createSpeechEngine();
        audioEngine.setVolume(settings.appVolume);
        speechEngine.setVolume(settings.appVolume);
        speechEngine.setRate(settings.speechRate);
        audioEngineRef.current = audioEngine;
        speechEngineRef.current = speechEngine;
      } catch {
        // "The timer still runs visually ... with a small persistent banner"
        // -- docs/user-flows.md's proposed default for this edge case.
        setAudioError(true);
      }
    };
    initEngines();
  }, [settings]);

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

        setSession((prevSession) => {
          const { session: nextSession, actions } = sessionTick(
            prevSession,
            nextTimerState,
            settings,
            punches,
            presets,
            now,
          );
          actions.forEach((action) => {
            if (action.type === "speak-combo") {
              action.combo.forEach((punch) => {
                speechEngineRef.current?.playWord(resolveAnnounceText(punch, settings.announceStyle));
              });
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
  }, [settings, punches, presets]);

  const start = useCallback(() => {
    pausedByInterruptionRef.current = false;
    setTimerState(startTimer(configRef.current, Date.now()));
    setSession(createSession());
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
        return resumeTimer(prev, now);
      }
      showSessionNotification("paused");
      return pauseTimer(prev, now);
    });
  }, []);

  const reset = useCallback(() => {
    pausedByInterruptionRef.current = false;
    setTimerState(null);
    setSession(createSession());
    hideSessionNotification();
  }, []);

  return { timerState, session, settings, audioError, start, togglePause, reset };
}
