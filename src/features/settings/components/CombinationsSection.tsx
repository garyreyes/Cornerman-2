import { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { ChipMultiSelect } from "../../../shared/components/ChipMultiSelect";
import { RangeSliderPair } from "../../../shared/components/RangeSliderPair";
import { SectionCard } from "../../../shared/components/SectionCard";
import { SummaryRow } from "../../../shared/components/SummaryRow";
import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";
import type { Preset, Punch, Settings } from "../types";

interface CombinationsSectionProps {
  settings: Settings;
  punches: Punch[];
  presets: Preset[];
  onChange: (partial: Partial<Settings>) => void;
  onOpenPresets: () => void;
}

/**
 * Mode-aware, per the confirmed choice to fold comboLengthMin/Max +
 * randomPunchPool into "Combinations" rather than adding a 7th top-level
 * section: Random mode shows combo length + punch pool (how a combo gets
 * put together), Preset mode shows the Presets List summary row (also how
 * a combo gets put together, just via a saved sequence instead) -- same
 * confirmed section slot (extraction doc §1.14) either way.
 */
export function CombinationsSection({ settings, punches, presets, onChange, onOpenPresets }: CombinationsSectionProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (settings.mode === "preset") {
    const activePreset = presets.find((p) => p.id === settings.activePresetId);
    return (
      <SectionCard title="COMBINATIONS">
        <SummaryRow
          label="Presets"
          value={`${presets.length} saved · ${activePreset ? activePreset.name : "none active"}`}
          onPress={onOpenPresets}
        />
      </SectionCard>
    );
  }

  const restrictPool = settings.randomPunchPool !== null;
  const poolNums = settings.randomPunchPool ?? punches.map((p) => p.num);

  function handleTogglePool(next: boolean) {
    onChange({ randomPunchPool: next ? Array.from(new Set(punches.map((p) => p.num))) : null });
  }

  function handleToggleChip(num: number) {
    const next = poolNums.includes(num) ? poolNums.filter((n) => n !== num) : [...poolNums, num];
    // Dedupe: Punch.num is explicitly allowed to be non-unique (extraction
    // doc §1.6), so without this a duplicated num inflates poolNums.length
    // past the number of distinct selections, and ChipMultiSelect's
    // last-chip guard (selected.length <= 1) stops protecting the actual
    // last distinct punch number.
    onChange({ randomPunchPool: Array.from(new Set(next)) });
  }

  return (
    <SectionCard title="COMBINATIONS">
      <RangeSliderPair
        title="Combo length"
        minLabel="Min punches"
        maxLabel="Max punches"
        minValue={settings.comboLengthMin}
        maxValue={settings.comboLengthMax}
        bounds={[1, 8]}
        step={1}
        onChange={(comboLengthMin, comboLengthMax) => onChange({ comboLengthMin, comboLengthMax })}
      />

      <View style={styles.poolHeader}>
        <Text style={styles.poolLabel}>Restrict punch pool</Text>
        <Switch
          value={restrictPool}
          onValueChange={handleTogglePool}
          trackColor={{ false: colors.panelLine, true: colors.accentDim }}
          thumbColor={restrictPool ? colors.accent : colors.textMuted}
        />
      </View>
      {restrictPool ? (
        <ChipMultiSelect
          items={punches.map((p) => ({ id: p.id, value: p.num, label: p.name }))}
          selected={poolNums}
          onToggle={handleToggleChip}
        />
      ) : (
        <Text style={styles.note}>Drawing from all {punches.length} current punches.</Text>
      )}
    </SectionCard>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    poolHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    poolLabel: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    note: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
    },
  });
}
