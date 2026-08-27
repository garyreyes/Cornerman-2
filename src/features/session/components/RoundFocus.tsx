import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { RoundConfig } from "../../workoutTemplates/types";
import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface RoundFocusProps {
  round: RoundConfig | null;
}

/**
 * The running round's focus and coaching cue ("KICKS -- ENTRY / the flick
 * is bait, follow it into the pocket"). Round-by-round focus is the whole
 * point of a workout template, and until now it only existed in the Round
 * Builder -- a session never showed which round you were actually in.
 *
 * Renders nothing for a Settings-driven quick-start, which has no round
 * plan to describe; the caller passes null and this stays out of the
 * layout entirely rather than reserving empty space.
 */
export function RoundFocus({ round }: RoundFocusProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const label = round?.label?.trim();
  const note = round?.note?.trim();
  if (!label && !note) {
    return null;
  }

  return (
    // One screen-reader stop rather than two separate unlabeled texts --
    // the cue only makes sense read after the focus it belongs to.
    <View style={styles.wrap} accessible accessibilityLabel={[label, note].filter(Boolean).join(". ")}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    wrap: {
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 16,
    },
    label: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 15,
      letterSpacing: 1.5,
      color: colors.accent,
      textTransform: "uppercase",
      textAlign: "center",
    },
    note: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      textAlign: "center",
    },
  });
}
