import { StyleSheet, Switch, Text, View } from "react-native";

import { theme } from "../../session/theme";
import { RangeSliderPair } from "../../../shared/components/RangeSliderPair";
import { SectionCard } from "../../../shared/components/SectionCard";
import type { Settings } from "../types";

interface DefenseCuesSectionProps {
  settings: Settings;
  onChange: (partial: Partial<Settings>) => void;
}

/**
 * New section, not in Flow 3's original order -- the defense/movement cue
 * layer (roll/slip/duck/...) didn't exist when that order was confirmed
 * (Phase 5d). Placed after Combo Timing, before Punches: newest/most
 * tangential feature, kept low in the visual hierarchy rather than
 * disrupting the confirmed core order above it.
 */
export function DefenseCuesSection({ settings, onChange }: DefenseCuesSectionProps) {
  return (
    <SectionCard title="DEFENSE CUES">
      <View style={styles.header}>
        <Text style={styles.label}>Enabled</Text>
        <Switch
          value={settings.defenseCuesEnabled}
          onValueChange={(defenseCuesEnabled) => onChange({ defenseCuesEnabled })}
          trackColor={{ false: theme.colors.panelLine, true: theme.colors.brassAmberDim }}
          thumbColor={settings.defenseCuesEnabled ? theme.colors.brassAmber : theme.colors.enamelMuted}
        />
      </View>
      {settings.defenseCuesEnabled ? (
        <RangeSliderPair
          title="Call-out gap"
          minLabel="Min gap"
          maxLabel="Max gap"
          minValue={settings.defenseCueGapMinSec}
          maxValue={settings.defenseCueGapMaxSec}
          bounds={[5, 60]}
          step={1}
          formatValue={(v) => `${Math.round(v)}s`}
          onChange={(defenseCueGapMinSec, defenseCueGapMaxSec) => onChange({ defenseCueGapMinSec, defenseCueGapMaxSec })}
        />
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.enamelWhite,
  },
});
