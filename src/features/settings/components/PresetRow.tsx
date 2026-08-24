import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

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
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
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

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    radioButton: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    radioGlyph: {
      fontSize: 16,
      color: colors.textMuted,
    },
    radioGlyphActive: {
      color: colors.accent,
    },
    body: {
      flex: 1,
    },
    name: {
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      color: colors.textPrimary,
    },
    summary: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
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
      color: colors.textMuted,
    },
    pressed: {
      opacity: 0.6,
    },
  });
}
