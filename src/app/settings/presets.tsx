import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../../features/session/theme";

/**
 * Placeholder for Phase 8c -- proves the Combinations summary row (Preset
 * mode) actually reaches a real, back-navigable screen, same pattern as
 * punches.tsx. The real Presets List + Preset Editor (docs/user-flows.md
 * Flow 5) is 8c's job.
 */
export function PresetsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <View style={styles.center}>
        <Text style={styles.title}>PRESETS</Text>
        <Text style={styles.body}>The Presets List + Editor land in Phase 8c.</Text>
      </View>
    </SafeAreaView>
  );
}

export default PresetsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 28,
    letterSpacing: 1,
    color: theme.colors.enamelWhite,
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.enamelMuted,
    textAlign: "center",
  },
});
