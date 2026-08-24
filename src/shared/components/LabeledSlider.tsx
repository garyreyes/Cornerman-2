import Slider from "@react-native-community/slider";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../../features/session/theme";

interface LabeledSliderProps {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
  /** Fired on every drag tick, not just on release -- lets a parent (e.g.
   * RangeSliderPair) keep a sibling slider's bound clamped live. */
  onLiveChange?: (value: number) => void;
}

/**
 * A single slider with a live label + value readout. `value` only sets the
 * native slider's *initial* position (it's an uncontrolled component per
 * @react-native-community/slider's own docs), so the displayed number
 * tracks local drag state via onValueChange, and the actual commit to
 * storage happens once on onSlidingComplete -- avoids a write per pixel of
 * drag.
 */
export function LabeledSlider({
  label,
  value,
  minimumValue,
  maximumValue,
  step,
  formatValue = (v) => String(v),
  onChange,
  onLiveChange,
}: LabeledSliderProps) {
  const [displayValue, setDisplayValue] = useState(value);

  function handleValueChange(next: number) {
    setDisplayValue(next);
    onLiveChange?.(next);
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatValue(displayValue)}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor={theme.colors.brassAmber}
        maximumTrackTintColor={theme.colors.panelLine}
        thumbTintColor={theme.colors.brassAmber}
        onValueChange={handleValueChange}
        onSlidingComplete={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.enamelWhite,
  },
  value: {
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 14,
    color: theme.colors.brassAmber,
  },
});
