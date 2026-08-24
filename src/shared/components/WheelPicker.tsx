import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Wheely from "react-native-wheely";

import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens, Fonts } from "../theme/tokens";

interface WheelPickerProps {
  label: string;
  value: number;
  values: number[];
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}

/**
 * react-native-wheely itself hard-throws if selectedIndex is out of
 * [0, options.length-1] (its own useEffect guard), so an index must always
 * be returned -- but silently falling back to index 0 would make the wheel
 * display a value nothing like the actual stored one (e.g. a persisted
 * `workDurationSec` no longer on-grid after a range/step tweak). Snapping
 * to the closest selectable value instead is the same graceful-fallback
 * spirit as resolvePunchName/effectivePool elsewhere in this codebase --
 * degrade sensibly, don't degrade to zero.
 */
function nearestIndex(values: number[], value: number): number {
  const exact = values.indexOf(value);
  if (exact !== -1) return exact;
  let nearest = 0;
  let smallestDiff = Infinity;
  for (let i = 0; i < values.length; i++) {
    const diff = Math.abs(values[i]! - value);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      nearest = i;
    }
  }
  return nearest;
}

/**
 * Themed wrapper around react-native-wheely (pure-JS scroll wheel, no
 * native module) -- PRD's "iOS-style continuous scroll picker" for Round/
 * Work/Rest/Warmup duration, restyled to this app's own world instead of
 * a platform-default look. `values` is the ordered list of selectable
 * numbers; wheely itself only knows string options + an index, so the
 * index<->value mapping happens here.
 */
export function WheelPicker({ label, value, values, formatValue = (v) => String(v), onChange }: WheelPickerProps) {
  const { mode, colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const options = values.map(formatValue);
  const selectedIndex = nearestIndex(values, value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {/* react-native-wheely's own item component is wrapped in
          React.memo(..., () => true) -- it deliberately never re-renders
          after its first mount, so a `textStyle`/`selectedIndicatorStyle`
          color update (e.g. switching Appearance mode) is silently
          ignored and the numerals stay whatever color they first
          rendered with, invisible against a new background. Keying on
          `mode` forces a full remount on a theme change instead, which
          is the only way to get the library to actually pick up new
          colors. */}
      <Wheely
        key={mode}
        selectedIndex={selectedIndex}
        options={options}
        onChange={(index) => onChange(values[index]!)}
        itemHeight={32}
        visibleRest={1}
        containerStyle={styles.wheel}
        selectedIndicatorStyle={styles.indicator}
        itemTextStyle={styles.itemText}
        decelerationRate="fast"
      />
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    label: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
    wheel: {
      width: "100%",
    },
    indicator: {
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.accentDim,
    },
    itemText: {
      fontFamily: fonts.numericSemiBold,
      fontSize: 18,
      color: colors.textPrimary,
    },
  });
}
