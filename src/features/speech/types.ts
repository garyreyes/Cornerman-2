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
}
