import { AudioContext } from "react-native-audio-api";
import type { AudioBuffer } from "react-native-audio-api";

import type { TimerEvent } from "../timer/types";
import type { AudioEngine, CueName } from "./types";

/**
 * finalBell deliberately reuses the bell asset -- see
 * assets/audio/SOURCING.md for why a 4th file isn't needed yet.
 */
const CUE_ASSETS: Record<CueName, number> = {
  bell: require("../../../assets/audio/bell.wav"),
  clapper: require("../../../assets/audio/clapper.wav"),
  countdownTick: require("../../../assets/audio/countdown-tick.wav"),
  finalBell: require("../../../assets/audio/bell.wav"),
};

/**
 * react-native-audio-api has no DynamicsCompressorNode yet (it's on the
 * library's own roadmap as "coming soon") so the old app's proven
 * masterGain(2.6x) -> DynamicsCompressor(-16dB/8:1) -> destination bus
 * (extraction doc §1.11) can't carry over as-is. A WaveShaper soft-clip
 * curve substitutes as a clipping guard for when cues overlap; the actual
 * makeup-gain value below is a neutral placeholder, not the old tuned
 * 2.6x -- that was tuned by ear for synthesized tones, and real sourced
 * samples (once dropped in per SOURCING.md) will need their own by-ear
 * pass on a real device, same as the old app's own history.
 */
const MAKEUP_GAIN = 1.0;
const LIMITER_DRIVE = 1.5;

/**
 * A real corner clapper is three fast, distinct claps -- "pak pak pak,"
 * not one "pak" -- confirmed explicitly after hearing the sourced
 * single-clap sample in place (extraction doc §1.12's authenticity bar
 * again). Rather than needing a pre-mixed 3-clap sample (harder to
 * source, impossible to retime), the single clap is scheduled 3 times
 * through the AudioContext's own sample-accurate clock -- the same
 * approach any real Web Audio API app uses for a rhythmic hit, not
 * three independent playCue calls from the caller.
 */
const CLAPPER_REPEAT_COUNT = 3;
const CLAPPER_GAP_SEC = 0.15;

function buildLimiterCurve(): Float32Array {
  const samples = 1024;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * LIMITER_DRIVE);
  }
  return curve;
}

export function mapEventToCue(event: TimerEvent): CueName | null {
  switch (event.type) {
    case "phase-changed":
      return event.phase === "work" || event.phase === "rest" ? "bell" : null;
    case "work-warning":
      return "clapper";
    case "rest-countdown":
      return "countdownTick";
    case "session-finished":
      return "finalBell";
    default:
      return null;
  }
}

export function gainForVolume(appVolume: number): number {
  return Math.min(1, Math.max(0, appVolume));
}

export function createAudioEngine(): AudioEngine {
  const context = new AudioContext();

  const volumeGain = context.createGain();
  const makeupGain = context.createGain();
  makeupGain.gain.value = MAKEUP_GAIN;
  const limiter = context.createWaveShaper();
  limiter.curve = buildLimiterCurve();

  volumeGain.connect(makeupGain);
  makeupGain.connect(limiter);
  limiter.connect(context.destination);

  const buffers = (Object.keys(CUE_ASSETS) as CueName[]).reduce(
    (acc, cue) => {
      acc[cue] = context.decodeAudioData(CUE_ASSETS[cue]);
      return acc;
    },
    {} as Record<CueName, Promise<AudioBuffer>>,
  );

  function setVolume(appVolume: number): void {
    volumeGain.gain.value = gainForVolume(appVolume);
  }
  setVolume(1.0);

  async function playCue(cue: CueName): Promise<void> {
    const buffer = await buffers[cue];
    const repeatCount = cue === "clapper" ? CLAPPER_REPEAT_COUNT : 1;
    for (let i = 0; i < repeatCount; i++) {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(volumeGain);
      source.start(context.currentTime + i * CLAPPER_GAP_SEC);
    }
  }

  function handleTimerEvent(event: TimerEvent): void {
    const cue = mapEventToCue(event);
    if (cue) {
      void playCue(cue);
    }
  }

  return { setVolume, playCue, handleTimerEvent };
}
