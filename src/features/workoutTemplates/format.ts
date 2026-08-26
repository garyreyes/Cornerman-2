import { formatSeconds } from "../settings/format";
import type { BoxingConfig } from "./types";

/** "8 rounds · 3:00 work / 1:00 rest" summary line for a Templates Picker row. */
export function summarizeBoxingConfig(config: BoxingConfig): string {
  const rounds = config.roundPlan.length;
  const roundsLabel = `${rounds} round${rounds === 1 ? "" : "s"}`;
  return `${roundsLabel} · ${formatSeconds(config.baseWorkDurationSec)} work / ${formatSeconds(config.baseRestDurationSec)} rest`;
}
