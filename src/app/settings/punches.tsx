import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../../features/session/theme";

/**
 * Placeholder for Phase 8b -- proves the Settings summary row actually
 * reaches a real, back-navigable screen (same "prove reachable first"
 * pattern the settings/index.tsx nav-infra pass used). The real add/
 * rename/delete + Preview form (docs/user-flows.md Flow 4) is 8b's job.
 */
export function PunchesScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <View style={styles.center}>
        <Text style={styles.title}>PUNCHES</Text>
        <Text style={styles.body}>The add/rename/delete form lands in Phase 8b.</Text>
      </View>
    </SafeAreaView>
  );
}

export default PunchesScreen;

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
