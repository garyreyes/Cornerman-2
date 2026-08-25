import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Circle, Svg } from "react-native-svg";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STROKE_WIDTH = 10;
const LABEL_REFRESH_MS = 200;
// docs/design-direction.md targets the ring at ~40-50% of vertical space --
// it's the single most load-bearing visual element in a screen meant to be
// read in "under a second" mid-round. Was a fixed 260 regardless of device,
// which measured out to only ~28% on a typical phone (found 2026-08-25 via
// /impeccable critique). 44% (the range's midpoint) of window height is the
// target; clamped by width so it can never overflow horizontally on a
// narrow-but-tall device, since this app is portrait-locked and the ring
// sits in a column with side padding, not edge-to-edge.
const TARGET_HEIGHT_RATIO = 0.44;
const MAX_WIDTH_RATIO = 0.72;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * "2:49" read digit-by-digit (or as "two colon forty-nine") isn't a
 * screen-reader-friendly rendering of a countdown -- this is the natural-
 * language sibling of formatRemaining, used only for accessibilityLabel.
 */
function formatRemainingForScreenReader(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }
  parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`);
  return `${parts.join(" ")} remaining`;
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
 *
 * With Reduce Motion on, that continuous sweep is exactly the kind of
 * motion it exists to suppress -- `progress` jumps straight to its target
 * instead of animating there, and updates in the same discrete 200ms
 * steps as the numeral label rather than a separate `withTiming` call.
 */
export function CountdownRing({ phaseEndAt, phaseDurationMs, isPaused }: CountdownRingProps) {
  const { colors, fonts } = useTheme();
  const { width, height } = useWindowDimensions();
  const size = useMemo(
    () => Math.round(Math.min(height * TARGET_HEIGHT_RATIO, width * MAX_WIDTH_RATIO)),
    [width, height],
  );
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const styles = useMemo(() => createStyles(colors, fonts, size), [colors, fonts, size]);
  const reducedMotion = useReducedMotion();
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

    if (reducedMotion) {
      // Step to the correct position every 200ms (the same cadence as
      // the numeral label below) instead of animating there -- keeps
      // `progress.value`'s only mutation site inside this one effect,
      // rather than adding a second write from the label-refresh effect.
      const intervalId = setInterval(() => {
        const stepRemaining = Math.max(0, phaseEndAt - Date.now());
        progress.value = 1 - stepRemaining / phaseDurationMs;
      }, LABEL_REFRESH_MS);
      return () => clearInterval(intervalId);
    }

    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseEndAt, phaseDurationMs, isPaused, reducedMotion]);

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
    strokeDashoffset: circumference * progress.value,
  }));

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={formatRemainingForScreenReader(remainingMs)}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.panel} strokeWidth={STROKE_WIDTH} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.accent}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.labelOverlay} pointerEvents="none">
        <Text style={styles.label}>{formatRemaining(remainingMs)}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts, size: number) {
  return StyleSheet.create({
    container: {
      width: size,
      height: size,
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
      // Same proportion as the original fixed 260/64 ring/label pairing --
      // scales with the ring instead of going disproportionately small on
      // a now-larger ring.
      fontSize: Math.round(size * 0.246),
      color: colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
  });
}
