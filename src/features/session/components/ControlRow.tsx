import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface ControlRowProps {
  phase: string;
  isPaused: boolean;
  onStart: () => void;
  onTogglePause: () => void;
  onReset: () => void;
}

/**
 * Reset / Start-Pause row (docs/user-flows.md). "The Start button is the
 * one obvious primary action -- large, brass-amber, everything else
 * recedes" (docs/design-direction.md) -- Reset stays a quiet secondary
 * action, never competing with Start/Pause.
 */
export function ControlRow({ phase, isPaused, onStart, onTogglePause, onReset }: ControlRowProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const showReset = phase === "finished";
  const showStart = phase === "ready";
  const showPauseToggle = phase === "warmup" || phase === "work" || phase === "rest";

  return (
    <View style={styles.row}>
      {showReset || showPauseToggle ? (
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Reset"
        >
          <Text style={styles.secondaryLabel}>RESET</Text>
        </Pressable>
      ) : null}

      {showStart ? (
        <Pressable
          onPress={onStart}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Start"
        >
          <Text style={styles.primaryLabel}>START</Text>
        </Pressable>
      ) : null}

      {showPauseToggle ? (
        <Pressable
          onPress={onTogglePause}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={isPaused ? "Resume" : "Pause"}
        >
          <Text style={styles.primaryLabel}>{isPaused ? "RESUME" : "PAUSE"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    primaryButton: {
      minWidth: 160,
      paddingVertical: 16,
      borderRadius: 8,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    primaryLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      letterSpacing: 2,
      color: colors.background,
    },
    secondaryButton: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    secondaryLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      letterSpacing: 2,
      color: colors.textMuted,
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
