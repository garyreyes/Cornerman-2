import { LabeledSlider } from "../../../shared/components/LabeledSlider";
import { SectionCard } from "../../../shared/components/SectionCard";
import type { Settings } from "../types";

interface SoundsSectionProps {
  settings: Settings;
  onChange: (partial: Partial<Settings>) => void;
}

/**
 * Just the volume slider -- there's no bell/clapper "choice" of multiple
 * sound variants to pick between (audio/service.ts's CUE_ASSETS is a fixed
 * single asset per cue), only this app's independent output volume,
 * separate from device media volume (PRD §3.4/§8).
 */
export function SoundsSection({ settings, onChange }: SoundsSectionProps) {
  return (
    <SectionCard title="SOUNDS">
      <LabeledSlider
        label="App volume"
        value={settings.appVolume}
        minimumValue={0}
        maximumValue={1}
        step={0.05}
        formatValue={(v) => `${Math.round(v * 100)}%`}
        onChange={(appVolume) => onChange({ appVolume })}
      />
    </SectionCard>
  );
}
