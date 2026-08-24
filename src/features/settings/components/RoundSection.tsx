import { StyleSheet, View } from "react-native";

import { SectionCard } from "../../../shared/components/SectionCard";
import { WheelPicker } from "../../../shared/components/WheelPicker";
import { formatSeconds, range } from "../format";
import type { Settings } from "../types";

interface RoundSectionProps {
  settings: Settings;
  onChange: (partial: Partial<Settings>) => void;
}

const ROUND_VALUES = range(1, 30, 1);
const WORK_VALUES = range(0, 600, 5);
const REST_VALUES = range(0, 300, 5);
const WARMUP_VALUES = range(0, 120, 5);

/** Round count + Work/Rest/Warmup duration -- the PRD's "iOS-style
 * continuous scroll picker" requirement (replacing fixed 15s increments). */
export function RoundSection({ settings, onChange }: RoundSectionProps) {
  return (
    <SectionCard title="ROUND">
      <WheelPicker
        label="Rounds"
        value={settings.rounds}
        values={ROUND_VALUES}
        onChange={(rounds) => onChange({ rounds })}
      />
      <View style={styles.row}>
        <WheelPicker
          label="Work"
          value={settings.workDurationSec}
          values={WORK_VALUES}
          formatValue={formatSeconds}
          onChange={(workDurationSec) => onChange({ workDurationSec })}
        />
        <WheelPicker
          label="Rest"
          value={settings.restDurationSec}
          values={REST_VALUES}
          formatValue={formatSeconds}
          onChange={(restDurationSec) => onChange({ restDurationSec })}
        />
        <WheelPicker
          label="Warmup"
          value={settings.warmupDurationSec}
          values={WARMUP_VALUES}
          formatValue={formatSeconds}
          onChange={(warmupDurationSec) => onChange({ warmupDurationSec })}
        />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
});
