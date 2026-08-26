import { useCallback, useEffect, useRef, useState } from "react";

import { createAudioEngine } from "../audio/service";
import type { AudioEngine } from "../audio/types";
import { pause as pauseBike, resume as resumeBike, startBikeSession, tick } from "./service";
import type { BikeConfig, BikePhase, BikeState } from "./types";

const TICK_INTERVAL_MS = 200;

/** null for phases this protocol's own rest shape never enters, and for
 * finished -- the caller falls back to a static preview duration. */
function phaseDurationMs(config: BikeConfig, phase: BikePhase): number | null {
  const { rest } = config;
  switch (phase) {
    case "work":
      return config.workSec * 1000;
    case "rest":
      return rest.kind === "plain" ? rest.restSec * 1000 : null;
    case "settle":
      return rest.kind === "drill" ? rest.settleSec * 1000 : null;
    case "drill":
      return rest.kind === "drill" ? rest.drillSec * 1000 : null;
    case "reset":
      return rest.kind === "drill" ? rest.resetSec * 1000 : null;
    case "finished":
      return null;
  }
}

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
 * No speech engine here -- Odd One Out needs none, and Color Call (Phase
 * 12c) owns its own inside its drill hook rather than pushing a
 * drill-specific dependency up into the session loop.
 */
export function useBikeSession(config: BikeConfig): UseBikeSessionResult {
  const [bikeState, setBikeState] = useState<BikeState | null>(null);
  const [audioError, setAudioError] = useState(false);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  // Unlike Main Timer, this screen is pushed and popped -- so unlike
  // useSession's engine, this one genuinely has to be released. Without
  // the cleanup below it leaked a whole native AudioContext (plus its
  // decoded cue buffers) on every visit, and those accumulated for the
  // rest of the process. Found 2026-08-26 chasing a report of the bell
  // arriving late in later rounds.
  useEffect(() => {
    const initAudioEngine = () => {
      try {
        audioEngineRef.current = createAudioEngine();
      } catch {
        setAudioError(true);
      }
    };
    initAudioEngine();
    return () => {
      void audioEngineRef.current?.close();
      audioEngineRef.current = null;
    };
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
          if (
            event.type === "phase-changed" &&
            (event.phase === "work" || event.phase === "settle" || event.phase === "rest")
          ) {
            // Bell marks the all-out/recovery boundary, mirroring the
            // boxing timer's own bell-on-work-and-rest convention. Both
            // rest-side openers ring: "settle" for the drill protocols,
            // "rest" for the plain one (Phase 12a) -- they're the same
            // moment, just different cycle shapes.
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

  const currentPhaseDurationMs = bikeState === null ? null : phaseDurationMs(config, bikeState.phase);

  return {
    bikeState,
    totalRounds: config.roundsTarget,
    phaseDurationMs: currentPhaseDurationMs,
    audioError,
    start,
    togglePause,
    reset,
  };
}
