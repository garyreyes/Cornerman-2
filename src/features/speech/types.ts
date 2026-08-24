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
   * Plays the bundled clip matching `text`, if one exists. Returns whether
   * a clip was found -- an unrecognized word (e.g. an un-generated custom
   * punch name) is a silent no-op here; on-device TTS synthesis for that
   * case is Phase 5c, not yet built.
   */
  playWord(text: string): boolean;
}
