/**
 * Split out of service.ts so pure timing code (lib/speechTiming.ts) can
 * share the exact same clamp without pulling service.ts's whole bundled
 * voice-bank `require()` map into its import graph.
 *
 * Clamped to [0.25, 4.0] -- react-native-audio-api's native WSOLA
 * time-stretch hard-caps playbackRate at a fixed C++ constant
 * (WsolaTimeStretcher::MAX_PLAYBACK_RATE = 4), confirmed 2026-08-24
 * reading its source. Revised down from an originally-discussed 5x
 * rather than building extra complexity (e.g. a second pre-compressed
 * buffer per clip) to work around a fixed native ceiling -- see
 * PROJECT_FACTS.md.
 */
export function rateForSpeechRate(speechRate: number): number {
  return Math.min(4.0, Math.max(0.25, speechRate));
}
