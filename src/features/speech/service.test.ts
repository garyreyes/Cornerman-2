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

  test("defaults to DEFAULT_VOICE when no voice is passed", () => {
    expect(resolveBundledClip("Jab")).toBe(resolveBundledClip("Jab", "am_michael"));
  });

  test("resolves every word for every offered voice, not just the default", () => {
    const words = ["jab", "lead hook", "rear push kick", "clinch"];
    (["am_michael", "am_eric"] as const).forEach((voice) => {
      words.forEach((word) => expect(resolveBundledClip(word, voice)).not.toBeNull());
    });
  });

  // NOT tested: that "Jab" resolves to a genuinely different asset per
  // voice. jest-expo's asset transformer collapses every binary
  // require() (any image/audio file) to the same mocked placeholder
  // value under Jest, regardless of which real file it points at --
  // there's no way to distinguish two different assets at this layer
  // under test. The real guarantee lives in the source itself: each
  // voice's BUNDLED_CLIPS entry is a textually distinct require() path
  // pointing at a real, separately-generated file on disk (confirmed by
  // actually listening to the two voices before this feature was built).
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
  test("an engine constructed with a non-default voice still resolves and plays its own bundled clips", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createSpeechEngine("am_eric");
    const played = engine.playWord("Jab");
    await Promise.resolve();

    expect(played).toBe(true);
    expect(startSpy).toHaveBeenCalledTimes(1);

    startSpy.mockRestore();
  });

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

describe("createSpeechEngine -- playCombo (multi-word sequencing)", () => {
  // Each hop through playSequence's loop is one microtask (an `await` on an
  // already-resolved buffer promise), so a combo of N words needs N+ flushes
  // before every start() call has actually landed.
  async function flushMicrotasks(times = 6): Promise<void> {
    for (let i = 0; i < times; i++) {
      await Promise.resolve();
    }
  }

  test("schedules each word in a combo sequentially, not all at once", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createSpeechEngine();
    engine.playCombo(["Jab", "Cross", "Lead Hook"]);
    await flushMicrotasks();

    expect(startSpy).toHaveBeenCalledTimes(3);
    // Bug this covers: the old call site (useSession.ts) fired playWord once
    // per punch with no offset, so every word in a combo started at the same
    // instant -- unintelligible, and prone to clipping/distortion from the
    // summed waveforms. `when` must strictly increase between words.
    const whens = startSpy.mock.calls.map((call) => call[0]);
    // react-native-audio-api's mock decodeAudioData always returns a fixed
    // 44100-sample/44100Hz buffer (duration 1.0s), so at the default 1.0x
    // rate each word should be offset by 1.0 + WORD_GAP_SEC (0.12s).
    expect(whens[1]! - whens[0]!).toBeCloseTo(1.12);
    expect(whens[2]! - whens[1]!).toBeCloseTo(1.12);

    startSpy.mockRestore();
  });

  test("a blank word in the combo is skipped, not scheduled as silence", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createSpeechEngine();
    engine.playCombo(["Jab", "   ", "Cross"]);
    await flushMicrotasks();

    expect(startSpy).toHaveBeenCalledTimes(2);

    startSpy.mockRestore();
  });

  test("an unrecognized word (e.g. a custom punch name) falls through to on-device TTS without dropping the bundled words around it", async () => {
    const speakSpy = jest.spyOn(Speech, "speak").mockImplementation((_text, options) => {
      options?.onDone?.();
    });
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createSpeechEngine();
    engine.playCombo(["Jab", "Crescent Kick", "Cross"]);
    await flushMicrotasks();

    expect(speakSpy).toHaveBeenCalledWith("Crescent Kick", expect.any(Object));
    expect(startSpy).toHaveBeenCalledTimes(2);

    speakSpy.mockRestore();
    startSpy.mockRestore();
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

/**
 * Both bugs here were reported from real use on a device (2026-08-26):
 * voices sometimes echoed, and the bell arrived late in later rounds.
 * They shared a root cause -- nothing ever stopped or disconnected a
 * source node, so utterances layered on top of each other and finished
 * nodes stayed wired into the output bus for the life of the context.
 */
describe("createSpeechEngine -- replace, don't layer (the echo fix)", () => {
  async function flushMicrotasks(times = 8): Promise<void> {
    for (let i = 0; i < times; i++) {
      await Promise.resolve();
    }
  }

  test("a new word stops the word still playing instead of sounding over it", async () => {
    const stopSpy = jest.spyOn(AudioBufferSourceNode.prototype, "stop");

    const engine = createSpeechEngine();
    engine.playWord("Jab");
    await flushMicrotasks();
    expect(stopSpy).not.toHaveBeenCalled();

    engine.playWord("Cross");
    await flushMicrotasks();

    expect(stopSpy).toHaveBeenCalledTimes(1);

    stopSpy.mockRestore();
  });

  test("a new combo supersedes one still being scheduled, rather than stacking underneath it", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createSpeechEngine();
    // The real trigger: Settings allows a 1s combo gap (the "Intense"
    // built-in uses exactly that) while a 4-punch combo takes ~4s to
    // speak, so the next combo begins long before the previous finishes.
    engine.playCombo(["Jab", "Cross", "Lead Hook", "Rear Uppercut"]);
    engine.playCombo(["Jab", "Cross"]);
    await flushMicrotasks(12);

    // Only the second combo's two words -- the first combo is abandoned
    // mid-schedule rather than being laid down underneath.
    expect(startSpy).toHaveBeenCalledTimes(2);

    startSpy.mockRestore();
  });

  test("stop() silences what is sounding and abandons what was still queued", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");
    const stopSpy = jest.spyOn(AudioBufferSourceNode.prototype, "stop");

    const engine = createSpeechEngine();
    engine.playCombo(["Jab", "Cross", "Lead Hook"]);
    await Promise.resolve();
    engine.stop();
    await flushMicrotasks(12);

    expect(stopSpy.mock.calls.length).toBeGreaterThan(0);
    // Whatever had been scheduled before the stop, nothing new followed it.
    const afterStop = startSpy.mock.calls.length;
    await flushMicrotasks(12);
    expect(startSpy.mock.calls.length).toBe(afterStop);

    startSpy.mockRestore();
    stopSpy.mockRestore();
  });

  test("a blank word never cuts off speech that is legitimately still playing", async () => {
    const stopSpy = jest.spyOn(AudioBufferSourceNode.prototype, "stop");

    const engine = createSpeechEngine();
    engine.playWord("Jab");
    await flushMicrotasks();

    expect(engine.playWord("   ")).toBe(false);
    expect(stopSpy).not.toHaveBeenCalled();

    stopSpy.mockRestore();
  });

  test("a finished word disconnects itself, so the graph doesn't grow with every utterance", async () => {
    const connectSpy = jest.spyOn(AudioBufferSourceNode.prototype, "connect");
    const disconnectSpy = jest.spyOn(AudioBufferSourceNode.prototype, "disconnect");

    const engine = createSpeechEngine();
    engine.playWord("Jab");
    await flushMicrotasks();

    const source = connectSpy.mock.instances[0] as unknown as AudioBufferSourceNode;
    expect(disconnectSpy).not.toHaveBeenCalled();

    // Exactly what the native layer does once the clip finishes playing.
    // Before this fix nothing happened here at all, so every word spoken
    // left another node wired into the output bus for the life of the
    // context -- ~110 of them over a 12-round Color Call session.
    source.onEnded?.({} as never);

    expect(disconnectSpy).toHaveBeenCalledTimes(1);

    // And a later stop() must not double-disconnect one already released.
    engine.stop();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);

    connectSpy.mockRestore();
    disconnectSpy.mockRestore();
  });

  test("close() silences playback before releasing the context", async () => {
    const stopSpy = jest.spyOn(AudioBufferSourceNode.prototype, "stop");

    const engine = createSpeechEngine();
    engine.playWord("Jab");
    await flushMicrotasks();
    await engine.close();

    expect(stopSpy).toHaveBeenCalledTimes(1);

    stopSpy.mockRestore();
  });
});
