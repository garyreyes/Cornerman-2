import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens, Fonts } from "../theme/tokens";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Themed pill toggle -- Mode (Random/Preset) and Announce Style (Name/Number). */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
            // Visual height (~32px) is under the 44/48pt touch-target
            // minimum -- found 2026-08-25 via /impeccable critique.
            // Top/bottom only: segments already sit edge-to-edge
            // horizontally (3px gap), so any left/right hitSlop would
            // overlap into the neighboring segment.
            hitSlop={{ top: 9, bottom: 9 }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    track: {
      flexDirection: "row",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.panelLine,
      backgroundColor: colors.background,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 4,
      alignItems: "center",
    },
    segmentActive: {
      backgroundColor: colors.accent,
    },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      letterSpacing: 1,
      color: colors.textMuted,
    },
    labelActive: {
      color: colors.background,
    },
  });
}
