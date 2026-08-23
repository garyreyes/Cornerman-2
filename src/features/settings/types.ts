export type ComboMode = "random" | "preset";

export interface Settings {
  rounds: number;
  workDurationSec: number;
  restDurationSec: number;
  warmupDurationSec: number;
  mode: ComboMode;
  activePresetId: string | null;
  comboGapMinSec: number;
  comboGapMaxSec: number;
  /** 0.25-5.0 */
  speechRate: number;
  /** 0-1, this app's own output only, independent of device media volume */
  appVolume: number;
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
