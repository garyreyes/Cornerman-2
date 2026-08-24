import type { Combo } from "../comboEngine/types";
import type { DefenseCueName } from "../defenseCues/types";

export interface SessionState {
  /** Absolute timestamp the next combo should be generated + spoken; null when not in Work phase. */
  nextComboAt: number | null;
  /** Absolute timestamp the next defense/movement cue should fire; null when not in Work phase or disabled. */
  nextDefenseCueAt: number | null;
  /** The most recently generated combo, for the combo card. Persists into Rest so the last combo stays visible. */
  currentCombo: Combo | null;
  /** Running count of combos spoken this session (the "combo-count stat", docs/user-flows.md). */
  comboCount: number;
}

export type SessionAction =
  | { type: "speak-combo"; combo: Combo }
  | { type: "speak-defense-cue"; cue: DefenseCueName };

export type RandomFn = () => number;

/** Mirrors react-native-audio-api's AudioManager 'interruption' system event. */
export interface InterruptionEvent {
  type: "began" | "ended";
  shouldResume: boolean;
}

export interface InterruptionDecision {
  shouldPause: boolean;
  shouldResume: boolean;
  /** Whether the *current* pause (after this decision) was caused by an interruption, not the user. */
  pausedByInterruption: boolean;
}
