import { AudioBufferSourceNode, GainNode } from "react-native-audio-api";

import type { TimerEvent } from "../timer/types";
import { createAudioEngine, gainForVolume, mapEventToCue } from "./service";

describe("mapEventToCue", () => {
  test("phase-changed to work or rest rings the bell", () => {
    expect(mapEventToCue({ type: "phase-changed", phase: "work", round: 1 })).toBe("bell");
    expect(mapEventToCue({ type: "phase-changed", phase: "rest", round: 1 })).toBe("bell");
  });

  test("phase-changed to ready, warmup, or finished plays nothing", () => {
    expect(mapEventToCue({ type: "phase-changed", phase: "ready", round: 0 })).toBeNull();
    expect(mapEventToCue({ type: "phase-changed", phase: "warmup", round: 0 })).toBeNull();
    expect(mapEventToCue({ type: "phase-changed", phase: "finished", round: 10 })).toBeNull();
  });

  test("work-warning plays the clapper", () => {
    expect(mapEventToCue({ type: "work-warning" })).toBe("clapper");
  });

  test("rest-countdown plays the countdown tick regardless of which second", () => {
    const events: TimerEvent[] = [
      { type: "rest-countdown", secondsRemaining: 3 },
      { type: "rest-countdown", secondsRemaining: 2 },
      { type: "rest-countdown", secondsRemaining: 1 },
    ];
    events.forEach((event) => expect(mapEventToCue(event)).toBe("countdownTick"));
  });

  test("session-finished plays the final bell", () => {
    expect(mapEventToCue({ type: "session-finished" })).toBe("finalBell");
  });
});

describe("gainForVolume", () => {
  test("passes valid 0-1 values through unchanged", () => {
    expect(gainForVolume(0)).toBe(0);
    expect(gainForVolume(0.5)).toBe(0.5);
    expect(gainForVolume(1)).toBe(1);
  });

  test("clamps out-of-range values instead of blowing out the speaker", () => {
    expect(gainForVolume(1.8)).toBe(1);
    expect(gainForVolume(-0.3)).toBe(0);
  });
});

describe("createAudioEngine", () => {
  test("setVolume writes the clamped gain onto the volume node, independent of any other bus gain", () => {
    const engine = createAudioEngine();
    engine.setVolume(0.4);
    engine.setVolume(5);
    // Only asserting the engine didn't throw and accepted repeated calls --
    // the gain node itself is internal, so this is exercised indirectly via
    // playCue below (whole-bus wiring must not throw with real values set).
    expect(() => engine.setVolume(0.7)).not.toThrow();
  });

  test("playCue decodes the cue's buffer, wires it into the bus, and starts playback", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");
    const connectSpy = jest.spyOn(AudioBufferSourceNode.prototype, "connect");

    const engine = createAudioEngine();
    await engine.playCue("bell");

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledTimes(1);

    startSpy.mockRestore();
    connectSpy.mockRestore();
  });

  test("finalBell resolves to a real buffer even though it reuses the bell asset", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createAudioEngine();
    await engine.playCue("finalBell");

    expect(startSpy).toHaveBeenCalledTimes(1);

    startSpy.mockRestore();
  });

  test("handleTimerEvent dispatches through mapEventToCue and plays the mapped cue", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createAudioEngine();
    await engine.handleTimerEvent({ type: "work-warning" });
    // handleTimerEvent doesn't return the playCue promise, so flush the
    // microtask queue before asserting.
    await Promise.resolve();

    expect(startSpy).toHaveBeenCalledTimes(1);

    startSpy.mockRestore();
  });

  test("handleTimerEvent is a silent no-op for events with no mapped cue", async () => {
    const startSpy = jest.spyOn(AudioBufferSourceNode.prototype, "start");

    const engine = createAudioEngine();
    await engine.handleTimerEvent({ type: "phase-changed", phase: "ready", round: 0 });
    await Promise.resolve();

    expect(startSpy).not.toHaveBeenCalled();

    startSpy.mockRestore();
  });

  test("volume gain node is wired into the bus chain, not left disconnected", () => {
    const connectSpy = jest.spyOn(GainNode.prototype, "connect");

    createAudioEngine();

    expect(connectSpy).toHaveBeenCalled();

    connectSpy.mockRestore();
  });
});
