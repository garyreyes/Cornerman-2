import { createSpeechEngine } from "../speech/service";
import type { SpeechEngine } from "../speech/types";
import { getSettings } from "./service";

let engine: SpeechEngine | null = null;
let engineInitFailed = false;

/**
 * Preview playback for the Punches screen's non-blocking "hear how this
 * name will sound" action (docs/user-flows.md Flow 4) -- reuses the real
 * SpeechEngine (bundled clip or on-device TTS fallback) so Preview
 * actually sounds like what the user will hear mid-session, not a
 * simplified stand-in.
 *
 * Scoped to the Punches screen's own mount/unmount (call initPreviewEngine
 * on mount, disposePreviewEngine on unmount) rather than kept alive for the
 * app's process lifetime -- unlike useSession.ts's engine, which is never
 * closed because Main Timer is the app's one long-lived screen and closing
 * was never relevant there. SpeechEngine.close() releases the underlying
 * native AudioContext, so this module doesn't leave a second permanently-
 * open audio context behind every time a user visits Punches once.
 */
export function initPreviewEngine(): void {
  if (engine !== null || engineInitFailed) {
    return;
  }
  try {
    engine = createSpeechEngine();
  } catch {
    engineInitFailed = true;
  }
}

export function disposePreviewEngine(): void {
  if (engine !== null) {
    void engine.close();
  }
  engine = null;
  engineInitFailed = false;
}

/**
 * Rate/volume are re-read from Settings on every call rather than cached
 * at init, since the user may have just changed them on the Settings
 * screen one tap ago. Returns false if the engine failed to initialize
 * (playWord's own contract already guards against blank text before this
 * is ever reached -- see PunchRow.tsx) -- this can't currently detect a
 * genuine single-word playback failure, only a total engine-init failure,
 * since SpeechEngine.playWord's synchronous return contract can't surface
 * an async decode error (see speech/service.ts's playWord).
 */
export function previewPunchName(text: string): boolean {
  if (engine === null) {
    return false;
  }
  const settings = getSettings();
  engine.setVolume(settings.appVolume);
  engine.setRate(settings.speechRate);
  return engine.playWord(text);
}
