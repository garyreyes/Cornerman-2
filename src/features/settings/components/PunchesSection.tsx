import { SectionCard } from "../../../shared/components/SectionCard";
import { SummaryRow } from "../../../shared/components/SummaryRow";
import type { Punch } from "../types";

interface PunchesSectionProps {
  punches: Punch[];
  onOpen: () => void;
}

/** Reachable in both modes (docs/user-flows.md Flow 3), not hidden in Preset mode. */
export function PunchesSection({ punches, onOpen }: PunchesSectionProps) {
  return (
    <SectionCard title="PUNCHES">
      <SummaryRow label="Punches" value={`${punches.length} defined`} onPress={onOpen} />
    </SectionCard>
  );
}
