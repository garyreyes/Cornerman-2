import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

/**
 * "The timer still runs visually ... even if sound genuinely cannot
 * start, with a small persistent banner ... rather than blocking the
 * whole session" -- docs/user-flows.md's proposed default for this edge
 * case (audio engine init failure).
 */
export function AudioErrorBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Sound unavailable — check volume/permissions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: theme.colors.danger,
  },
  text: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 12,
    color: theme.colors.enamelWhite,
    textAlign: "center",
  },
});
