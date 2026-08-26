import { gridSizeForDifficulty, resolveTap, startTrial } from "./service";
import type { Difficulty, Trial } from "./types";

describe("gridSizeForDifficulty", () => {
  test("escalates 2x2 -> 3x3 -> 4x4 across easy/medium/hard", () => {
    expect(gridSizeForDifficulty("easy")).toBe(2);
    expect(gridSizeForDifficulty("medium")).toBe(3);
    expect(gridSizeForDifficulty("hard")).toBe(4);
  });
});

describe("startTrial", () => {
  test("draws oddIndex within [0, gridSize*gridSize) for the given difficulty", () => {
    const cases: { difficulty: Difficulty; random: number; expectedIndex: number }[] = [
      { difficulty: "easy", random: 0, expectedIndex: 0 }, // 2x2 = 4 cells
      { difficulty: "easy", random: 0.99, expectedIndex: 3 },
      { difficulty: "hard", random: 0, expectedIndex: 0 }, // 4x4 = 16 cells
      { difficulty: "hard", random: 0.99, expectedIndex: 15 },
    ];
    for (const { difficulty, random, expectedIndex } of cases) {
      const trial = startTrial(difficulty, 1_000, () => random);
      expect(trial.oddIndex).toBe(expectedIndex);
    }
  });

  test("records gridSize and the exact startedAt timestamp passed in", () => {
    const trial = startTrial("medium", 5_000, () => 0.5);
    expect(trial.gridSize).toBe(3);
    expect(trial.startedAt).toBe(5_000);
  });
});

describe("resolveTap", () => {
  const trial: Trial = { gridSize: 3, oddIndex: 4, startedAt: 10_000 };

  test("tapping the actual odd tile is correct", () => {
    const result = resolveTap(trial, 4, 10_450);
    expect(result.correct).toBe(true);
    expect(result.reactionMs).toBe(450);
  });

  test("tapping any other tile is incorrect, reaction time still measured honestly", () => {
    const result = resolveTap(trial, 0, 10_900);
    expect(result.correct).toBe(false);
    expect(result.reactionMs).toBe(900);
  });
});
