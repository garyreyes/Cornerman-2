import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../../features/session/theme";

interface SectionCardProps {
  title: string;
  children: ReactNode;
}

/**
 * Themed panel + engraved-style all-caps header, reused by every Settings
 * section (docs/design-direction.md's "instrument panel" world) -- the
 * same panel/panelLine/borderRadius language ControlRow/PhaseBadge already
 * established, generalized into a shared primitive now that Settings is
 * the second real screen to need it.
 */
export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.panelLine,
    backgroundColor: theme.colors.panel,
    padding: 16,
    gap: 14,
  },
  title: {
    fontFamily: theme.fonts.displaySemiBold,
    fontSize: 15,
    letterSpacing: 2,
    color: theme.colors.brassAmber,
  },
  body: {
    gap: 14,
  },
});
