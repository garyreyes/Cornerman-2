import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";
import type { DrillSummary } from "../scoring";

interface SessionSummaryProps {
  summary: DrillSummary;
}

/**
 * Shown in place of the countdown once the session finishes (Phase 12b).
 * In-memory only: leaving this screen discards it, and nothing is written
 * to storage -- see scoring.ts and docs/user-flows.md Flow 7.
 *
 * A session whose protocol had no drill at all (Lactic Capacity) reports
 * no stats rather than a row of zeroes, which would read as a bad
 * performance instead of an absent one.
 */
export function SessionSummary({ summary }: SessionSummaryProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (summary.trials === 0) {
    return (
      <View style={styles.container} accessible accessibilityLiveRegion="polite">
        <Text style={styles.headline}>SESSION COMPLETE</Text>
        <Text style={styles.note}>No drill in this protocol</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} accessible accessibilityLiveRegion="polite">
      <Text style={styles.headline}>SESSION COMPLETE</Text>

      <Text style={styles.score} accessibilityLabel={`Final score ${summary.score}`}>
        {summary.score}
      </Text>
      <Text style={styles.scoreLabel}>SCORE</Text>

      <View style={styles.statRow}>
        <Stat
          label="AVG REACTION"
          value={summary.avgReactionMs === null ? "--" : `${summary.avgReactionMs}ms`}
          styles={styles}
        />
        <Stat label="ACCURACY" value={`${summary.accuracyPct}%`} styles={styles} />
        <Stat label="TRIALS" value={`${summary.hits}/${summary.trials}`} styles={styles} />
      </View>
    </View>
  );
}

function Stat({ label, value, styles }: { label: string; value: string; styles: SummaryStyles }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type SummaryStyles = ReturnType<typeof createStyles>;

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      gap: 4,
      paddingVertical: 8,
    },
    headline: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 14,
      letterSpacing: 3,
      color: colors.textMuted,
      marginBottom: 12,
    },
    note: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textMuted,
    },
    score: {
      fontFamily: fonts.numericBold,
      fontSize: 72,
      lineHeight: 78,
      color: colors.accent,
      fontVariant: ["tabular-nums"],
    },
    scoreLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      letterSpacing: 3,
      color: colors.textMuted,
      marginBottom: 24,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 28,
    },
    stat: {
      alignItems: "center",
      gap: 4,
    },
    statValue: {
      fontFamily: fonts.numericSemiBold,
      fontSize: 20,
      color: colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    statLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      letterSpacing: 2,
      color: colors.textMuted,
    },
  });
}
