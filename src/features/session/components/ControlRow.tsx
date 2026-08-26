import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface ControlRowProps {
  /** Which buttons show is the caller's own phase-set decision, not this
   * component's -- kept generic (booleans, not a hardcoded phase-name
   * comparison) so both Main Timer's boxing phases (ready/warmup/work/
   * rest/finished) and the Assault-Bike Session's own, different phase
   * set (work/settle/drill/reset/finished) can drive the same row
   * correctly. Each caller computes these the same way this component
   * itself used to, before Phase 11b generalized it. */
  showStart: boolean;
  showPauseToggle: boolean;
  showReset: boolean;
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
export function ControlRow({
  showStart,
  showPauseToggle,
  showReset,
  isPaused,
  onStart,
  onTogglePause,
  onReset,
}: ControlRowProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

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
