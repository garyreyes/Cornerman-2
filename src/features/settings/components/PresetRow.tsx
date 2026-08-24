import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../session/theme";

interface PresetRowProps {
  name: string;
  summary: string;
  isActive: boolean;
  onActivate: () => void;
  onPress: () => void;
  onDelete: () => void;
}

/**
 * One preset: a separate active/radio control (confirmed choice -- tapping
 * the row body opens the Editor per docs/user-flows.md Flow 5's literal
 * wording, so activating which preset is used needs its own distinct
 * control, not overloaded onto the same tap) + name/sequence summary,
 * tappable to edit + Delete.
 */
export function PresetRow({ name, summary, isActive, onActivate, onPress, onDelete }: PresetRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onActivate}
        hitSlop={8}
        style={({ pressed }) => [styles.radioButton, pressed && styles.pressed]}
        accessibilityRole="radio"
        accessibilityState={{ checked: isActive }}
        accessibilityLabel={`Use ${name}`}
      >
        <Text style={[styles.radioGlyph, isActive && styles.radioGlyphActive]}>{isActive ? "●" : "○"}</Text>
      </Pressable>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${name}`}
      >
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.summary} numberOfLines={1}>
          {summary}
        </Text>
      </Pressable>

      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${name}`}
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
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: theme.colors.panelLine,
  },
  radioButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  radioGlyph: {
    fontSize: 16,
    color: theme.colors.enamelMuted,
  },
  radioGlyphActive: {
    color: theme.colors.brassAmber,
  },
  body: {
    flex: 1,
  },
  name: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.enamelWhite,
  },
  summary: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.enamelMuted,
    marginTop: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteGlyph: {
    fontSize: 15,
    color: theme.colors.enamelMuted,
  },
  pressed: {
    opacity: 0.6,
  },
});
