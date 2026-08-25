import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface UndoBannerProps {
  message: string;
  onUndo: () => void;
}

/**
 * Transient "X deleted - Undo" banner (Punches screen, docs feedback
 * 2026-08-25: a deleted punch previously had no way back). The caller
 * owns the timeout that dismisses this -- this component only renders
 * while an undo is actually available.
 */
export function UndoBanner({ message, onUndo }: UndoBannerProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={onUndo} hitSlop={8} accessibilityRole="button" accessibilityLabel="Undo">
        <Text style={styles.undoLabel}>UNDO</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
    undoLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      letterSpacing: 0.5,
      color: colors.accent,
    },
  });
}
