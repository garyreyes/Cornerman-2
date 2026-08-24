import * as Speech from "expo-speech";
import { AudioBufferSourceNode, AudioContext } from "react-native-audio-api";

import { createSpeechEngine, normalizeToKey, rateForSpeechRate, resolveBundledClip } from "./service";

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

describe("rateForSpeechRate", () => {
  test("passes valid rates through unchanged", () => {
    expect(rateForSpeechRate(0.25)).toBe(0.25);
    expect(rateForSpeechRate(1.0)).toBe(1.0);
    expect(rateForSpeechRate(4.0)).toBe(4.0);
  });

  test("clamps below the floor and above the library's native WSOLA ceiling", () => {
    expect(rateForSpeechRate(0.1)).toBe(0.25);
    // The originally-discussed 5.0 must clamp to 4.0, not pass through --
    // react-native-audio-api's WsolaTimeStretcher::MAX_PLAYBACK_RATE is a
    // fixed native constant (PROJECT_FACTS.md).
    expect(rateForSpeechRate(5.0)).toBe(4.0);
    expect(rateForSpeechRate(4.5)).toBe(4.0);
  });
});

describe("createSpeechEngine", () => {
  test("plays bundled clips with pitch correction enabled", async () => {
    const createBufferSourceSpy = jest.spyOn(AudioContext.prototype, "createBufferSource");

    const engine = createSpeechEngine();
    engine.playWord("Jab");
    await Promise.resolve();

    expect(createBufferSourceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ pitchCorrection: true }),
    );

    createBufferSourceSpy.mockRestore();
  });

  test("setRate clamps and applies to the next playWord's source node", async () => {
    const engine = createSpeechEngine();
    engine.setRate(5.0); // must clamp to 4.0, not pass through

    let capturedRate: number | undefined;
    const startSpy = jest
      .spyOn(AudioBufferSourceNode.prototype, "start")
      .mockImplementation(function (this: InstanceType<typeof AudioBufferSourceNode>) {
        capturedRate = this.playbackRate.value;
      });

    engine.playWord("Cross");
    await Promise.resolve();

    expect(capturedRate).toBe(4.0);

    startSpy.mockRestore();
  });

  test("defaults to 1.0x when setRate is never called", async () => {
    let capturedRate: number | undefined;
    const startSpy = jest
      .spyOn(AudioBufferSourceNode.prototype, "start")
      .mockImplementation(function (this: InstanceType<typeof AudioBufferSourceNode>) {
        capturedRate = this.playbackRate.value;
      });

    const engine = createSpeechEngine();
    engine.playWord("Roll");
    await Promise.resolve();

    expect(capturedRate).toBe(1.0);

    startSpy.mockRestore();
  });
});

describe("createSpeechEngine -- on-device TTS fallback (5c)", () => {
  test("an unrecognized word falls through to live on-device TTS and returns true", () => {
    const speakSpy = jest.spyOn(Speech, "speak").mockImplementation(() => {});

    const engine = createSpeechEngine();
    const played = engine.playWord("Crescent Kick");

    expect(played).toBe(true);
    expect(speakSpy).toHaveBeenCalledWith("Crescent Kick", expect.any(Object));

    speakSpy.mockRestore();
  });

  test("a bundled word never falls through to TTS", async () => {
    const speakSpy = jest.spyOn(Speech, "speak").mockImplementation(() => {});
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createSpeechEngine();
    engine.playWord("Jab");
    await Promise.resolve();

    expect(speakSpy).not.toHaveBeenCalled();
    expect(startSpy).toHaveBeenCalledTimes(1);

    speakSpy.mockRestore();
    startSpy.mockRestore();
  });

  test("blank text is a no-op -- returns false and calls neither playback path", () => {
    const speakSpy = jest.spyOn(Speech, "speak").mockImplementation(() => {});

    const engine = createSpeechEngine();
    expect(engine.playWord("   ")).toBe(false);
    expect(engine.playWord("")).toBe(false);
    expect(speakSpy).not.toHaveBeenCalled();

    speakSpy.mockRestore();
  });

  test("setRate and setVolume carry into the TTS fallback call, clamped the same as bundled playback", () => {
    const speakSpy = jest.spyOn(Speech, "speak").mockImplementation(() => {});

    const engine = createSpeechEngine();
    engine.setRate(5.0); // must clamp to 4.0, same ceiling as the WSOLA path
    engine.setVolume(0.4);
    engine.playWord("Crescent Kick");

    expect(speakSpy).toHaveBeenCalledWith(
      "Crescent Kick",
      expect.objectContaining({ rate: 4.0, volume: 0.4 }),
    );

    speakSpy.mockRestore();
  });
});

describe("createSpeechEngine (5a coverage)", () => {
  test("playWord returns true and starts playback for a bundled word", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createSpeechEngine();
    const played = engine.playWord("Jab");
    await Promise.resolve();

    expect(played).toBe(true);
    expect(startSpy).toHaveBeenCalledTimes(1);

    startSpy.mockRestore();
  });

  test("setVolume clamps and doesn't throw", () => {
    const engine = createSpeechEngine();
    expect(() => engine.setVolume(0.5)).not.toThrow();
    expect(() => engine.setVolume(3)).not.toThrow();
    expect(() => engine.setVolume(-1)).not.toThrow();
  });
});
