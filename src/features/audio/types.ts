import type { TimerEvent } from "../timer/types";

/**
 * finalBell intentionally has no separate asset -- see
 * assets/audio/SOURCING.md.
 */
export type CueName = "bell" | "clapper" | "countdownTick" | "finalBell";

export interface AudioEngine {
  setVolume(appVolume: number): void;
  playCue(cue: CueName): void;
  /** Queues `cue` on the audio clock for wall-clock time `atWallMs`, so it
   * fires even while JS is asleep. `onEnded` fires once its last sound
   * finishes; the returned function cancels it. */
  scheduleCue(cue: CueName, atWallMs: number, onEnded: () => void): () => void;
  handleTimerEvent(event: TimerEvent): void;
  /**
   * Releases the underlying native AudioContext. Added 2026-08-26: this
   * interface had no way to do so at all, so every screen that built an
   * engine leaked one for the rest of the process -- the Assault-Bike
   * screen built a fresh one on every visit. Mirrors SpeechEngine.close.
   * Main Timer's own engine still never calls it, for the same reason
   * its speech engine doesn't: that screen never unmounts.
   */
  close(): Promise<void>;
}
