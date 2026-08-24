import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../features/session/theme";

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

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.panelLine,
    backgroundColor: theme.colors.background,
  },
  chipActive: {
    backgroundColor: theme.colors.brassAmberDim,
    borderColor: theme.colors.brassAmber,
  },
  chipDisabled: {
    opacity: 0.6,
  },
  label: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.enamelMuted,
  },
  labelActive: {
    color: theme.colors.enamelWhite,
  },
});
