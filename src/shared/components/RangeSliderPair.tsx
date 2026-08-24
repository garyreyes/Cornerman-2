import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../../features/session/theme";
import { LabeledSlider } from "./LabeledSlider";

interface RangeSliderPairProps {
  title: string;
  minLabel: string;
  maxLabel: string;
  minValue: number;
  maxValue: number;
  bounds: [number, number];
  step?: number;
  formatValue?: (value: number) => string;
  onChange: (minValue: number, maxValue: number) => void;
}

/**
 * Two stacked single-value sliders standing in for a min/max range
 * (comboGap, comboLength, defenseCueGap) -- each slider's opposite bound is
 * clamped to the other's live value (min's maximumValue = current max, and
 * vice versa) so the user structurally cannot drag one past the other;
 * no separate clamp-on-save validation needed.
 */
export function RangeSliderPair({
  title,
  minLabel,
  maxLabel,
  minValue,
  maxValue,
  bounds,
  step,
  formatValue,
  onChange,
}: RangeSliderPairProps) {
  const [liveMin, setLiveMin] = useState(minValue);
  const [liveMax, setLiveMax] = useState(maxValue);
  const [floor, ceiling] = bounds;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <LabeledSlider
        label={minLabel}
        value={minValue}
        minimumValue={floor}
        maximumValue={liveMax}
        step={step}
        formatValue={formatValue}
        onLiveChange={setLiveMin}
        onChange={(next) => onChange(next, liveMax)}
      />
      <LabeledSlider
        label={maxLabel}
        value={maxValue}
        minimumValue={liveMin}
        maximumValue={ceiling}
        step={step}
        formatValue={formatValue}
        onLiveChange={setLiveMax}
        onChange={(next) => onChange(liveMin, next)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  title: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.enamelMuted,
  },
});
