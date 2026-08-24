import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../session/theme";
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
  return (
    <View style={styles.wrap}>
      {punches.map((punch) => (
        <Pressable
          key={punch.id}
          onPress={() => onAdd(punch.num)}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Add ${punch.name} to sequence`}
        >
          <Text style={styles.label}>{punch.name}</Text>
        </Pressable>
      ))}
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
    borderColor: theme.colors.brassAmberDim,
    backgroundColor: theme.colors.background,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.brassAmber,
  },
});
