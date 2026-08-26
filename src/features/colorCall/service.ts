import { DRILL_COLORS } from "./types";
import type { ColorTrial, Difficulty, DrillColor, RandomFn, TrialOutcome } from "./types";

/** More colours on screen is what makes this drill harder -- the parallel
 * to Odd One Out's grid-size escalation. Capped at the voice bank's six
 * nameable colours; a seventh would need a generated clip first. */
const CHOICE_COUNT_BY_DIFFICULTY: Readonly<Record<Difficulty, number>> = {
  easy: 3,
  medium: 4,
  hard: 6,
};

export function choiceCountForDifficulty(difficulty: Difficulty): number {
  return CHOICE_COUNT_BY_DIFFICULTY[difficulty];
}

/** Draws `count` distinct colours by removing each pick from the pool --
 * a duplicate would put the called colour on two tiles at once and make
 * both of them correct. */
function pickDistinct(count: number, random: RandomFn): DrillColor[] {
  const remaining: DrillColor[] = [...DRILL_COLORS];
  const picked: DrillColor[] = [];
  for (let i = 0; i < count && remaining.length > 0; i += 1) {
    // Clamped because Math.random()'s exclusive upper bound isn't
    // guaranteed of a caller-supplied RandomFn (the test suite passes
    // 0.999... deliberately).
    const index = Math.min(remaining.length - 1, Math.floor(random() * remaining.length));
    picked.push(remaining[index]!);
    remaining.splice(index, 1);
  }
  return picked;
}

/**
 * One Color Call trial: a set of distinct colours to show, and the one
 * of them the voice will name. The target is drawn from the choices
 * rather than from the full palette, so it's always answerable.
 */
export function startColorTrial(difficulty: Difficulty, now: number, random: RandomFn = Math.random): ColorTrial {
  const choices = pickDistinct(choiceCountForDifficulty(difficulty), random);
  const targetIndex = Math.min(choices.length - 1, Math.floor(random() * choices.length));
  return { choices, target: choices[targetIndex]!, startedAt: now };
}

/**
 * Reaction time is measured honestly regardless of correctness, matching
 * Odd One Out's own resolveTap. An out-of-range index is a miss rather
 * than a crash -- the same graceful-fallback spirit the combo resolution
 * layer uses for a deleted punch number.
 */
export function resolveColorTap(trial: ColorTrial, tappedIndex: number, now: number): TrialOutcome {
  return { correct: trial.choices[tappedIndex] === trial.target, reactionMs: now - trial.startedAt };
}
