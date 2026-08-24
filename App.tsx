import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MainTimerScreen } from "./src/app/MainTimerScreen";
import { OnboardingScreen } from "./src/app/OnboardingScreen";
import { theme } from "./src/features/session/theme";
import { getSettings } from "./src/features/settings/service";

export default function App() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => getSettings().hasCompletedOnboarding);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      {hasCompletedOnboarding ? (
        <MainTimerScreen />
      ) : (
        <OnboardingScreen onDone={() => setHasCompletedOnboarding(true)} />
      )}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
