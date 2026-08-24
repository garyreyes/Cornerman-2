/**
 * Three real, distinct palettes -- not "2 palettes + an OS-linked auto
 * option" (confirmed 2026-08-24, correcting the previous pass, which
 * made "System" just alias to whichever of Light/Dark the OS reported,
 * stripping out the Claude/VS Code look entirely). `system` IS the
 * Claude/VS Code-style branded look (dark ground + orange accent) --
 * always, not OS-dependent -- and is what a fresh install shows by
 * default. `light`/`dark` are explicit overrides to a genuinely
 * monochrome look (`accent` there equals `textPrimary` -- no orange or
 * any other hue). `danger` stays a real red in all three -- the one
 * deliberate exception, error states keep color even in the monochrome
 * modes. See docs/design-direction.md for the full contract.
 */
export type ThemeMode = "system" | "light" | "dark";

export interface ColorTokens {
  background: string;
  panel: string;
  panelLine: string;
  accent: string;
  accentDim: string;
  textPrimary: string;
  textMuted: string;
  danger: string;
}

const systemColors: ColorTokens = {
  background: "#121212",
  panel: "#1E1E1E",
  panelLine: "#2E2E2E",
  accent: "#EA580C",
  accentDim: "#8A4C22",
  textPrimary: "#F2F2F2",
  textMuted: "#9B9B9B",
  danger: "#E5484D",
};

const darkColors: ColorTokens = {
  background: "#121212",
  panel: "#1E1E1E",
  panelLine: "#2E2E2E",
  accent: "#F2F2F2",
  accentDim: "#4A4A4A",
  textPrimary: "#F2F2F2",
  textMuted: "#9B9B9B",
  danger: "#E5484D",
};

const lightColors: ColorTokens = {
  background: "#FFFFFF",
  panel: "#F5F5F5",
  panelLine: "#E2E2E2",
  accent: "#171717",
  accentDim: "#D4D4D4",
  textPrimary: "#171717",
  textMuted: "#6B6B6B",
  danger: "#C0292E",
};

export function colorsFor(mode: ThemeMode): ColorTokens {
  if (mode === "light") return lightColors;
  if (mode === "dark") return darkColors;
  return systemColors;
}

/** Whether `mode`'s ground is dark -- both "system" and "dark" are; only "light" isn't. Drives the status bar icon color. */
export function isDarkGround(mode: ThemeMode): boolean {
  return mode !== "light";
}

/**
 * `displayBold`/`displaySemiBold` are the clean UI face (Inter) used for
 * every stylized label -- section titles, phase badge, buttons, punch
 * names. `numericBold`/`numericSemiBold` (JetBrains Mono) are reserved
 * for actual numeral readouts -- the countdown, wheel-picker values,
 * slider values, num badges -- the one deliberate "developer tool" touch
 * the user asked for, not a blanket monospace swap.
 */
export const fonts = {
  displayBold: "Inter_700Bold",
  displaySemiBold: "Inter_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  numericBold: "JetBrainsMono_700Bold",
  numericSemiBold: "JetBrainsMono_600SemiBold",
} as const;

export type Fonts = typeof fonts;
