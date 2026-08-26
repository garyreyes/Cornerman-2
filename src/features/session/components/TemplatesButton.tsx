import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens } from "../../../shared/theme/tokens";

interface TemplatesButtonProps {
  onPress?: () => void;
}

/**
 * Main Timer's entry point into the Templates Picker (docs/user-flows.md
 * Flow 6). Sibling to SettingsGear, same "quiet in a top corner,
 * non-competing" placement and unicode-glyph icon convention (a real icon
 * system swap is a deliberately deferred follow-up -- PROJECT_FACTS.md).
 */
export function TemplatesButton({ onPress }: TemplatesButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Workout templates"
    >
      <Text style={styles.glyph}>☰</Text>
    </Pressable>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    button: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.6,
    },
    glyph: {
      fontSize: 20,
      color: colors.textMuted,
    },
  });
}
