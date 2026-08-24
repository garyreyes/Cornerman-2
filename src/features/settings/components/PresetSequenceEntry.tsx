import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface PresetSequenceEntryProps {
  position: number;
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

/**
 * One entry in the Preset Editor's ordered sequence -- up/down arrow
 * buttons for reordering rather than drag-and-drop, avoiding a new gesture
 * library dependency for what a punch-by-punch combo sequence (typically a
 * handful of entries) doesn't really need.
 */
export function PresetSequenceEntry({
  position,
  label,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: PresetSequenceEntryProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <View style={styles.row}>
      <Text style={styles.position}>{position}</Text>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onMoveUp}
        disabled={!canMoveUp}
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, !canMoveUp && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`Move ${label} up`}
      >
        <Text style={styles.glyph}>▲</Text>
      </Pressable>
      <Pressable
        onPress={onMoveDown}
        disabled={!canMoveDown}
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, !canMoveDown && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`Move ${label} down`}
      >
        <Text style={styles.glyph}>▼</Text>
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
      >
        <Text style={styles.deleteGlyph}>✕</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    position: {
      fontFamily: fonts.numericSemiBold,
      fontSize: 14,
      color: colors.accent,
      minWidth: 18,
    },
    label: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    iconButton: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.6,
    },
    disabled: {
      opacity: 0.25,
    },
    glyph: {
      fontSize: 11,
      color: colors.textMuted,
    },
    deleteGlyph: {
      fontSize: 14,
      color: colors.textMuted,
    },
  });
}
