import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { useTheme } from "../theme/ThemeContext";
import type { ColorTokens, Fonts } from "../theme/tokens";

interface WheelPickerProps {
  label: string;
  value: number;
  values: number[];
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}

const ITEM_HEIGHT = 32;
const VISIBLE_REST = 1;
const CONTAINER_HEIGHT = (1 + VISIBLE_REST * 2) * ITEM_HEIGHT;
const FADE_RANGE = [-2 * ITEM_HEIGHT, -ITEM_HEIGHT, 0, ITEM_HEIGHT, 2 * ITEM_HEIGHT];

/**
 * `value` must always resolve to some index -- but silently falling back
 * to index 0 would make the wheel display a value nothing like the actual
 * stored one (e.g. a persisted `workDurationSec` no longer on-grid after a
 * range/step tweak). Snapping to the closest selectable value instead is
 * the same graceful-fallback spirit as resolvePunchName/effectivePool
 * elsewhere in this codebase -- degrade sensibly, don't degrade to zero.
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

interface WheelPickerRowProps {
  option: string;
  index: number;
  scrollY: ReturnType<typeof useSharedValue<number>>;
  textStyle: object;
}

/** Fades/shrinks rows the further they sit from the centered (selected)
 * row -- `relative` is this row's own scroll-space position minus the
 * current scroll offset, so it's 0 exactly when centered, negative above,
 * positive below, regardless of which row index that happens to be. */
function WheelPickerRow({ option, index, scrollY, textStyle }: WheelPickerRowProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const relative = index * ITEM_HEIGHT - scrollY.value;
    return {
      opacity: interpolate(relative, FADE_RANGE, [0.15, 0.35, 1, 0.35, 0.15], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(relative, FADE_RANGE, [0.8, 0.88, 1, 0.88, 0.8], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Animated.View style={[rowStyles.row, animatedStyle]}>
      <Text style={textStyle}>{option}</Text>
    </Animated.View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
});

/**
 * Themed scroll-wheel picker for Round/Work/Rest/Warmup duration --
 * PRD's "iOS-style continuous scroll picker". `values` is the ordered
 * list of selectable numbers; the index<->value mapping happens here.
 *
 * Renders its own scroll/snap logic directly on a Reanimated
 * `Animated.ScrollView` rather than wrapping `react-native-wheely`
 * (which is `Animated.FlatList` under the hood, a VirtualizedList) --
 * fixed 2026-08-25 via /impeccable critique/polish, closing a real
 * "VirtualizedLists should never be nested inside plain ScrollViews with
 * the same orientation" bug that was visibly breaking the Settings screen
 * (every Round/Work/Rest/Warmup picker sits inside Settings' own
 * page-level ScrollView). These lists are always small (max ~121 rows for
 * Work duration), so rendering all rows directly costs nothing
 * virtualization would meaningfully save. Uses Reanimated (matching
 * CountdownRing/PhaseBadge's existing pattern in this codebase) rather
 * than React Native's legacy Animated API. This also removes the upstream
 * library's own `React.memo(..., () => true)` bug that required a
 * `key={mode}`-forced-remount workaround for theme-color changes -- rows
 * here re-render normally.
 */
export function WheelPicker({ label, value, values, formatValue = (v) => String(v), onChange }: WheelPickerProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const options = values.map(formatValue);
  const selectedIndex = nearestIndex(values, value);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(selectedIndex * ITEM_HEIGHT);

  // `scrollTo` on mount races the native ScrollView's own first layout pass
  // (confirmed 2026-08-25 on a real device: the mount-only effect below
  // fired with the correct target offset every time, but the screen still
  // rendered scrolled to index 0 -- `scrollTo` is a no-op if the native
  // view hasn't measured its content yet). `contentOffset` is read once by
  // the native view during its own initial layout, so it lands reliably;
  // frozen via `useState`'s lazy initializer (never recomputed after
  // mount) specifically to avoid reintroducing the *other* on-device bug
  // this same component already fixed once, where recomputing
  // `contentOffset` on every render fought the user's own active scroll.
  const [initialOffset] = useState(() => selectedIndex * ITEM_HEIGHT);
  // A fresh `{x, y}` object literal on every render is a *new reference*
  // even when `initialOffset` itself never changes -- and passing a new
  // object to `contentOffset` on every render is exactly the failure mode
  // already fixed once before in this component (see the note above): RN
  // re-applies it as a fresh repositioning command each time, which can
  // fight the user's own in-progress scroll on any parent re-render (e.g.
  // a sibling wheel's onChange updating shared `settings` state re-renders
  // this whole row). Memoized so the object reference is as stable as the
  // value it carries.
  const contentOffset = useMemo(() => ({ x: 0, y: initialOffset }), [initialOffset]);
  const isMounted = useRef(false);

  // If selectedIndex changes from outside (not via this component's own
  // scroll) *after* mount, scroll to match -- what the user sees as
  // selected must always correspond to the actual stored value. Skipped on
  // the mount run itself since `contentOffset` above already places it.
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    scrollY.set(selectedIndex * ITEM_HEIGHT);
    scrollTo(scrollRef, 0, selectedIndex * ITEM_HEIGHT, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.set(event.contentOffset.y);
    },
  });

  function handleMomentumScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    // Due to list bounciness at the start/end, the offset might be negative
    // or past the last item -- clamp to the supported range.
    const offsetY = Math.min(ITEM_HEIGHT * (values.length - 1), Math.max(event.nativeEvent.contentOffset.y, 0));
    let index = Math.floor(offsetY / ITEM_HEIGHT);
    const remainder = offsetY % ITEM_HEIGHT;
    if (remainder > ITEM_HEIGHT / 2) {
      index++;
    }
    if (index !== selectedIndex) {
      onChange(values[index]!);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={styles.wheel}
        // A screen-reader user can't meaningfully operate a scroll
        // gesture on a custom wheel -- "adjustable" + increment/decrement
        // actions is the standard RN pattern for this (the same one
        // @react-native-community/slider uses internally), swiped
        // up/down via VoiceOver/TalkBack instead. Found 2026-08-25 via
        // /impeccable critique: this was one of the app's primary
        // Settings inputs (Round/Work/Rest/Warmup) with zero
        // accessibility props at all.
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: options[selectedIndex] }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment") {
            onChange(values[Math.min(values.length - 1, selectedIndex + 1)]!);
          } else if (event.nativeEvent.actionName === "decrement") {
            onChange(values[Math.max(0, selectedIndex - 1)]!);
          }
        }}
      >
        <View style={styles.indicator} pointerEvents="none" />
        <Animated.ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentOffset={contentOffset}
          contentContainerStyle={{ paddingVertical: VISIBLE_REST * ITEM_HEIGHT }}
          // Both this wheel and the Settings screen's own outer ScrollView
          // are vertical -- without this (Android-only) prop, a swipe
          // starting on the wheel got claimed by the outer page instead of
          // scrolling the wheel itself, a real functional regression
          // caught 2026-08-25 by actually swiping the rebuilt picker
          // on-device rather than only checking its static render.
          nestedScrollEnabled
        >
          {options.map((option, index) => (
            <WheelPickerRow key={index} option={option} index={index} scrollY={scrollY} textStyle={styles.itemText} />
          ))}
        </Animated.ScrollView>
      </View>
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
      height: CONTAINER_HEIGHT,
      position: "relative",
      overflow: "hidden",
    },
    indicator: {
      position: "absolute",
      width: "100%",
      top: VISIBLE_REST * ITEM_HEIGHT,
      height: ITEM_HEIGHT,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.accentDim,
      backgroundColor: colors.background,
      // No zIndex (or a low one) -- this is declared before the
      // ScrollView in JSX specifically so it paints *behind* the row
      // text by default sibling order. A `zIndex` here previously
      // inverted that, opaquely covering the selected row's own numeral
      // (caught 2026-08-25 verifying on-device: the selected value was
      // rendering invisible inside the indicator box).
      zIndex: -1,
    },
    itemText: {
      fontFamily: fonts.numericSemiBold,
      fontSize: 18,
      color: colors.textPrimary,
    },
  });
}
