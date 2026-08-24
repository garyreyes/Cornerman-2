import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../session/theme";

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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.background,
  },
  position: {
    fontFamily: theme.fonts.displaySemiBold,
    fontSize: 14,
    color: theme.colors.brassAmber,
    minWidth: 18,
  },
  label: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.enamelWhite,
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
    color: theme.colors.enamelMuted,
  },
  deleteGlyph: {
    fontSize: 14,
    color: theme.colors.enamelMuted,
  },
});
