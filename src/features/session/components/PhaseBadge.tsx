import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { theme } from "../theme";

const PHASE_LABEL: Record<string, string> = {
  ready: "READY",
  warmup: "WARMUP",
  work: "WORK",
  rest: "REST",
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
 */
export function PhaseBadge({ phase, isPaused }: PhaseBadgeProps) {
  const label = isPaused ? "PAUSED" : (PHASE_LABEL[phase] ?? phase.toUpperCase());
  const scale = useSharedValue(1);

  useEffect(() => {
    if (phase === "work" || phase === "rest") {
      scale.value = withSequence(
        withTiming(1.06, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 160, easing: Easing.inOut(Easing.quad) }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.plate, animatedStyle]}>
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  plate: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.panelLine,
    backgroundColor: theme.colors.panel,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  text: {
    fontFamily: theme.fonts.displaySemiBold,
    fontSize: 16,
    letterSpacing: 3,
    color: theme.colors.enamelWhite,
  },
});
