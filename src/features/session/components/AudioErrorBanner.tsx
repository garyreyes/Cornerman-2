import { useEffect, useMemo } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

const MESSAGE = "Sound unavailable — check volume/permissions";

/**
 * "The timer still runs visually ... even if sound genuinely cannot
 * start, with a small persistent banner ... rather than blocking the
 * whole session" -- docs/user-flows.md's proposed default for this edge
 * case (audio engine init failure). Only mounts while the error is
 * present (the caller conditionally renders it), so a screen-reader user
 * needs an active announcement, not just a passive label -- otherwise
 * mid-session sound loss goes completely unnoticed by them.
 * `accessibilityLiveRegion` covers Android/TalkBack; iOS/VoiceOver has no
 * equivalent prop, so `announceForAccessibility` covers it on mount.
 */
export function AudioErrorBanner() {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(MESSAGE);
  }, []);

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text style={styles.text}>{MESSAGE}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    banner: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.danger,
    },
    text: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.textPrimary,
      textAlign: "center",
    },
  });
}
