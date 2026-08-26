import { commandGapSecForDifficulty, nextCommandFireTime } from "./service";
import type { Difficulty } from "./types";

describe("commandGapSecForDifficulty", () => {
  test("gaps shrink as difficulty increases -- less time between calls is what makes it harder", () => {
    const [easyMin, easyMax] = commandGapSecForDifficulty("easy");
    const [mediumMin, mediumMax] = commandGapSecForDifficulty("medium");
    const [hardMin, hardMax] = commandGapSecForDifficulty("hard");

    expect(easyMin).toBeGreaterThan(mediumMin);
    expect(mediumMin).toBeGreaterThan(hardMin);
    expect(easyMax).toBeGreaterThan(mediumMax);
    expect(mediumMax).toBeGreaterThan(hardMax);
  });

  test("every difficulty's own min is never greater than its own max", () => {
    const difficulties: Difficulty[] = ["easy", "medium", "hard"];
    for (const difficulty of difficulties) {
      const [min, max] = commandGapSecForDifficulty(difficulty);
      expect(min).toBeLessThanOrEqual(max);
    }
  });
});

describe("nextCommandFireTime", () => {
  test("resolves to now + the difficulty's min gap when random() returns 0", () => {
    const now = 1_000_000;
    const [min] = commandGapSecForDifficulty("medium");
    expect(nextCommandFireTime(now, "medium", () => 0)).toBe(now + min * 1000);
  });

  test("resolves to now + the difficulty's max gap when random() returns 1", () => {
    const now = 1_000_000;
    const [, max] = commandGapSecForDifficulty("hard");
    expect(nextCommandFireTime(now, "hard", () => 1)).toBe(now + max * 1000);
  });
});
