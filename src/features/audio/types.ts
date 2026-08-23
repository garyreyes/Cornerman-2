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
}
