import { useCallback, useEffect, useRef, useState } from "react";

import { createAudioEngine } from "../audio/service";
import type { AudioEngine } from "../audio/types";
import { pause as pauseBike, resume as resumeBike, startBikeSession, tick } from "./service";
import type { BikeConfig, BikeState } from "./types";

const TICK_INTERVAL_MS = 200;

export interface UseBikeSessionResult {
  bikeState: BikeState | null;
  totalRounds: number;
  /** The current sub-phase's duration in ms; null in Ready/Finished. */
  phaseDurationMs: number | null;
  audioError: boolean;
  start: () => void;
  togglePause: () => void;
  reset: () => void;
}

/**
 * The Assault-Bike Session's own version of session/useSession.ts's
 * effect-loop pattern -- deliberately simpler: `config` comes from a
 * fixed WorkoutTemplate resolved once when this screen is entered (not
 * live, mutable Settings), so there's no need for useSession's
 * snapshot-into-a-ref-at-start() dance; a stable prop closure is enough.
 * No speech engine either -- the visual drill (Phase 11c) needs none;
 * the auditory drill (Corner Commands, Phase 11d) will need one, not
 * built yet.
 */
export function useBikeSession(config: BikeConfig): UseBikeSessionResult {
  const [bikeState, setBikeState] = useState<BikeState | null>(null);
  const [audioError, setAudioError] = useState(false);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    const initAudioEngine = () => {
      try {
        audioEngineRef.current = createAudioEngine();
      } catch {
        setAudioError(true);
      }
    };
    initAudioEngine();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      setBikeState((prev) => {
        if (prev === null) {
          return prev;
        }
        const { state: next, events } = tick(prev, config, now);
        events.forEach((event) => {
          if (event.type === "phase-changed" && (event.phase === "work" || event.phase === "settle")) {
            // Bell marks the all-out/recovery boundary, mirroring the
            // boxing timer's own bell-on-work-and-rest convention.
            void audioEngineRef.current?.playCue("bell");
          } else if (event.type === "session-finished") {
            void audioEngineRef.current?.playCue("finalBell");
          }
        });
        return next;
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [config]);

  const start = useCallback(() => {
    const initial = startBikeSession(config, Date.now());
    void audioEngineRef.current?.playCue("bell");
    setBikeState(initial);
  }, [config]);

  const togglePause = useCallback(() => {
    setBikeState((prev) => {
      if (prev === null) {
        return prev;
      }
      const now = Date.now();
      return prev.isPaused ? resumeBike(prev, now) : pauseBike(prev, now);
    });
  }, []);

  const reset = useCallback(() => {
    setBikeState(null);
  }, []);

  const phaseDurationMs =
    bikeState === null
      ? null
      : bikeState.phase === "work"
        ? config.workSec * 1000
        : bikeState.phase === "settle"
          ? config.settleSec * 1000
          : bikeState.phase === "drill"
            ? config.drillSec * 1000
            : bikeState.phase === "reset"
              ? config.resetSec * 1000
              : null;

  return { bikeState, totalRounds: config.roundsTarget, phaseDurationMs, audioError, start, togglePause, reset };
}
