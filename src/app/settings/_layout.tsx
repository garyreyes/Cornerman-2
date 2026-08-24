import { Stack } from "expo-router";

import { theme } from "../../features/session/theme";

/**
 * Nested stack for Settings and (Phase 8b/8c) its children -- Punches,
 * Presets List, Preset Editor. Unlike index/onboarding's full-bleed,
 * headerless screens, this is the "drilling in and backing out" part of
 * the app (docs/user-flows.md's navigation convention: "Stack navigation
 * with header back arrows"), so it opts back into a themed header here
 * rather than at the root layout.
 */
export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.panel },
        headerTintColor: theme.colors.brassAmber,
        headerTitleStyle: { fontFamily: theme.fonts.bodySemiBold, fontSize: 16 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "SETTINGS" }} />
    </Stack>
  );
}
