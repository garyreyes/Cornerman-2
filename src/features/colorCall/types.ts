/** Re-exported, not redeclared -- workoutTemplates/types.ts is the actual
 * owner of the drill difficulty; every drill imports the same one. */
export type { Difficulty } from "../workoutTemplates/types";
export type { RandomFn, TrialOutcome } from "../../lib/drillTrial";

/**
 * The six colours the voice bank can name (Phase 12c -- generated into
 * assets/audio/voice/<voice>/ by scripts/generate_voice_bank.py, one clip
 * per colour per voice). Adding a seventh means generating its clip for
 * every voice first; the spoken word is what makes this drill work, so a
 * colour with no clip would be unplayable rather than merely unlabelled.
 */
export const DRILL_COLORS = ["red", "blue", "green", "yellow", "orange", "purple"] as const;

export type DrillColor = (typeof DRILL_COLORS)[number];

/** One drawn trial: distinct colours laid out in tile order, one of which
 * was called aloud. `target` is always present in `choices` -- a trial
 * naming a colour that isn't on screen would be unanswerable. */
export interface ColorTrial {
  choices: DrillColor[];
  target: DrillColor;
  startedAt: number;
}
