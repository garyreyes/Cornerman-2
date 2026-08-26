import { useEffect, useRef, useState } from "react";

import { pickDefenseCue } from "../defenseCues/service";
import type { DefenseCueName } from "../defenseCues/types";
import { getSettings } from "../settings/service";
import { createSpeechEngine } from "../speech/service";
import type { SpeechEngine } from "../speech/types";
import { nextCommandFireTime } from "./service";
import type { Difficulty } from "./types";

export interface UseCornerCommandsDrillResult {
  /** The most recently called command; null between activations. Shown
   * as text (mirrors ComboCard showing boxing's spoken combos) as well
   * as spoken -- there's no tap/resolution step for this drill (see
   * ROADMAP.md's 11d notes on why). */
  currentCommand: DefenseCueName | null;
}

/**
 * Speaks a stream of corner commands (defenseCues' existing bundled
 * vocabulary -- "roll"/"slip"/"duck"/"pivot"/"check"/"clinch") at a
 * difficulty-scaled gap while `active`, for as long as the Drill phase
 * lasts. No tap, no correctness/reaction-time resolution -- the app has
 * no way to see a physical shadow-boxing response, so it doesn't pretend
 * to grade one (confirmed choice, not an oversight).
 *
 * Owns its own SpeechEngine for this hook's whole mount lifetime (not
 * recreated every time `active` toggles across rounds) -- mirrors
 * settings/previewEngine.ts's "shorter-lived screen owns and closes its
 * own engine" pattern, unlike useSession.ts's engine, which is never
 * closed because Main Timer never unmounts.
 */
export function useCornerCommandsDrill(active: boolean, difficulty: Difficulty): UseCornerCommandsDrillResult {
  const [currentCommand, setCurrentCommand] = useState<DefenseCueName | null>(null);
  const speechEngineRef = useRef<SpeechEngine | null>(null);
  const nextFireTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const initSpeechEngine = () => {
      try {
        const engine = createSpeechEngine(getSettings().ttsVoice);
        engine.setVolume(getSettings().appVolume);
        speechEngineRef.current = engine;
      } catch {
        // Silent -- the command still displays as text even if speech
        // genuinely can't play, same "still runs visually" degrade
        // spirit as the bike screen's own AudioErrorBanner covers for
        // the bell cue engine, just without a duplicate banner for this
        // much lower-stakes secondary failure.
      }
    };
    initSpeechEngine();
    return () => {
      void speechEngineRef.current?.close();
      speechEngineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const syncActive = () => {
      if (!active) {
        setCurrentCommand(null);
        return;
      }
      const speakNext = () => {
        const command = pickDefenseCue();
        setCurrentCommand(command);
        speechEngineRef.current?.playWord(command);
        const now = Date.now();
        const fireAt = nextCommandFireTime(now, difficulty);
        nextFireTimeoutRef.current = setTimeout(speakNext, Math.max(0, fireAt - now));
      };
      speakNext();
    };
    syncActive();
    return () => {
      if (nextFireTimeoutRef.current !== null) {
        clearTimeout(nextFireTimeoutRef.current);
        nextFireTimeoutRef.current = null;
      }
    };
  }, [active, difficulty]);

  return { currentCommand };
}
