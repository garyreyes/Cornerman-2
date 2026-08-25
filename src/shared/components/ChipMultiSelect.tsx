import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens, Fonts } from "../theme/tokens";

interface ChipMultiSelectProps {
  items: { id: string; value: number; label: string }[];
  selected: number[];
  onToggle: (value: number) => void;
}

/**
 * Toggleable chip list -- Random mode's punch pool restriction. Keyed by
 * `id`, not `value` (`Punch.num` is explicitly allowed to be non-unique,
 * extraction doc §1.6 -- two punches can share a num and would otherwise
 * collide as React keys). The last remaining selected chip can't be
 * deselected (mirrors the existing last-punch delete guard's spirit: an
 * empty pool reads as broken, even though comboEngine's effectivePool()
 * already degrades gracefully).
 */
export function ChipMultiSelect({ items, selected, onToggle }: ChipMultiSelectProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const active = selected.includes(item.value);
        const disabled = active && selected.length <= 1;
        return (
          <Pressable
            key={item.id}
            onPress={() => (disabled ? undefined : onToggle(item.value))}
            style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
            // Visual height (~28px) is under the 44/48pt touch-target
            // minimum -- found 2026-08-25 via /impeccable critique. Kept
            // small relative to the 44 target and paired with the wrap's
            // widened gap below, since these chips can wrap onto multiple
            // rows and a bigger hitSlop would overlap a chip wrapped
            // directly above/below it.
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
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
      borderColor: colors.panelLine,
      backgroundColor: colors.background,
    },
    chipActive: {
      backgroundColor: colors.accentDim,
      borderColor: colors.accent,
    },
    chipDisabled: {
      opacity: 0.6,
    },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textMuted,
    },
    labelActive: {
      color: colors.textPrimary,
    },
  });
}
