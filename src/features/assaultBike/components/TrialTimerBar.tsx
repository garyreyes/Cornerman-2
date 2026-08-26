import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens } from "../../../shared/theme/tokens";

const STEP_MS = 100;

interface TrialTimerBarProps {
  /** Absolute timestamp the current trial times out at; null between trials. */
  deadlineAt: number | null;
  windowMs: number;
}

/**
 * The per-trial deadline, draining left-to-right (Phase 12b). Same
 * "continuous easing, never a digital blink" rule as CountdownRing, and
 * the same Reduce Motion treatment -- stepped at a fixed cadence rather
 * than animated, since a continuously draining bar is exactly the motion
 * that setting exists to suppress.
 *
 * Holds its track (not just empty space) between trials so the grid below
 * never shifts when a new trial starts.
 */
export function TrialTimerBar({ deadlineAt, windowMs }: TrialTimerBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (deadlineAt === null || windowMs <= 0) {
      progress.value = 0;
      return;
    }
    const remaining = Math.max(0, deadlineAt - Date.now());
    progress.value = remaining / windowMs;

    if (reducedMotion) {
      const intervalId = setInterval(() => {
        progress.value = Math.max(0, deadlineAt - Date.now()) / windowMs;
      }, STEP_MS);
      return () => clearInterval(intervalId);
    }

    progress.value = withTiming(0, { duration: remaining, easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineAt, windowMs, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, animatedStyle]} />
    </View>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    track: {
      width: "100%",
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.panel,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
  });
}
