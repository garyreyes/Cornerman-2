import { Platform } from "react-native";
import { AudioManager, PlaybackNotificationManager } from "react-native-audio-api";

import type { InterruptionEvent } from "../features/session/types";

/**
 * Native background-audio session config (Phase 7a). The declarative half
 * (iOS UIBackgroundModes: audio, Android foreground service) is already
 * covered for free by react-native-audio-api's own Expo config plugin,
 * default-enabled and already listed in app.json -- nothing to add there.
 * This is the runtime half: activating the session with the right iOS
 * category so playback actually continues when locked/backgrounded, and
 * turning on interruption (phone call, another app taking audio focus)
 * event delivery. Best-effort and non-fatal by design -- failing to get
 * ideal background continuity isn't the same failure class as the audio
 * engine not initializing at all (AudioErrorBanner), so failures here are
 * swallowed rather than surfaced.
 */
export function initBackgroundAudioSession(): void {
  try {
    AudioManager.setAudioSessionOptions({ iosCategory: "playback" });
    AudioManager.setAudioSessionActivity(true);
    AudioManager.observeAudioInterruptions(true);
  } catch {
    // Best-effort -- see module comment.
  }
}

/**
 * Subscribes to native audio-focus interruption events. Returns an
 * unsubscribe function. The actual pause/resume decision is a pure,
 * tested function (session/service.ts's decideInterruptionAction) --
 * this just forwards the raw event, matching the rest of this codebase's
 * pure-decision/impure-consumer split.
 */
export function subscribeToInterruptions(callback: (event: InterruptionEvent) => void): () => void {
  const subscription = AudioManager.addSystemEventListener("interruption", callback);
  return () => subscription?.remove();
}

const NOTIFICATION_TITLE = "Cornerman";
const NOTIFICATION_ARTIST = "Training session running";

/**
 * Minimal lock-screen / notification-shade indicator while a session is
 * active -- confirmed scope for 7a (not strictly required for the Android
 * foreground service to survive, since Android generates a bare default
 * notification for any running foreground service regardless, but this
 * is standard UX for any app claiming background audio and the safer
 * default for Play Store review). Cosmetic and best-effort: failures are
 * swallowed, never surfaced to the user.
 */
export function showSessionNotification(state: "playing" | "paused"): void {
  PlaybackNotificationManager.show({ title: NOTIFICATION_TITLE, artist: NOTIFICATION_ARTIST, state }).catch(
    () => {},
  );
}

export function hideSessionNotification(): void {
  PlaybackNotificationManager.hide().catch(() => {});
}

/**
 * The Android 13+ runtime notification permission (docs/user-flows.md
 * Flow 1) -- iOS has no equivalent runtime prompt (background audio mode
 * is a declared capability there, not a user permission), so this
 * resolves true immediately on every other platform. Denial is
 * non-fatal by design (Flow 1's proposed default): the app proceeds
 * either way, this is only ever used to decide whether to show the
 * onboarding flow's battery-optimization follow-up step.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }
  try {
    const status = await AudioManager.requestNotificationPermissions();
    return status === "Granted";
  } catch {
    return false;
  }
}
