/**
 * What every cognitive drill reports when one trial resolves (Phase 12c).
 *
 * Lives in lib/ rather than in a drill feature or in assaultBike/scoring
 * because both sides need it: the drills produce it, and the bike
 * session's scoring consumes it. Putting it in either one would make
 * assaultBike -> drill -> assaultBike a cycle. Same precedent as
 * lib/gapTiming.ts, which is shared by the session, defence-cue and
 * drill layers alike.
 */
export interface TrialOutcome {
  correct: boolean;
  /** Measured honestly even for a wrong tap -- a rider still learns how
   * fast they were. A *timeout* reports the full window, which scoring.ts
   * deliberately keeps out of the reported average. */
  reactionMs: number;
}

export type RandomFn = () => number;
