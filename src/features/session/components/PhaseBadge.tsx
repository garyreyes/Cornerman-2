import { useEffect, useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

/**
 * Keyed by phase name across both session types -- boxing never enters
 * the bike's three sub-rest phases and vice versa, so one map covers both
 * without either having to know about the other.
 *
 * The bike's Settle and Reset labels say what to physically do rather
 * than naming the phase (Phase 12d). They bracket a drill that needs the
 * phone in hand, and "SETTLE" gave a rider no clue that the next 20
 * seconds wanted them looking at a screen.
 */
const PHASE_LABEL: Record<string, string> = {
  ready: "READY",
  warmup: "WARMUP",
  work: "WORK",
  rest: "REST",
  settle: "PHONE UP",
  drill: "DRILL",
  reset: "PHONE DOWN",
  finished: "FINISHED",
};

interface PhaseBadgeProps {
  phase: string;
  isPaused: boolean;
}

/**
 * "Engraved-style plate" per docs/design-direction.md's FIRST VIEWPORT
 * spec. Pulses once on a real phase change (round start/end) -- "a
 * genuine bell-strike moment ... mechanical and earned, never bouncy or
 * gamified," so a single restrained scale-up-and-settle, not a bounce.
 * Skipped entirely with Reduce Motion on -- a scale pulse is exactly the
 * kind of motion that setting exists to suppress.
 */
export function PhaseBadge({ phase, isPaused }: PhaseBadgeProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const reducedMotion = useReducedMotion();
  const label = isPaused ? "PAUSED" : (PHASE_LABEL[phase] ?? phase.toUpperCase());
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion && (phase === "work" || phase === "rest")) {
      scale.value = withSequence(
        withTiming(1.06, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 160, easing: Easing.inOut(Easing.quad) }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.plate, animatedStyle]}>
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    plate: {
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.panelLine,
      backgroundColor: colors.panel,
      paddingVertical: 6,
      paddingHorizontal: 18,
    },
    text: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 16,
      letterSpacing: 3,
      color: colors.textPrimary,
    },
  });
}
