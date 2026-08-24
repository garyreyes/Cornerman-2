import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens, Fonts } from "../theme/tokens";

interface SectionCardProps {
  title: string;
  children: ReactNode;
}

/**
 * Themed panel + all-caps header, reused by every Settings section --
 * the same panel/panelLine/borderRadius language ControlRow/PhaseBadge
 * already established, generalized into a shared primitive now that
 * Settings is the second real screen to need it.
 */
export function SectionCard({ title, children }: SectionCardProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    card: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.panelLine,
      backgroundColor: colors.panel,
      padding: 16,
      gap: 14,
    },
    title: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 15,
      letterSpacing: 2,
      color: colors.accent,
    },
    body: {
      gap: 14,
    },
  });
}
