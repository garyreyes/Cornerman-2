import { nextGapFireTime } from "./gapTiming";

describe("nextGapFireTime", () => {
  test("clamps to the minimum when random() returns 0", () => {
    expect(nextGapFireTime(1_000, 500, 1_500, () => 0)).toBe(1_500);
  });

  test("clamps to the maximum when random() returns 1", () => {
    expect(nextGapFireTime(1_000, 500, 1_500, () => 1)).toBe(2_500);
  });

  test("lands proportionally within the window for a mid-range random value", () => {
    expect(nextGapFireTime(1_000, 500, 1_500, () => 0.5)).toBe(2_000);
  });

  test("matches the exact formula timer/service.ts's firstComboAt already proved (extraction doc §1.2)", () => {
    const now = 1_000_000;
    expect(nextGapFireTime(now, 500, 1_500, () => 0)).toBe(now + 500);
    expect(nextGapFireTime(now, 500, 1_500, () => 1)).toBe(now + 1_500);
    expect(nextGapFireTime(now, 500, 1_500, () => 0.9)).toBe(now + 500 + 0.9 * 1_000);
  });

  test("defaults to Math.random when no random fn is supplied", () => {
    const result = nextGapFireTime(1_000, 500, 1_500);
    expect(result).toBeGreaterThanOrEqual(1_500);
    expect(result).toBeLessThanOrEqual(2_500);
  });
});
