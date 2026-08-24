import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../../features/session/theme";

/**
 * Placeholder for Phase 8a -- proves the gear icon actually reaches a
 * real, back-navigable screen. The real form (Round, Mode, Sounds,
 * Combinations, Combo Timing, Punches sections per docs/user-flows.md
 * Flow 3) is a following pass, confirmed split from this one.
 */
export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.center}>
        <Text style={styles.title}>SETTINGS</Text>
        <Text style={styles.body}>The full settings form lands in the next pass.</Text>
      </View>
    </SafeAreaView>
  );
}

export default SettingsScreen;

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
