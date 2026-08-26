/** Phase 11c (docs/user-flows.md Flow 7's visual drill). Mirrors
 * ARCHITECTURE.md's AssaultBikeConfig.difficulty -- "one fixed difficulty
 * rather than the reference protocol's per-round auto-scaling" applies
 * here too, but the type stays the full range for whichever difficulty a
 * template actually specifies. */
export type Difficulty = "easy" | "medium" | "hard";

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
