/** Re-exported, not redeclared -- workoutTemplates/types.ts is the actual
 * owner of AssaultBikeConfig.difficulty (Phase 11d centralized this; both
 * oddOneOut and cornerCommands import the same one instead of each
 * declaring their own copy). */
export type { Difficulty } from "../workoutTemplates/types";

/** One drawn puzzle: a `gridSize`x`gridSize` grid of tiles, all identical
 * except the one at `oddIndex` (0-indexed, row-major). */
export interface Trial {
  gridSize: number;
  oddIndex: number;
  startedAt: number;
}

export interface TrialResult {
  correct: boolean;
  reactionMs: number;
}

export type RandomFn = () => number;
