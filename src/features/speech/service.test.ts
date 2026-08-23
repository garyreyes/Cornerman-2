import { AudioBufferSourceNode } from "react-native-audio-api";

import { createSpeechEngine, normalizeToKey, resolveBundledClip } from "./service";

describe("normalizeToKey", () => {
  test("lowercases and joins words with underscores", () => {
    expect(normalizeToKey("Lead Hook")).toBe("lead_hook");
  });

  test("trims surrounding whitespace", () => {
    expect(normalizeToKey("  Jab  ")).toBe("jab");
  });

  test("collapses punctuation and repeated separators into a single underscore", () => {
    expect(normalizeToKey("Body-Hook!!")).toBe("body_hook");
    expect(normalizeToKey("Rear   Uppercut")).toBe("rear_uppercut");
  });

  test("already-normalized text passes through unchanged", () => {
    expect(normalizeToKey("one")).toBe("one");
  });
});

describe("resolveBundledClip", () => {
  test("resolves a bundled word regardless of case/spacing in the source text", () => {
    expect(resolveBundledClip("Lead Hook")).not.toBeNull();
    expect(resolveBundledClip("lead_hook")).not.toBeNull();
    expect(resolveBundledClip("  REAR  push kick ")).not.toBeNull();
  });

  test("resolves every word in the bundled bank (numbers, punches, kicks, defense)", () => {
    const words = [
      "one", "two", "three", "four", "five", "six",
      "jab", "cross", "lead hook", "rear hook", "body hook", "body jab", "body cross",
      "lead uppercut", "rear uppercut",
      "lead high kick", "rear high kick", "lead body kick", "rear body kick",
      "lead low kick", "rear low kick", "lead calf kick", "rear calf kick",
      "lead inside kick", "rear inside kick", "lead push kick", "rear push kick",
      "roll", "slip", "duck", "pivot", "check", "clinch",
    ];
    words.forEach((word) => expect(resolveBundledClip(word)).not.toBeNull());
  });

  test("returns null for a word with no bundled clip, e.g. a custom punch name", () => {
    expect(resolveBundledClip("Crescent Kick")).toBeNull();
  });
});

describe("createSpeechEngine", () => {
  test("playWord returns true and starts playback for a bundled word", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createSpeechEngine();
    const played = engine.playWord("Jab");
    await Promise.resolve();

    expect(played).toBe(true);
    expect(startSpy).toHaveBeenCalledTimes(1);

    startSpy.mockRestore();
  });

  test("playWord returns false and plays nothing for an unrecognized word", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createSpeechEngine();
    const played = engine.playWord("Crescent Kick");
    await Promise.resolve();

    expect(played).toBe(false);
    expect(startSpy).not.toHaveBeenCalled();

    startSpy.mockRestore();
  });

  test("setVolume clamps and doesn't throw", () => {
    const engine = createSpeechEngine();
    expect(() => engine.setVolume(0.5)).not.toThrow();
    expect(() => engine.setVolume(3)).not.toThrow();
    expect(() => engine.setVolume(-1)).not.toThrow();
  });
});
