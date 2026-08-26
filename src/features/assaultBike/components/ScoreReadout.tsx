import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface ScoreReadoutProps {
  score: number;
  /** This trial's full allowance -- the bar shows it draining, this says
   * how much there was to begin with, which is what actually changes as
   * the session tightens. */
  windowMs: number;
}

/** Live score and the current trial allowance, sitting just under the
 * timer bar (Phase 12b). Never persisted -- see scoring.ts. */
export function ScoreReadout({ score, windowMs }: ScoreReadoutProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.row}>
      <Text style={styles.score} accessibilityLabel={`Score ${score}`}>
        SCORE <Text style={styles.scoreValue}>{score}</Text>
      </Text>
      <Text style={styles.window} accessibilityLabel={`${(windowMs / 1000).toFixed(1)} seconds per trial`}>
        {(windowMs / 1000).toFixed(1)}s
      </Text>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    row: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    score: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      letterSpacing: 2,
      color: colors.textMuted,
    },
    scoreValue: {
      fontFamily: fonts.numericBold,
      fontSize: 14,
      color: colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    window: {
      fontFamily: fonts.numericSemiBold,
      fontSize: 12,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
  });
}
