/**
 * The orientation tour on its own, reached from Settings rather than as
 * part of first launch.
 *
 * It exists because onboarding runs exactly once, ever
 * (Settings.hasCompletedOnboarding, docs/user-flows.md Flow 1) -- without
 * a way back, everything the tour says would be unreachable after the
 * first thirty seconds of using the app, which is exactly when it stops
 * being memorable.
 *
 * Lives under the Settings stack rather than at the root so it inherits
 * the themed header and back arrow the rest of the drill-in screens use.
 * No skip button either: the back arrow already leaves, and a tour opened
 * on purpose has nothing to skip past.
 */
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { TourPager } from "../../features/onboarding/components/TourPager";
import { useTheme } from "../../shared/theme/ThemeContext";

export default function TourScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TourPager finishLabel="DONE" onFinish={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
