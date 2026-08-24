import { nextGapFireTime } from "../../lib/gapTiming";
import type { Settings } from "../settings/types";
import type { DefenseCueName, RandomFn } from "./types";

export const DEFENSE_CUES: readonly DefenseCueName[] = ["roll", "slip", "duck", "pivot", "check", "clinch"];

export function pickDefenseCue(random: RandomFn = Math.random): DefenseCueName {
  return DEFENSE_CUES[Math.floor(random() * DEFENSE_CUES.length)]!;
}

/**
 * When the next defense/movement cue should fire, given settings'
 * independent gap range -- deliberately separate from comboGapMin/MaxSec
 * (PRD §10: this layer isn't mixed into combo timing). No phase-gating
 * here, same as timer/service.ts's firstComboAt: the caller (Phase 6's
 * screen loop) decides when to arm this, only during Work phase.
 */
export function nextDefenseCueFireTime(now: number, settings: Settings, random: RandomFn = Math.random): number {
  return nextGapFireTime(now, settings.defenseCueGapMinSec * 1000, settings.defenseCueGapMaxSec * 1000, random);
}
