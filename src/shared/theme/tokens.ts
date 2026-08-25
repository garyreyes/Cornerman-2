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
  // Was #8A4C22 (2.80:1 on background, 2.49:1 on panel -- fails the 3:1
  // non-text UI minimum both places). #A85D2A clears 3:1 against both
  // (3.81/3.39, WCAG relative-luminance) while staying a visibly dimmer,
  // more muted tone than the full accent -- confirmed 2026-08-25 via
  // /impeccable critique, this is the wheel-picker selection border and
  // the active-punch-pool-chip differentiator, not decoration.
  accentDim: "#A85D2A",
  textPrimary: "#F2F2F2",
  textMuted: "#9B9B9B",
  // Was #E5484D (4.79:1 on background, 4.26:1 on panel -- fails the
  // 4.5:1 text minimum on panel). #EE565B clears 4.5:1 on panel (4.86:1)
  // with margin, confirmed 2026-08-25.
  danger: "#EE565B",
};

const darkColors: ColorTokens = {
  background: "#121212",
  panel: "#1E1E1E",
  panelLine: "#2E2E2E",
  accent: "#F2F2F2",
  // Was #4A4A4A (2.11:1 on background, 1.88:1 on panel -- fails 3:1).
  // #6E6E6E clears 3:1 against both (3.68/3.27), same reasoning as
  // systemColors.accentDim above.
  accentDim: "#6E6E6E",
  textPrimary: "#F2F2F2",
  textMuted: "#9B9B9B",
  // Same fix as systemColors.danger above -- shares the same background/
  // panel pair, so the same replacement clears the same 4.5:1 gap.
  danger: "#EE565B",
};

const lightColors: ColorTokens = {
  background: "#FFFFFF",
  panel: "#F5F5F5",
  panelLine: "#E2E2E2",
  accent: "#171717",
  // Was #D4D4D4 (1.48:1 on background, 1.36:1 on panel -- fails 3:1,
  // and was genuinely near-invisible on light backgrounds). #828282
  // clears 3:1 against both (3.85/3.53) while staying lighter than
  // textMuted (#6B6B6B), preserving the accent < textMuted < accentDim
  // < panelLine step order.
  accentDim: "#828282",
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
