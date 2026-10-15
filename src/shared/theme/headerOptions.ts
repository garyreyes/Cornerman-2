import { useTheme } from "./ThemeContext";

/**
 * The one themed-header shape every stack screen with a back arrow uses
 * (Settings/Templates' own nested `_layout.tsx` `screenOptions`, and
 * Assault-Bike's per-screen `Stack.Screen options`, which used to
 * hand-duplicate these same four properties inline -- found during the
 * Phase 14 critique as a real drift risk: a future header tweak would
 * land in the two layout files and silently miss that screen).
 */
export function useThemedHeaderOptions() {
  const { colors, fonts } = useTheme();
  return {
    headerShown: true,
    headerStyle: { backgroundColor: colors.panel },
    headerTintColor: colors.accent,
    headerTitleStyle: { fontFamily: fonts.bodySemiBold, fontSize: 16 },
    headerShadowVisible: false,
  } as const;
}
