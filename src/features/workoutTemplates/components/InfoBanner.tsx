import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface InfoBannerProps {
  message: string;
}

/**
 * Transient, action-less message banner -- sibling to Settings'
 * `UndoBanner` (same visual language) but for a plain heads-up rather
 * than an undoable action. The caller owns the timeout that dismisses
 * it, matching UndoBanner's own pattern.
 */
export function InfoBanner({ message }: InfoBannerProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    banner: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 6,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    text: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textPrimary,
    },
  });
}
