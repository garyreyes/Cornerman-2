import { AVG_SPOKEN_WORD_MS, estimateComboSpeechMs, SPOKEN_WORD_GAP_MS } from "./speechTiming";

describe("estimateComboSpeechMs", () => {
  test("an empty combo takes no time", () => {
    expect(estimateComboSpeechMs(0, 1)).toBe(0);
  });

  test("a single word has no inter-word gap", () => {
    expect(estimateComboSpeechMs(1, 1)).toBe(AVG_SPOKEN_WORD_MS);
  });

  test("n words carry n-1 gaps between them", () => {
    expect(estimateComboSpeechMs(4, 1)).toBe(4 * AVG_SPOKEN_WORD_MS + 3 * SPOKEN_WORD_GAP_MS);
  });

  test("a faster speech rate proportionally shortens the estimate", () => {
    expect(estimateComboSpeechMs(4, 2)).toBe(estimateComboSpeechMs(4, 1) / 2);
  });

  test("clamps the rate to the same [0.25, 4] range the speech engine enforces", () => {
    expect(estimateComboSpeechMs(3, 99)).toBe(estimateComboSpeechMs(3, 4));
    expect(estimateComboSpeechMs(3, 0)).toBe(estimateComboSpeechMs(3, 0.25));
  });

  test("a typical 4-punch combo lands near the measured ~3.3s, not near zero", () => {
    const ms = estimateComboSpeechMs(4, 1);
    expect(ms).toBeGreaterThan(3_000);
    expect(ms).toBeLessThan(3_600);
  });
});
