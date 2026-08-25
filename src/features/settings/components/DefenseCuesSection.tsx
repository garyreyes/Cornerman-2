import { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { RangeSliderPair } from "../../../shared/components/RangeSliderPair";
import { SectionCard } from "../../../shared/components/SectionCard";
import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";
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
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <SectionCard title="DEFENSE CUES">
      <View style={styles.header}>
        <Text style={styles.label}>Enabled</Text>
        <Switch
          value={settings.defenseCuesEnabled}
          onValueChange={(defenseCuesEnabled) => onChange({ defenseCuesEnabled })}
          trackColor={{ false: colors.panelLine, true: colors.accentDim }}
          thumbColor={settings.defenseCuesEnabled ? colors.accent : colors.textMuted}
          accessibilityLabel="Defense cues enabled"
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

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    label: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
  });
}
