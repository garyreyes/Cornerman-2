import { resolvePunchName } from "../comboEngine/service";
import { formatSeconds } from "../settings/format";
import type { Preset, Punch } from "../settings/types";
import type { AssaultBikeConfig, BoxingConfig, ComboSource, DrillMode, RoundConfig } from "./types";

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

/** Title-cased for display -- the DrillMode values themselves stay
 * kebab-case identifiers, never shown raw (Phase 11 leaked "visual"
 * straight into this row; a user-facing string and a discriminant are
 * different things). */
const DRILL_LABEL: Readonly<Record<DrillMode, string>> = {
  "odd-one-out": "Odd One Out",
  "color-call": "Color Call",
};

/** "8 rounds · 0:10 work / 0:40 rest · Odd One Out" summary line for a
 * Templates Picker row. Total rest is the rest plan's own sum, not a
 * separately tracked field (see types.ts's note on why `restSec` was
 * dropped); a plain-rest protocol says "no drill" rather than naming one
 * it doesn't run. Uses formatSeconds like the boxing row above rather
 * than raw `${n}s` -- Aerobic Power's 4-minute work interval would
 * otherwise read "240s". */
export function summarizeAssaultBikeConfig(config: AssaultBikeConfig): string {
  const rounds = config.roundsTarget;
  const roundsLabel = `${rounds} round${rounds === 1 ? "" : "s"}`;
  const { rest } = config;
  const totalRestSec = rest.kind === "plain" ? rest.restSec : rest.settleSec + rest.drillSec + rest.resetSec;
  const drillLabel = rest.kind === "plain" ? "no drill" : DRILL_LABEL[rest.drillMode];
  return `${roundsLabel} · ${formatSeconds(config.workSec)} work / ${formatSeconds(totalRestSec)} rest · ${drillLabel}`;
}
