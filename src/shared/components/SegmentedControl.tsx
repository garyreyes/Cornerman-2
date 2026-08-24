import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../features/session/theme";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Themed pill toggle -- Mode (Random/Preset) and Announce Style (Name/Number). */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.panelLine,
    backgroundColor: theme.colors.background,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: theme.colors.brassAmber,
  },
  label: {
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 13,
    letterSpacing: 1,
    color: theme.colors.enamelMuted,
  },
  labelActive: {
    color: theme.colors.background,
  },
});
