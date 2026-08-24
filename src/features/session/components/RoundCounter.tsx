import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface RoundCounterProps {
  round: number;
  totalRounds: number;
}

/** Small "lap-dial readout" per docs/design-direction.md's FIRST VIEWPORT spec. */
export function RoundCounter({ round, totalRounds }: RoundCounterProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const displayRound = Math.max(1, round);
  return (
    <Text style={styles.text}>
      ROUND {displayRound}/{totalRounds}
    </Text>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    text: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      letterSpacing: 2,
      color: colors.textMuted,
    },
  });
}
