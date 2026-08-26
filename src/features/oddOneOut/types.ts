/** Re-exported, not redeclared -- workoutTemplates/types.ts is the actual
 * owner of the drill difficulty; every drill imports the same one. */
export type { Difficulty } from "../workoutTemplates/types";
export type { RandomFn, TrialOutcome } from "../../lib/drillTrial";

/** One drawn puzzle: a `gridSize`x`gridSize` grid of tiles, all identical
 * except the one at `oddIndex` (0-indexed, row-major). */
export interface Trial {
  gridSize: number;
  oddIndex: number;
  startedAt: number;
}
