/**
 * Every voice Settings > Combo Timing lets the user pick between --
 * confirmed 2026-08-24 after the user listened to samples of all 9 of
 * Kokoro's American-male voices and picked these two. Adding a third
 * later is just appending here, appending to
 * scripts/generate_voice_bank.py's VOICES list, and adding a matching
 * subfolder under assets/audio/voice/ -- no other architecture change.
 */
export type TtsVoice = "am_michael" | "am_eric";

export const VOICE_OPTIONS: { value: TtsVoice; label: string }[] = [
  { value: "am_michael", label: "MICHAEL" },
  { value: "am_eric", label: "ERIC" },
];

export const DEFAULT_VOICE: TtsVoice = "am_michael";

export interface SpeechEngine {
  setVolume(appVolume: number): void;
  /**
   * Sets the pitch-preserving playback rate used by subsequent playWord
   * calls. Clamped to [0.25, 4.0] -- react-native-audio-api's native
   * WSOLA time-stretch hard-caps at 4x (PROJECT_FACTS.md), not the
   * originally-discussed 5x.
   */
  setRate(rate: number): void;
  /**
   * Plays the bundled clip matching `text` if one exists (pitch-preserving,
   * via react-native-audio-api); otherwise falls through to live on-device
   * TTS (expo-speech -- no library can synthesize to a cacheable file, so
   * this re-synthesizes every call, through the OS's own audio output, not
   * this engine's AudioContext bus -- see PROJECT_FACTS.md). Returns false
   * only for blank/empty text.
   */
  playWord(text: string): boolean;
  /**
   * Speaks each word in `texts` in order, not all at once -- for a combo's
   * multiple punches, unlike playWord's single-word contract. Scheduled on
   * the AudioContext's own clock with a short gap between words (see
   * speech/service.ts's WORD_GAP_SEC), not fired simultaneously (which is
   * both unintelligible and can clip/distort as the summed waveforms
   * exceed full scale) and not via JS timers (imprecise). Fire-and-forget,
   * same reasoning as playWord.
   */
  playCombo(texts: string[]): void;
  /**
   * Releases the underlying native AudioContext. useSession.ts's own engine
   * never calls this (Main Timer is the app's one long-lived screen, so it
   * was never needed there), but any engine created for a shorter-lived
   * screen -- e.g. Punches' Preview action (previewEngine.ts) -- should
   * call this on unmount rather than leaking a native context for the rest
   * of the process lifetime.
   */
  close(): Promise<void>;
}
