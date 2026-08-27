/**
 * The orientation tour: a paged horizontal scroller, one feature per page.
 *
 * Skippable from any page and replayable from Settings, deliberately --
 * this app's standing UX rule is that a user should land and know what to
 * do without a manual, so a tour has to be an offer rather than a gate.
 *
 * A plain react-native ScrollView, not Reanimated's: the page index comes
 * from a momentum-end callback rather than a shared value, and this
 * codebase has been bitten twice by `contentOffset`/`scrollTo` fighting a
 * Reanimated ScrollView's own state (see PROJECT_FACTS.md). Nothing here
 * needs a worklet.
 */
import { useMemo, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";
import { TOUR_CARDS } from "../content";
import { TourDiagram } from "./TourDiagrams";

interface TourPagerProps {
  /** Label for the button on the final page -- what happens after the tour
   * differs by entry point (finishing onboarding vs. closing a replay). */
  finishLabel: string;
  onFinish: () => void;
  /** Omitted when the tour was opened deliberately from Settings: there is
   * nothing to skip past, the back arrow already leaves. */
  onSkip?: () => void;
}

export function TourPager({ finishLabel, onFinish, onSkip }: TourPagerProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === TOUR_CARDS.length - 1;

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(Math.min(Math.max(next, 0), TOUR_CARDS.length - 1));
  }

  function handleNext() {
    if (isLast) {
      onFinish();
      return;
    }
    const next = index + 1;
    // Optimistic: the momentum callback confirms it, but updating here
    // keeps the dots and the button label in step with the tap even if the
    // animation is cut short.
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.scroll}
      >
        {TOUR_CARDS.map((card) => (
          <View key={card.id} style={[styles.page, { width }]}>
            <TourDiagram name={card.diagram} />
            <Text style={styles.title}>{card.title}</Text>
            <Text style={styles.body}>{card.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots} accessibilityRole="progressbar" accessibilityLabel={`Page ${index + 1} of ${TOUR_CARDS.length}`}>
        {TOUR_CARDS.map((card, i) => (
          <View key={card.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={isLast ? finishLabel : "Next"}
        >
          <Text style={styles.primaryLabel}>{isLast ? finishLabel : "NEXT"}</Text>
        </Pressable>
        {onSkip && !isLast ? (
          <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip the tour">
            <Text style={styles.skip}>SKIP</Text>
          </Pressable>
        ) : (
          // Holds the row's height so the primary button doesn't shift up
          // on the last page, which reads as the layout jumping.
          <View style={styles.skipPlaceholder} />
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    page: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
      paddingHorizontal: 32,
    },
    title: {
      // 24, not the intro card's 32: at that size two of the three titles
      // wrap onto a second line carrying a single orphaned word.
      fontFamily: fonts.displayBold,
      fontSize: 24,
      letterSpacing: 1,
      color: colors.textPrimary,
      textAlign: "center",
    },
    body: {
      fontFamily: fonts.body,
      fontSize: 16,
      lineHeight: 24,
      color: colors.textMuted,
      textAlign: "center",
    },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      paddingBottom: 20,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.panelLine,
    },
    dotActive: {
      backgroundColor: colors.accent,
    },
    bottom: {
      paddingHorizontal: 24,
      paddingBottom: 24,
      gap: 4,
    },
    primaryButton: {
      paddingVertical: 16,
      borderRadius: 8,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    primaryLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      letterSpacing: 2,
      color: colors.background,
    },
    skip: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      letterSpacing: 1.5,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: 12,
    },
    skipPlaceholder: {
      height: 41,
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
