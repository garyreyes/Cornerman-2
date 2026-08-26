import type { TimerEvent } from "../timer/types";

/**
 * finalBell intentionally has no separate asset -- see
 * assets/audio/SOURCING.md.
 */
export type CueName = "bell" | "clapper" | "countdownTick" | "finalBell";

export interface AudioEngine {
  setVolume(appVolume: number): void;
  playCue(cue: CueName): void;
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
