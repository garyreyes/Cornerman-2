import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { JetBrainsMono_600SemiBold, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "../shared/theme/ThemeContext";

/**
 * Root layout (Phase 8a) -- replaces App.tsx's former role. Font loading
 * and SafeAreaProvider moved here unchanged; headerShown defaults to
 * false since index/onboarding are full-bleed per docs/design-direction.md
 * -- nested route groups (e.g. settings/_layout.tsx) opt back into a
 * themed header where docs/user-flows.md's navigation convention actually
 * calls for one (back arrows, drilling in and backing out).
 *
 * ThemeProvider wraps everything, including the fonts-loading gate itself,
 * so even that placeholder frame paints the correct light/dark background
 * instead of a hardcoded one.
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  return (
    <ThemeProvider>
      <RootLayoutContent fontsLoaded={fontsLoaded} />
    </ThemeProvider>
  );
}

function RootLayoutContent({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { colors, isDarkGround } = useTheme();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={isDarkGround ? "light" : "dark"} />
    </SafeAreaProvider>
  );
}
