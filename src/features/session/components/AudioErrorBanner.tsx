import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

/**
 * "The timer still runs visually ... even if sound genuinely cannot
 * start, with a small persistent banner ... rather than blocking the
 * whole session" -- docs/user-flows.md's proposed default for this edge
 * case (audio engine init failure).
 */
export function AudioErrorBanner() {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Sound unavailable — check volume/permissions</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    banner: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.danger,
    },
    text: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.textPrimary,
      textAlign: "center",
    },
  });
}
