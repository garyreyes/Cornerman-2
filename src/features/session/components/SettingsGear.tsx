import { Pressable, StyleSheet, Text } from "react-native";

import { theme } from "../theme";

interface SettingsGearProps {
  onPress?: () => void;
}

/**
 * "Settings gear sits quiet in a top corner, non-competing"
 * (docs/design-direction.md). No-op for now -- Settings doesn't exist
 * until Phase 8; navigation is deliberately deferred until then
 * (PROJECT_FACTS.md), so this button has nowhere real to go yet.
 */
export function SettingsGear({ onPress }: SettingsGearProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Settings"
    >
      <Text style={styles.glyph}>⚙</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    color: theme.colors.enamelMuted,
  },
});
