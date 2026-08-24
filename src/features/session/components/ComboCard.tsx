import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Combo } from "../../comboEngine/types";
import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface ComboCardProps {
  combo: Combo | null;
  comboCount: number;
}

/**
 * "Combo card is absent in Ready state (nothing to show yet) -- appears
 * only once Work phase begins," per docs/design-direction.md. The caller
 * decides visibility (combo === null renders nothing) rather than this
 * component special-casing phase.
 */
export function ComboCard({ combo, comboCount }: ComboCardProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (combo === null) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.punchRow}>
        {combo.map((punch, index) => (
          <Text key={`${punch.num}-${index}`} style={styles.punchName}>
            {punch.name}
            {index < combo.length - 1 ? <Text style={styles.separator}> · </Text> : null}
          </Text>
        ))}
      </View>
      <Text style={styles.stat}>{comboCount} combos called</Text>
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
      paddingHorizontal: 20,
      alignItems: "center",
      gap: 6,
    },
    punchRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    punchName: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 22,
      color: colors.textPrimary,
      textTransform: "uppercase",
    },
    separator: {
      color: colors.accentDim,
    },
    stat: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
