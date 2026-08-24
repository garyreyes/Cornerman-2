import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { Circle, Svg } from "react-native-svg";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 260;
const STROKE_WIDTH = 10;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const LABEL_REFRESH_MS = 200;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface CountdownRingProps {
  /** Absolute timestamp the current phase ends at; null when there's no active phase (Ready/Finished). */
  phaseEndAt: number | null;
  phaseDurationMs: number;
  isPaused: boolean;
}

/**
 * "Sweep-hand-style continuous easing for the countdown (never a digital
 * blink)" -- docs/design-direction.md. The ring animates continuously via
 * Reanimated (one withTiming call spanning the exact remaining duration),
 * independent of the numeral label's own 200ms refresh -- matching the
 * timer engine's real poll cadence (extraction doc §1.1) without making
 * the ring itself look stepped.
 */
export function CountdownRing({ phaseEndAt, phaseDurationMs, isPaused }: CountdownRingProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const progress = useSharedValue(0);
  const [remainingMs, setRemainingMs] = useState(() =>
    phaseEndAt === null ? phaseDurationMs : Math.max(0, phaseEndAt - Date.now()),
  );

  useEffect(() => {
    if (phaseEndAt === null || phaseDurationMs <= 0) {
      progress.value = 0;
      return;
    }
    if (isPaused) {
      return;
    }
    const now = Date.now();
    const remaining = Math.max(0, phaseEndAt - now);
    const startProgress = 1 - remaining / phaseDurationMs;
    progress.value = startProgress;
    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseEndAt, phaseDurationMs, isPaused]);

  useEffect(() => {
    const update = () => {
      setRemainingMs(phaseEndAt === null ? phaseDurationMs : Math.max(0, phaseEndAt - Date.now()));
    };
    update();
    if (phaseEndAt === null || isPaused) {
      return;
    }
    const intervalId = setInterval(update, LABEL_REFRESH_MS);
    return () => clearInterval(intervalId);
  }, [phaseEndAt, phaseDurationMs, isPaused]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * progress.value,
  }));

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.panel} strokeWidth={STROKE_WIDTH} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.accent}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={animatedProps}
          rotation={-90}
          originX={SIZE / 2}
          originY={SIZE / 2}
        />
      </Svg>
      <View style={styles.labelOverlay} pointerEvents="none">
        <Text style={styles.label}>{formatRemaining(remainingMs)}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    container: {
      width: SIZE,
      height: SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    labelOverlay: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontFamily: fonts.numericBold,
      fontSize: 64,
      color: colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
  });
}
