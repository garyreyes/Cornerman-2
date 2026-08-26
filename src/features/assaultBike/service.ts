import type { BikeConfig, BikeEvent, BikePhase, BikeRest, BikeState } from "./types";

/** The two real cycles (Phase 12a). Both end on their rest-side phase --
 * that last entry is the loop-back point where the machine either starts
 * the next round or finishes, so the completion rule below is written
 * once against `order[order.length - 1]` rather than duplicated per
 * cycle. */
const DRILL_CYCLE: readonly BikePhase[] = ["work", "settle", "drill", "reset"];
const PLAIN_CYCLE: readonly BikePhase[] = ["work", "rest"];

function cycleOrder(rest: BikeRest): readonly BikePhase[] {
  return rest.kind === "drill" ? DRILL_CYCLE : PLAIN_CYCLE;
}

function phaseDurationMs(config: BikeConfig, phase: BikePhase): number {
  const { rest } = config;
  switch (phase) {
    case "work":
      return config.workSec * 1000;
    // The mismatched-kind arms below are unreachable in practice --
    // cycleOrder never yields a phase belonging to the other rest kind --
    // but the narrowing is real, not a cast, so a future third cycle
    // can't silently read a field its own shape doesn't have.
    case "rest":
      return rest.kind === "plain" ? rest.restSec * 1000 : 0;
    case "settle":
      return rest.kind === "drill" ? rest.settleSec * 1000 : 0;
    case "drill":
      return rest.kind === "drill" ? rest.drillSec * 1000 : 0;
    case "reset":
      return rest.kind === "drill" ? rest.resetSec * 1000 : 0;
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
 * -- runs its full cycle before the session ends; "finished" is only
 * decided at the point the rest-side phase would otherwise loop back to
 * the next round's Work, matching Flow 7's own diagram (the "all rounds
 * complete" branch leaves from that same loop-back point). Phase 12a made
 * this rule cycle-agnostic, so the plain-rest protocol inherits it
 * identically rather than growing its own completion branch.
 */
export function tick(state: BikeState, config: BikeConfig, now: number): { state: BikeState; events: BikeEvent[] } {
  if (state.isPaused) {
    return { state, events: [] };
  }

  const order = cycleOrder(config.rest);
  const loopBackPhase = order[order.length - 1]!;
  const events: BikeEvent[] = [];
  let s = state;

  while (s.phase !== "finished" && now >= s.phaseEndAt) {
    if (s.phase === loopBackPhase) {
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
      const currentIndex = order.indexOf(s.phase);
      const nextPhase = order[currentIndex + 1]!;
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
