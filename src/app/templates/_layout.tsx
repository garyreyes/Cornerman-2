import { Stack } from "expo-router";

import { useTheme } from "../../shared/theme/ThemeContext";

/**
 * Nested stack for the Templates Picker (Phase 10b) and, once Phase 10c
 * builds it, the Round Builder / Template Editor -- same "themed header +
 * back arrow" convention Settings' own nested stack already established
 * (docs/user-flows.md's navigation convention).
 */
export default function TemplatesLayout() {
  const { colors, fonts } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.accent,
        headerTitleStyle: { fontFamily: fonts.bodySemiBold, fontSize: 16 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "TEMPLATES" }} />
      {/* Title is set dynamically from within the screen itself (NEW
          TEMPLATE vs EDIT TEMPLATE, depending on the `id` param) -- see
          [id].tsx, same pattern as Settings' preset editor. */}
      <Stack.Screen name="[id]" options={{ title: "TEMPLATE" }} />
    </Stack>
  );
}
