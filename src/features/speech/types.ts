export interface SpeechEngine {
  setVolume(appVolume: number): void;
  /**
   * Plays the bundled clip matching `text`, if one exists. Returns whether
   * a clip was found -- an unrecognized word (e.g. an un-generated custom
   * punch name) is a silent no-op here; on-device TTS synthesis for that
   * case is Phase 5c, not yet built.
   */
  playWord(text: string): boolean;
}
