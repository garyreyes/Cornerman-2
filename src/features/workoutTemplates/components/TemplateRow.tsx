import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface TemplateRowProps {
  name: string;
  summary: string;
  isBuiltIn: boolean;
  onPress: () => void;
  onEdit: () => void;
}

/**
 * One workout template. Unlike PresetRow, the row body's tap *starts* the
 * template directly (docs/user-flows.md Flow 6: "no forced preview step,
 * per the one-obvious-primary-action rule") -- editing is the separate,
 * explicit action, on its own icon, not the other way around like Presets.
 */
export function TemplateRow({ name, summary, isBuiltIn, onPress, onEdit }: TemplateRowProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Start ${name}`}
      >
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          {isBuiltIn ? <Text style={styles.builtInTag}>BUILT-IN</Text> : null}
        </View>
        <Text style={styles.summary} numberOfLines={1}>
          {summary}
        </Text>
      </Pressable>

      <Pressable
        onPress={onEdit}
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${name}`}
      >
        <Text style={styles.editGlyph}>✎</Text>
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
    body: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    name: {
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      color: colors.textPrimary,
    },
    builtInTag: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      letterSpacing: 0.5,
      color: colors.textMuted,
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
    editGlyph: {
      fontSize: 15,
      color: colors.textMuted,
    },
    pressed: {
      opacity: 0.6,
    },
  });
}
