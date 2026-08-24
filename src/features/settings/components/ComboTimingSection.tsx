import { LabeledSlider } from "../../../shared/components/LabeledSlider";
import { RangeSliderPair } from "../../../shared/components/RangeSliderPair";
import { SectionCard } from "../../../shared/components/SectionCard";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";
import type { AnnounceStyle, Settings } from "../types";

interface ComboTimingSectionProps {
  settings: Settings;
  onChange: (partial: Partial<Settings>) => void;
}

const ANNOUNCE_OPTIONS: { value: AnnounceStyle; label: string }[] = [
  { value: "name", label: "NAME" },
  { value: "number", label: "NUMBER" },
];

/**
 * Gap floor is 0.5s, not 0 -- "an intentional speed-training ceiling, not a
 * bug to clamp away" (extraction doc §1.7's "Blitz" mode); rate range is
 * 0.25x-4x, the confirmed native WSOLA ceiling (PROJECT_FACTS.md, Phase 5b).
 */
export function ComboTimingSection({ settings, onChange }: ComboTimingSectionProps) {
  return (
    <SectionCard title="COMBO TIMING">
      <RangeSliderPair
        title="Combo gap"
        minLabel="Min gap"
        maxLabel="Max gap"
        minValue={settings.comboGapMinSec}
        maxValue={settings.comboGapMaxSec}
        bounds={[0.5, 10]}
        step={0.1}
        formatValue={(v) => `${v.toFixed(1)}s`}
        onChange={(comboGapMinSec, comboGapMaxSec) => onChange({ comboGapMinSec, comboGapMaxSec })}
      />

      <LabeledSlider
        label="Speech rate"
        value={settings.speechRate}
        minimumValue={0.25}
        maximumValue={4.0}
        step={0.05}
        formatValue={(v) => `${v.toFixed(2)}x`}
        onChange={(speechRate) => onChange({ speechRate })}
      />

      <SegmentedControl
        options={ANNOUNCE_OPTIONS}
        value={settings.announceStyle}
        onChange={(announceStyle) => onChange({ announceStyle })}
      />
    </SectionCard>
  );
}
