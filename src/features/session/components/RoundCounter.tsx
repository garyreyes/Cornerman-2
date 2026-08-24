import { StyleSheet, Text } from "react-native";

import { theme } from "../theme";

interface RoundCounterProps {
  round: number;
  totalRounds: number;
}

/** Small "lap-dial readout" per docs/design-direction.md's FIRST VIEWPORT spec. */
export function RoundCounter({ round, totalRounds }: RoundCounterProps) {
  const displayRound = Math.max(1, round);
  return (
    <Text style={styles.text}>
      ROUND {displayRound}/{totalRounds}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 2,
    color: theme.colors.enamelMuted,
  },
});
