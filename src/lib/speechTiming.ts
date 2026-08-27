/**
 * How long a spoken combo takes, so the combo gap can mean throwing time
 * rather than being eaten by the call-out itself.
 *
 * The gap used to be armed from the instant a combo *started* being spoken
 * (session/service.ts), which made every configured gap shorter than it
 * read: a 4-punch combo takes ~3.3s to say, so a 3-5s gap left barely a
 * second to actually throw it, and the old "Intense" 1-2s gap was shorter
 * than the combo itself -- the same overlap that caused the Phase 12 echo.
 *
 * This is an estimate, deliberately. The real duration is only knowable
 * inside SpeechEngine (per-clip buffer lengths, and unknowable ahead of
 * time for a custom punch name falling through to on-device TTS), and
 * feeding it back would move timing decisions into the untested native
 * consumer and add a failure mode where a combo that never reports
 * completion stops the round's scheduling entirely. A pure estimate keeps
 * the decision testable and degrades to "off by a few hundred ms".
 */

import { rateForSpeechRate } from "../features/speech/rate";

/**
 * Mean duration of the bundled voice bank's punch/kick clips, measured
 * from the committed WAV headers (n=27, range 0.40s "jab" to 1.07s "lead
 * inside kick"). Re-measure if the bank is regenerated with a different
 * voice or model -- see scripts/generate_voice_bank.py.
 */
export const AVG_SPOKEN_WORD_MS = 730;

/** Mirrors speech/service.ts's WORD_GAP_SEC (0.12s), the silence the
 * engine schedules between consecutive words of one combo. */
export const SPOKEN_WORD_GAP_MS = 120;

/**
 * `wordCount` is the number of punches in the combo -- one spoken word
 * each, with a gap *between* them, so n words carry n-1 gaps.
 */
export function estimateComboSpeechMs(wordCount: number, speechRate: number): number {
  if (wordCount <= 0) {
    return 0;
  }
  const raw = wordCount * AVG_SPOKEN_WORD_MS + (wordCount - 1) * SPOKEN_WORD_GAP_MS;
  return raw / rateForSpeechRate(speechRate);
}
