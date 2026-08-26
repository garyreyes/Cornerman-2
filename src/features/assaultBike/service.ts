import type { BikeConfig, BikeEvent, BikePhase, BikeState } from "./types";

const CYCLE_ORDER: readonly BikePhase[] = ["work", "settle", "drill", "reset"];

function phaseDurationMs(config: BikeConfig, phase: BikePhase): number {
  switch (phase) {
    case "work":
      return config.workSec * 1000;
    case "settle":
      return config.settleSec * 1000;
    case "drill":
      return config.drillSec * 1000;
    case "reset":
      return config.resetSec * 1000;
    case "finished":
      return 0;
  }
}

export function startBikeSession(config: BikeConfig, now: number): BikeState {
  return {
    phase: "work",
    round: 1,
    phaseEndAt: now + phaseDurationMs(config, "work"),
    isPaused: false,
    pausedAt: null,
  };
}

/**
 * Unlike timer/service.ts's boxing cycle (which skips a trailing rest
 * after the final round's work), every round here -- including the last
 * -- runs its full Work/Settle/Drill/Reset cycle before the session ends;
 * "finished" is only decided at the point Reset would otherwise loop back
 * to the next round's Work, matching Flow 7's own diagram (the "all
 * rounds complete" branch leaves from that same loop-back point).
 */
export function tick(state: BikeState, config: BikeConfig, now: number): { state: BikeState; events: BikeEvent[] } {
  if (state.isPaused) {
    return { state, events: [] };
  }

  const events: BikeEvent[] = [];
  let s = state;

  while (s.phase !== "finished" && now >= s.phaseEndAt) {
    if (s.phase === "reset") {
      if (s.round >= config.roundsTarget) {
        s = { ...s, phase: "finished" };
        events.push({ type: "phase-changed", phase: "finished", round: s.round });
        events.push({ type: "session-finished" });
      } else {
        const round = s.round + 1;
        const transitionAt = s.phaseEndAt;
        s = {
          phase: "work",
          round,
          phaseEndAt: transitionAt + phaseDurationMs(config, "work"),
          isPaused: false,
          pausedAt: null,
        };
        events.push({ type: "phase-changed", phase: "work", round });
      }
    } else {
      const currentIndex = CYCLE_ORDER.indexOf(s.phase);
      const nextPhase = CYCLE_ORDER[currentIndex + 1]!;
      const transitionAt = s.phaseEndAt;
      s = {
        phase: nextPhase,
        round: s.round,
        phaseEndAt: transitionAt + phaseDurationMs(config, nextPhase),
        isPaused: false,
        pausedAt: null,
      };
      events.push({ type: "phase-changed", phase: nextPhase, round: s.round });
    }
  }

  return { state: s, events };
}

export function pause(state: BikeState, now: number): BikeState {
  if (state.isPaused || state.phase === "finished") {
    return state;
  }
  return { ...state, isPaused: true, pausedAt: now };
}

export function resume(state: BikeState, now: number): BikeState {
  if (!state.isPaused || state.pausedAt === null) {
    return state;
  }
  const pausedDurationMs = now - state.pausedAt;
  return { ...state, isPaused: false, pausedAt: null, phaseEndAt: state.phaseEndAt + pausedDurationMs };
}
