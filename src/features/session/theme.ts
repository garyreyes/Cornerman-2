/**
 * "The Corner's Stopwatch & Bell" -- docs/design-direction.md's locked
 * contract. Gunmetal/brass instrument-panel dark ground, brass-amber as
 * the one accent (chosen to read clearly in a dim evening room), enamel-
 * white for numerals/labels. Barlow Condensed for dial-style numerals
 * (license-plate/highway-signage heritage), Inter for body/label text.
 */
export const theme = {
  colors: {
    background: "#181B1E",
    panel: "#23272B",
    panelLine: "#33383D",
    brassAmber: "#C99A46",
    brassAmberDim: "#6E5730",
    enamelWhite: "#F1EEE7",
    enamelMuted: "#8B9096",
    danger: "#C9564A",
  },
  fonts: {
    displayBold: "BarlowCondensed_700Bold",
    displaySemiBold: "BarlowCondensed_600SemiBold",
    body: "Inter_400Regular",
    bodyMedium: "Inter_500Medium",
    bodySemiBold: "Inter_600SemiBold",
  },
} as const;
