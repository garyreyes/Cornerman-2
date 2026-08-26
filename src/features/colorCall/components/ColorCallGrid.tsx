import { useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import type { DrillColor } from "../types";

const GAP = 10;
const MAX_GRID_DIMENSION = 340;
const COLUMNS = 2;

/**
 * Fixed hex, not theme tokens -- this is the one surface in the app where
 * colour *is* the information rather than decoration, so it can't shift
 * with the theme: "tap the red one" has to mean the same thing in every
 * mode. That makes the drill grid a deliberate, documented exception to
 * docs/design-direction.md's monochrome Light/Dark contract (Phase 12c);
 * everything around it stays monochrome.
 *
 * Chosen for mutual distinguishability and for holding up against both a
 * near-black and a near-white ground, including for the most common forms
 * of colour-vision deficiency, where red/green pairs separate by lightness
 * as well as hue.
 */
export const DRILL_COLOR_HEX: Readonly<Record<DrillColor, string>> = {
  red: "#E5484D",
  blue: "#3E7BFA",
  green: "#30A46C",
  yellow: "#E5C100",
  orange: "#F76B15",
  purple: "#8E4EC6",
};

interface ColorCallGridProps {
  choices: DrillColor[];
  onTapTile: (index: number) => void;
  disabled?: boolean;
}

/**
 * The Phase 12c drill grid: swatches only, no labels. Printing the colour
 * name on each tile would turn a colour-recognition task into a reading
 * one, which is not what the called word is testing.
 *
 * Unlike OddOneOutGrid -- which labels its tiles generically so a screen
 * reader can't give the puzzle away -- naming the colour here is the
 * correct label for a coloured button, and doesn't trivialise anything: a
 * rider still has to match it against the word they heard.
 */
export function ColorCallGrid({ choices, onTapTile, disabled = false }: ColorCallGridProps) {
  const { width } = useWindowDimensions();
  const gridDimension = Math.min(width * 0.85, MAX_GRID_DIMENSION);
  const tileWidth = (gridDimension - GAP * (COLUMNS - 1)) / COLUMNS;
  const rows = Math.ceil(choices.length / COLUMNS);
  // Keeps the whole grid roughly square regardless of how many colours
  // this difficulty draws, so 3 and 6 choices fill comparable space.
  const tileHeight = (gridDimension - GAP * (rows - 1)) / rows;
  const styles = useMemo(() => createStyles(gridDimension), [gridDimension]);

  return (
    <View style={styles.grid}>
      {choices.map((color, index) => (
        <Pressable
          key={`${color}-${index}`}
          onPress={() => onTapTile(index)}
          disabled={disabled}
          style={({ pressed }) => [
            styles.tile,
            { width: tileWidth, height: tileHeight, backgroundColor: DRILL_COLOR_HEX[color] },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={color}
        />
      ))}
    </View>
  );
}

function createStyles(gridDimension: number) {
  return StyleSheet.create({
    grid: {
      width: gridDimension,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: GAP,
    },
    tile: {
      borderRadius: 8,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
