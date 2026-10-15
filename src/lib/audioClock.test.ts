import { audioClockTime } from "./audioClock";

describe("audioClockTime", () => {
  test("a future wall-clock time lands the same distance ahead on the audio clock", () => {
    expect(audioClockTime(3_500, 1_000, 12)).toBe(14.5);
  });

  test("a time already passed plays immediately rather than at a negative offset", () => {
    expect(audioClockTime(500, 1_000, 12)).toBe(12);
  });
});
