import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { getSettings, saveSettings } from "../../features/settings/service";
import type { ThemeModeSetting } from "../../features/settings/types";
import { colorsFor, fonts, isDarkGround, type ColorTokens, type Fonts } from "./tokens";

interface ThemeContextValue {
  /** "system" | "light" | "dark" -- also `colorsFor`'s key directly now that "system" is its own fixed palette, not an OS-resolved alias. */
  mode: ThemeModeSetting;
  colors: ColorTokens;
  fonts: Fonts;
  /** True for "system"/"dark" (dark ground), false for "light" -- drives the status bar icon color. */
  isDarkGround: boolean;
  setThemeModeSetting: (setting: ThemeModeSetting) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Owns theme-mode state at the root so a change made deep in the Settings
 * stack (a sibling/descendant route, not a descendant of any one screen)
 * is visible everywhere immediately -- `setThemeModeSetting` updates local
 * state and persists via the existing settings service in the same call,
 * the same "component calls the service directly" pattern SettingsScreen's
 * own autosave already uses (docs/CLAUDE.md's layer boundaries: this isn't
 * a raw MMKV/native call, it's the established service function).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeModeSetting>(() => getSettings().themeMode);

  function setThemeModeSetting(setting: ThemeModeSetting) {
    setMode(setting);
    saveSettings({ ...getSettings(), themeMode: setting });
  }

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, colors: colorsFor(mode), fonts, isDarkGround: isDarkGround(mode), setThemeModeSetting }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
