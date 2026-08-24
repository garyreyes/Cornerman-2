import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens, Fonts } from "../theme/tokens";

interface SummaryRowProps {
  label: string;
  value: string;
  onPress: () => void;
}

/**
 * Tappable row showing current state instead of requiring recall (UX
 * floor: "recognition over recall") -- e.g. "3 presets", "7 punches" --
 * before drilling into the Punches/Presets sub-screens.
 */
export function SummaryRow({ label, value, onPress }: SummaryRowProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    value: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    chevron: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 20,
      color: colors.accent,
    },
  });
}
