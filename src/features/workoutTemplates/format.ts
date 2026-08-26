import { resolvePunchName } from "../comboEngine/service";
import { formatSeconds } from "../settings/format";
import type { Preset, Punch } from "../settings/types";
import type { AssaultBikeConfig, BoxingConfig, ComboSource, RoundConfig } from "./types";

/** "8 rounds · 3:00 work / 1:00 rest" summary line for a Templates Picker row. */
export function summarizeBoxingConfig(config: BoxingConfig): string {
  const rounds = config.roundPlan.length;
  const roundsLabel = `${rounds} round${rounds === 1 ? "" : "s"}`;
  return `${roundsLabel} · ${formatSeconds(config.baseWorkDurationSec)} work / ${formatSeconds(config.baseRestDurationSec)} rest`;
}

/** "Random", "Fixed: Jab", "Sequence: Jab → Cross", "Preset: My Combo" --
 * collapsed-card summary for a round's comboSource in the Round Builder. */
export function summarizeComboSource(source: ComboSource, punches: Punch[], presets: Preset[]): string {
  switch (source.type) {
    case "random":
      return source.punchPool ? "Random (restricted pool)" : "Random";
    case "fixed-punch":
      return `Fixed: ${resolvePunchName(punches, source.punchNum).name}`;
    case "fixed-sequence":
      return source.sequence.length === 0
        ? "Sequence: (empty)"
        : `Sequence: ${source.sequence.map((num) => resolvePunchName(punches, num).name).join(" → ")}`;
    case "preset": {
      const preset = presets.find((p) => p.id === source.presetId);
      return `Preset: ${preset ? preset.name : "(none selected)"}`;
    }
  }
}

/** "Round 3" fallback label, or the round's own label when set. */
export function roundDisplayLabel(round: RoundConfig, index: number): string {
  return round.label && round.label.trim() !== "" ? round.label : `Round ${index + 1}`;
}

/** "8 rounds · 10s work / 50s rest · visual" summary line for a Templates
 * Picker row -- total rest is the restPhases' own sum, not a separately
 * tracked field (see types.ts's note on why `restSec` was dropped). */
export function summarizeAssaultBikeConfig(config: AssaultBikeConfig): string {
  const rounds = config.roundsTarget;
  const roundsLabel = `${rounds} round${rounds === 1 ? "" : "s"}`;
  const totalRestSec = config.restPhases.settleSec + config.restPhases.drillSec + config.restPhases.resetSec;
  return `${roundsLabel} · ${config.workSec}s work / ${totalRestSec}s rest · ${config.drillMode}`;
}
