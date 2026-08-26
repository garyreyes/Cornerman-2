import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";
import type { DrillMode } from "../../workoutTemplates/types";

const OPTIONS: readonly { mode: DrillMode; label: string; hint: string }[] = [
  { mode: "odd-one-out", label: "ODD ONE OUT", hint: "Tap the tile that differs" },
  { mode: "color-call", label: "COLOR CALL", hint: "Tap the colour you hear" },
];

interface DrillModePickerProps {
  value: DrillMode;
  onChange: (mode: DrillMode) => void;
}

/**
 * Chooses the drill for this session, shown only before the session
 * starts (Phase 12c).
 *
 * This exists because there is no assault-bike template editor: without
 * it, Color Call would be unreachable without shipping a second copy of
 * every protocol row just to vary one field. A per-session choice is also
 * the honest shape of the decision -- which drill you feel like today has
 * nothing to do with which energy system you're training.
 *
 * Sits below the primary START action rather than above it, so the screen
 * still has exactly one obvious thing to do on arrival; the drill has a
 * sensible default and only rewards a rider who wants to change it.
 */
export function DrillModePicker({ value, onChange }: DrillModePickerProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const active = OPTIONS.find((o) => o.mode === value) ?? OPTIONS[0]!;

  return (
    <View style={styles.container}>
      <Text style={styles.caption}>DRILL</Text>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const selected = option.mode === value;
          return (
            <Pressable
              key={option.mode}
              onPress={() => onChange(option.mode)}
              style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.label}. ${option.hint}`}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{active.hint}</Text>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      gap: 8,
    },
    caption: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      letterSpacing: 3,
      color: colors.textMuted,
    },
    row: {
      flexDirection: "row",
      gap: 8,
    },
    option: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.panelLine,
      backgroundColor: colors.panel,
    },
    optionSelected: {
      borderColor: colors.accent,
    },
    pressed: {
      opacity: 0.8,
    },
    optionLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      letterSpacing: 1.5,
      color: colors.textMuted,
    },
    optionLabelSelected: {
      color: colors.accent,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
