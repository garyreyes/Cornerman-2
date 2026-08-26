import { choiceCountForDifficulty, resolveColorTap, startColorTrial } from "./service";
import { DRILL_COLORS } from "./types";
import type { RandomFn } from "./types";

/** Deterministic stand-in for Math.random -- cycles the given values. */
function sequence(values: number[]): RandomFn {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe("choiceCountForDifficulty", () => {
  test("more colours on screen is what makes this drill harder", () => {
    expect(choiceCountForDifficulty("easy")).toBe(3);
    expect(choiceCountForDifficulty("medium")).toBe(4);
    expect(choiceCountForDifficulty("hard")).toBe(6);
  });

  test("no difficulty asks for more colours than the voice bank can name", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      expect(choiceCountForDifficulty(difficulty)).toBeLessThanOrEqual(DRILL_COLORS.length);
    }
  });
});

describe("startColorTrial", () => {
  test("draws exactly the difficulty's number of choices", () => {
    expect(startColorTrial("easy", 0, sequence([0])).choices).toHaveLength(3);
    expect(startColorTrial("medium", 0, sequence([0])).choices).toHaveLength(4);
    expect(startColorTrial("hard", 0, sequence([0])).choices).toHaveLength(6);
  });

  test("choices are always distinct -- a repeated colour would make two tiles both correct", () => {
    for (let i = 0; i < 200; i += 1) {
      const trial = startColorTrial("hard", 0);
      expect(new Set(trial.choices).size).toBe(trial.choices.length);
    }
  });

  test("the called colour is always one of the tiles on screen", () => {
    for (let i = 0; i < 200; i += 1) {
      const trial = startColorTrial("medium", 0);
      expect(trial.choices).toContain(trial.target);
    }
  });

  test("every choice is a real voice-bank colour", () => {
    for (let i = 0; i < 50; i += 1) {
      for (const choice of startColorTrial("hard", 0).choices) {
        expect(DRILL_COLORS).toContain(choice);
      }
    }
  });

  test("records the start time for reaction timing", () => {
    expect(startColorTrial("easy", 1_234_567).startedAt).toBe(1_234_567);
  });

  test("a random() returning its exclusive upper bound cannot index past the pool", () => {
    // Math.random() never returns 1, but a caller-supplied RandomFn might.
    const trial = startColorTrial("hard", 0, sequence([0.999999999999]));
    expect(new Set(trial.choices).size).toBe(6);
    expect(trial.choices).toContain(trial.target);
  });
});

describe("resolveColorTap", () => {
  test("tapping the called colour is a hit", () => {
    const trial = startColorTrial("medium", 1000);
    const targetIndex = trial.choices.indexOf(trial.target);

    expect(resolveColorTap(trial, targetIndex, 1400).correct).toBe(true);
  });

  test("tapping any other colour is a miss", () => {
    const trial = startColorTrial("medium", 1000);
    const wrongIndex = trial.choices.findIndex((c) => c !== trial.target);

    expect(resolveColorTap(trial, wrongIndex, 1400).correct).toBe(false);
  });

  test("reaction time is measured whether the tap was right or wrong", () => {
    const trial = startColorTrial("medium", 1000);
    const targetIndex = trial.choices.indexOf(trial.target);
    const wrongIndex = trial.choices.findIndex((c) => c !== trial.target);

    expect(resolveColorTap(trial, targetIndex, 1400).reactionMs).toBe(400);
    expect(resolveColorTap(trial, wrongIndex, 1650).reactionMs).toBe(650);
  });

  test("an out-of-range index resolves as a miss rather than crashing", () => {
    const trial = startColorTrial("easy", 1000);

    expect(resolveColorTap(trial, 99, 1200).correct).toBe(false);
    expect(resolveColorTap(trial, -1, 1200).correct).toBe(false);
  });
});
