import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../features/session/theme";

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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.background,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.enamelWhite,
  },
  value: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.enamelMuted,
    marginTop: 2,
  },
  chevron: {
    fontFamily: theme.fonts.displaySemiBold,
    fontSize: 20,
    color: theme.colors.brassAmber,
  },
});
