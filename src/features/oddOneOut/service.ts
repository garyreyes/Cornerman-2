import type { Difficulty, RandomFn, Trial, TrialOutcome } from "./types";

const GRID_SIZE_BY_DIFFICULTY: Readonly<Record<Difficulty, number>> = {
  easy: 2,
  medium: 3,
  hard: 4,
};

export function gridSizeForDifficulty(difficulty: Difficulty): number {
  return GRID_SIZE_BY_DIFFICULTY[difficulty];
}

/** Draws a fresh puzzle -- which of the `gridSize*gridSize` tiles is the
 * odd one out, and when this trial started (for reaction-time timing). */
export function startTrial(difficulty: Difficulty, now: number, random: RandomFn = Math.random): Trial {
  const gridSize = gridSizeForDifficulty(difficulty);
  const cellCount = gridSize * gridSize;
  const oddIndex = Math.min(cellCount - 1, Math.floor(random() * cellCount));
  return { gridSize, oddIndex, startedAt: now };
}

/** Reaction time is measured honestly regardless of correctness -- a wrong
 * tap still shows the user how fast they were, matching "reaction time/
 * accuracy shown live" (ARCHITECTURE.md), not just on a correct answer. */
export function resolveTap(trial: Trial, tappedIndex: number, now: number): TrialOutcome {
  return { correct: tappedIndex === trial.oddIndex, reactionMs: now - trial.startedAt };
}
