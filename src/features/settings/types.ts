export type ComboMode = "random" | "preset";

/** Whether combo speech announces a punch's name ("Lead Hook") or its number ("three"). */
export type AnnounceStyle = "name" | "number";

export interface Settings {
  rounds: number;
  workDurationSec: number;
  restDurationSec: number;
  warmupDurationSec: number;
  mode: ComboMode;
  activePresetId: string | null;
  comboGapMinSec: number;
  comboGapMaxSec: number;
  /** How many punches make up one randomly-generated combo (Random mode) */
  comboLengthMin: number;
  comboLengthMax: number;
  /** Punch.num values eligible for Random mode's draw; null = every current punch */
  randomPunchPool: number[] | null;
  /** 0.25-4.0 -- react-native-audio-api's native WSOLA time-stretch hard-caps at 4x (PROJECT_FACTS.md) */
  speechRate: number;
  /** 0-1, this app's own output only, independent of device media volume */
  appVolume: number;
  announceStyle: AnnounceStyle;
  /** Whether the defense/movement cue layer (roll/slip/duck/...) fires at all during Work phase */
  defenseCuesEnabled: boolean;
  defenseCueGapMinSec: number;
  defenseCueGapMaxSec: number;
  /** Whether the first-launch onboarding screen (docs/user-flows.md Flow 1) has ever been completed */
  hasCompletedOnboarding: boolean;
}

export interface Punch {
  id: string;
  /** Not required to be unique or sequential (extraction doc §1.6) */
  num: number;
  name: string;
}

export interface Preset {
  id: string;
  name: string;
  /** Punch.num values, resolved to live names at call time */
  sequence: number[];
}
