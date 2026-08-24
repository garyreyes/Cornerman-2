import Slider from "@react-native-community/slider";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens, Fonts } from "../theme/tokens";

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
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
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
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.panelLine}
        thumbTintColor={colors.accent}
        onValueChange={handleValueChange}
        onSlidingComplete={onChange}
      />
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    container: {
      gap: 4,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    label: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    value: {
      fontFamily: fonts.numericSemiBold,
      fontSize: 14,
      color: colors.accent,
    },
  });
}
