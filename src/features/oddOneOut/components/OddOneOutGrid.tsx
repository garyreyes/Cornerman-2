import { useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens } from "../../../shared/theme/tokens";

interface OddOneOutGridProps {
  gridSize: number;
  oddIndex: number;
  onTapTile: (index: number) => void;
  disabled?: boolean;
}

const GAP = 10;
const MAX_GRID_DIMENSION = 340;

/**
 * The Phase 11c visual drill grid (docs/user-flows.md Flow 7): every tile
 * identical except `oddIndex` -- tap the different one. Tiles are
 * unlabeled beyond a generic "Grid tile" for screen readers (never "the
 * different tile") -- this is inherently a sighted reaction-time task
 * ("the drill phase is the one moment this mode asks for eyes-on-screen
 * attention", ARCHITECTURE.md), and a revealing label would trivialize
 * the one thing the game is testing.
 */
export function OddOneOutGrid({ gridSize, oddIndex, onTapTile, disabled = false }: OddOneOutGridProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const gridDimension = Math.min(width * 0.85, MAX_GRID_DIMENSION);
  const tileSize = (gridDimension - GAP * (gridSize - 1)) / gridSize;
  const styles = useMemo(() => createStyles(colors, gridDimension), [colors, gridDimension]);

  return (
    <View style={styles.grid}>
      {Array.from({ length: gridSize * gridSize }, (_, index) => {
        const isOdd = index === oddIndex;
        return (
          <Pressable
            key={index}
            onPress={() => onTapTile(index)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.tile,
              { width: tileSize, height: tileSize },
              isOdd && styles.tileOdd,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Grid tile ${index + 1}`}
          />
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorTokens, gridDimension: number) {
  return StyleSheet.create({
    grid: {
      width: gridDimension,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GAP,
    },
    tile: {
      borderRadius: 8,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    tileOdd: {
      backgroundColor: colors.accentDim,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
