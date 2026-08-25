import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";
import type { Punch } from "../types";

interface AddToSequenceRowProps {
  punches: Punch[];
  onAdd: (num: number) => void;
}

/**
 * Tap-to-append punch buttons for the Preset Editor's sequence builder --
 * not a toggle/multi-select (ChipMultiSelect's semantics don't fit here):
 * a punch can appear more than once in a sequence (e.g. "Jab, Jab, Cross"
 * is a real combo), so tapping always appends rather than tracking a
 * selected/deselected state.
 */
export function AddToSequenceRow({ punches, onAdd }: AddToSequenceRowProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <View style={styles.wrap}>
      {punches.map((punch) => (
        <Pressable
          key={punch.id}
          onPress={() => onAdd(punch.num)}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          // Visual height (~28px) is under the 44/48pt touch-target
          // minimum -- found 2026-08-25 via /impeccable critique. Kept
          // small and paired with the wrap's widened gap below, since
          // these chips can wrap onto multiple rows.
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`Add ${punch.name} to sequence`}
        >
          <Text style={styles.label}>{punch.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      // Widened from 8 -- the chip hitSlop (4) needs at least its own
      // value of clearance from a wrapped neighbor to never overlap.
      gap: 10,
    },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accentDim,
      backgroundColor: colors.background,
    },
    pressed: {
      opacity: 0.6,
    },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.accent,
    },
  });
}
