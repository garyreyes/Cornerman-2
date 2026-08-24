import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { theme } from "../features/session/theme";

/**
 * Root layout (Phase 8a) -- replaces App.tsx's former role. Font loading
 * and SafeAreaProvider moved here unchanged; headerShown defaults to
 * false since index/onboarding are full-bleed per docs/design-direction.md
 * -- nested route groups (e.g. settings/_layout.tsx) opt back into a
 * themed header where docs/user-flows.md's navigation convention actually
 * calls for one (back arrows, drilling in and backing out).
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
