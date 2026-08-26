import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";
import type { TrialResult } from "../types";

interface DrillFeedbackProps {
  result: TrialResult | null;
}

/** Live HIT/MISS + reaction-time readout shown in the brief pause between
 * Odd-One-Out trials -- never persisted, matches "reaction time/accuracy
 * display during a drill is live-only, never logged" (ARCHITECTURE.md).
 * Reserves its own height even with nothing to show yet, so the grid
 * below it doesn't jump the instant a trial starts. */
export function DrillFeedback({ result }: DrillFeedbackProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (result === null) {
    return <View style={styles.placeholder} />;
  }

  return (
    <View style={styles.container} accessible accessibilityLiveRegion="polite">
      <Text style={[styles.verdict, result.correct ? styles.correct : styles.incorrect]}>
        {result.correct ? "HIT" : "MISS"}
      </Text>
      <Text style={styles.reaction}>{result.reactionMs}ms</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    placeholder: {
      height: 56,
    },
    container: {
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    verdict: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 20,
      letterSpacing: 2,
    },
    correct: {
      color: colors.accent,
    },
    incorrect: {
      color: colors.danger,
    },
    reaction: {
      fontFamily: fonts.numericSemiBold,
      fontSize: 14,
      color: colors.textMuted,
    },
  });
}
