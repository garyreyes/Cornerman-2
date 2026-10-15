import { useEffect, useMemo } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens, Fonts } from "../theme/tokens";

interface InlineErrorBannerProps {
  message: string;
}

/**
 * The app's one themed error-state treatment -- a persistent, non-blocking
 * banner rather than a native dialog (`docs/user-flows.md`'s proposed
 * default for the audio-init-failure case this was first built for).
 * Announces itself on mount since it only exists in the tree while the
 * error is present, so a screen-reader user needs an active announcement,
 * not a passive label they'd have to stumble onto. `accessibilityLiveRegion`
 * covers Android/TalkBack; iOS/VoiceOver has no equivalent prop, hence the
 * explicit `announceForAccessibility` call.
 */
export function InlineErrorBanner({ message }: InlineErrorBannerProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text style={styles.text}>{message}</Text>
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
