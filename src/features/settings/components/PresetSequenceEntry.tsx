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
      {/* Own sub-row with a wider internal gap than `row`'s own 8 -- these
          three buttons previously sat 28x28 + hitSlop 8 apart with only an
          8px gap between them, so adjacent hitSlop zones overlapped
          (found 2026-08-25 via /impeccable critique: a real mis-tap risk
          between Move Up/Move Down/Remove, hitSlop doesn't check for
          overlap with a neighboring view). Buttons grew to 32x32 (matching
          PunchRow's own iconButton) to also clear the 44pt touch-target
          minimum with hitSlop 6 (32+6+6=44), and the 16px gap here is
          comfortably more than hitSlop's own 6+6=12 combined reach. */}
      <View style={styles.iconGroup}>
        <Pressable
          onPress={onMoveUp}
          disabled={!canMoveUp}
          hitSlop={6}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, !canMoveUp && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={`Move ${label} up`}
        >
          <Text style={styles.glyph}>▲</Text>
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          disabled={!canMoveDown}
          hitSlop={6}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, !canMoveDown && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={`Move ${label} down`}
        >
          <Text style={styles.glyph}>▼</Text>
        </Pressable>
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
        >
          <Text style={styles.deleteGlyph}>✕</Text>
        </Pressable>
      </View>
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
    iconGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    iconButton: {
      width: 32,
      height: 32,
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
