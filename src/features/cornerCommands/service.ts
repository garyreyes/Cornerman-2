import { nextGapFireTime } from "../../lib/gapTiming";
import type { Difficulty, RandomFn } from "./types";

/** Seconds; gaps shrink as difficulty rises -- less time between calls is
 * what makes this drill harder, mirroring oddOneOut's own grid-size
 * escalation (2x2 -> 3x3 -> 4x4) for the visual drill. Not sourced from
 * any spec (ARCHITECTURE.md names "one fixed difficulty" but not
 * numbers, same as the boxing built-ins' own pace figures) -- easy to
 * retune once felt for real. */
const COMMAND_GAP_SEC_BY_DIFFICULTY: Readonly<Record<Difficulty, readonly [number, number]>> = {
  easy: [3, 4],
  medium: [2, 3],
  hard: [1.5, 2],
};

export function commandGapSecForDifficulty(difficulty: Difficulty): readonly [number, number] {
  return COMMAND_GAP_SEC_BY_DIFFICULTY[difficulty];
}

/** When the next corner command should fire -- same `nextGapFireTime`
 * primitive already shared by first-combo timing, combo repeats, and the
 * boxing defense/movement cue layer, just with this drill's own
 * difficulty-scaled window instead of a Settings-driven one. */
export function nextCommandFireTime(now: number, difficulty: Difficulty, random: RandomFn = Math.random): number {
  const [minSec, maxSec] = commandGapSecForDifficulty(difficulty);
  return nextGapFireTime(now, minSec * 1000, maxSec * 1000, random);
}
