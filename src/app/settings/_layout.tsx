import { Stack } from "expo-router";

import { useThemedHeaderOptions } from "../../shared/theme/headerOptions";

/**
 * Nested stack for Settings and (Phase 8b/8c) its children -- Punches,
 * Presets List, Preset Editor. Unlike index/onboarding's full-bleed,
 * headerless screens, this is the "drilling in and backing out" part of
 * the app (docs/user-flows.md's navigation convention: "Stack navigation
 * with header back arrows"), so it opts back into a themed header here
 * rather than at the root layout.
 */
export default function SettingsLayout() {
  const headerOptions = useThemedHeaderOptions();
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: "SETTINGS" }} />
      <Stack.Screen name="punches" options={{ title: "PUNCHES" }} />
      <Stack.Screen name="presets/index" options={{ title: "PRESETS" }} />
      {/* Title is set dynamically from within the screen itself (NEW
          PRESET vs EDIT PRESET, depending on the `id` param) -- see
          presets/[id].tsx. */}
      <Stack.Screen name="presets/[id]" options={{ title: "PRESET" }} />
      <Stack.Screen name="tour" options={{ title: "HOW IT WORKS" }} />
    </Stack>
  );
}
