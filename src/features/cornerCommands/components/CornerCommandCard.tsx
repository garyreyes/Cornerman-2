import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DefenseCueName } from "../../defenseCues/types";
import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface CornerCommandCardProps {
  command: DefenseCueName | null;
}

/**
 * Shows the most recently spoken corner command as text -- mirrors
 * ComboCard's own visual language (boxing's spoken combos are also shown,
 * not just spoken) rather than inventing a new card style. No stat line
 * (no "N commands called" counter) since nothing is being measured here,
 * unlike ComboCard's comboCount.
 */
export function CornerCommandCard({ command }: CornerCommandCardProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (command === null) {
    return null;
  }

  return (
    <View style={styles.card} accessible accessibilityLiveRegion="polite">
      <Text style={styles.commandText}>{command}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    card: {
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.panelLine,
      backgroundColor: colors.panel,
      paddingVertical: 14,
      paddingHorizontal: 28,
      alignItems: "center",
    },
    commandText: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 26,
      letterSpacing: 2,
      color: colors.textPrimary,
      textTransform: "uppercase",
    },
  });
}
