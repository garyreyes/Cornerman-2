import { SectionCard } from "../../../shared/components/SectionCard";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";
import type { ComboMode, Settings } from "../types";

interface ModeSectionProps {
  settings: Settings;
  onChange: (partial: Partial<Settings>) => void;
}

const MODE_OPTIONS: { value: ComboMode; label: string }[] = [
  { value: "random", label: "RANDOM" },
  { value: "preset", label: "PRESET" },
];

export function ModeSection({ settings, onChange }: ModeSectionProps) {
  return (
    <SectionCard title="MODE">
      <SegmentedControl options={MODE_OPTIONS} value={settings.mode} onChange={(mode) => onChange({ mode })} />
    </SectionCard>
  );
}
