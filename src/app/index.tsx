/**
 * THESIS: A timer that reads like a tool you actually work in, not
 * another phone-screen fitness app -- the corner-man's analog-stopwatch
 * dial retained (this is still an instrument you glance at mid-round),
 * recolored out of the gunmetal/brass world into a dark-ground/orange-
 * accent register (code-editor dark themes) per explicit user redirect
 * after seeing the original palette rendered on-device.
 *
 * OWN-WORLD: Near-black ground, one orange accent carrying every active/
 * interactive element (the sweep-ring, Start button, phase-badge accents),
 * tuned per light/dark mode rather than one fixed hex (see
 * src/shared/theme/tokens.ts) -- both modes are real, designed palettes,
 * user-selectable in Settings > Appearance (System/Light/Dark), not one
 * locked dark world. Primary/muted neutral text tokens replace the old
 * enamel-white/enamel-muted naming. Display/label text: Inter (unchanged
 * role, retired Barlow Condensed). Numerals specifically -- the countdown
 * readout, wheel-picker values, slider values, num badges -- render in
 * JetBrains Mono, the one deliberate monospace touch, not a blanket swap.
 * Motion: sweep-hand-style continuous easing for the countdown (never a
 * digital blink), a genuine bell-strike moment at phase changes --
 * mechanical and earned, never bouncy or gamified. Unchanged from the
 * original contract.
 *
 * STORY: The user glances down mid-round and reads phase, time
 * remaining, and round count in under a second, the way they'd glance at
 * a real stopwatch -- then looks back up and keeps training. Audio
 * (spoken combos, bell, clapper) carries the session; the screen exists
 * for the moments eyes actually land on it.
 *
 * FORM: Redesign of "The Corner's Stopwatch & Bell" (original seed key
 * ca58d365) -- pinned by explicit user direction, not a concept-seed
 * roll (docs/design-direction.md's "Redesign" record).
 *
 * FINISH: unreviewed and undocumented is unfinished -- this build ends
 * with the finish review, the verdict, and DESIGN.md.
 */
import { Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioErrorBanner } from "../features/session/components/AudioErrorBanner";
import { ComboCard } from "../features/session/components/ComboCard";
import { ControlRow } from "../features/session/components/ControlRow";
import { CountdownRing } from "../features/session/components/CountdownRing";
import { PhaseBadge } from "../features/session/components/PhaseBadge";
import { RoundCounter } from "../features/session/components/RoundCounter";
import { SettingsGear } from "../features/session/components/SettingsGear";
import { TemplatesButton } from "../features/session/components/TemplatesButton";
import { useSession } from "../features/session/useSession";
import { getSettings } from "../features/settings/service";
import { useTheme } from "../shared/theme/ThemeContext";
import type { ColorTokens } from "../shared/theme/tokens";

/**
 * Route-level gate only -- redirects to Onboarding before Main Timer's
 * useSession() (native audio/speech engines, background-audio session,
 * the 200ms poll loop) ever spins up, rather than mounting all of that
 * just to immediately redirect away from it.
 */
export default function MainTimerRoute() {
  const [hasCompletedOnboarding] = useState(() => getSettings().hasCompletedOnboarding);

  if (!hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <MainTimerScreen />;
}

function MainTimerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { timerState, session, settings, audioError, totalRounds, phaseDurationMs, start, togglePause, reset } =
    useSession();

  const phase = timerState?.phase ?? "ready";
  const isPaused = timerState?.isPaused ?? false;
  const round = timerState?.round ?? 0;
  const showReset = phase === "finished";
  const showStart = phase === "ready";
  const showPauseToggle = phase === "warmup" || phase === "work" || phase === "rest";

  // useSession's phaseDurationMs is null outside an active phase
  // (Ready/Finished) -- CountdownRing needs a real number either way, and
  // settings.workDurationSec is exactly what it showed as the pre-Start
  // preview before Phase 10d (unchanged for Finished too, where the ring
  // shows full/complete regardless of which positive number this is).
  const ringDurationMs = phaseDurationMs ?? settings.workDurationSec * 1000;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topRow}>
        <RoundCounter round={round} totalRounds={totalRounds} />
        <View style={styles.iconGroup}>
          <TemplatesButton onPress={() => router.push("/templates")} />
          <SettingsGear onPress={() => router.push("/settings")} />
        </View>
      </View>

      <View style={styles.center}>
        <PhaseBadge phase={phase} isPaused={isPaused} />

        <CountdownRing
          phaseEndAt={timerState?.phaseEndAt ?? null}
          phaseDurationMs={ringDurationMs}
          isPaused={isPaused}
        />

        {audioError ? <AudioErrorBanner /> : null}

        <ComboCard combo={session.currentCombo} comboCount={session.comboCount} />
      </View>

      <View style={styles.bottom}>
        <ControlRow
          showStart={showStart}
          showPauseToggle={showPauseToggle}
          showReset={showReset}
          isPaused={isPaused}
          // Deliberately wrapped, not `onStart={start}` -- `start` now
          // optionally takes a WorkoutTemplate (Phase 10d), and
          // ControlRow's Pressable would otherwise pass its
          // GestureResponderEvent through as that argument.
          onStart={() => start()}
          onTogglePause={togglePause}
          onReset={reset}
        />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    iconGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      paddingHorizontal: 24,
    },
    bottom: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
  });
}
