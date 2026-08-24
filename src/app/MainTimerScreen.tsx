/**
 * THESIS: A timer built to look like what a corner-man actually holds in
 * their hand mid-fight -- an analog stopwatch and a brass ring bell -- not
 * another phone-screen fitness app. Refuses the neon-gradient HIIT-timer
 * default and the sterile wellness-app opposite alike.
 *
 * OWN-WORLD: Gunmetal/brass instrument-panel dark ground (not book-cream,
 * not neon-black-with-glow). Brass-amber carries every active/interactive
 * element -- the one accent, restrained-strategy palette, chosen
 * specifically because it reads clearly in a dim evening room.
 * Enamel-white for tick marks, dial numerals, and secondary labels.
 * Numerals and dial-style display type: Barlow Condensed (open,
 * road-sign/stenciled-numeral heritage). Body/label text: Inter -- plain,
 * workhorse, appropriate for an Operate surface where legibility
 * outranks personality in running text. Motion: sweep-hand-style
 * continuous easing for the countdown (never a digital blink), a genuine
 * bell-strike moment at phase changes -- mechanical and earned, never
 * bouncy or gamified.
 *
 * STORY: The user glances down mid-round and reads phase, time
 * remaining, and round count in under a second, the way they'd glance at
 * a real stopwatch -- then looks back up and keeps training. Audio
 * (spoken combos, bell, clapper) carries the session; the screen exists
 * for the moments eyes actually land on it.
 *
 * FORM: "The Corner's Stopwatch & Bell" -- docs/design-direction.md,
 * seed key ca58d365.
 *
 * (Copied verbatim from docs/design-direction.md's direction contract,
 * per Impeccable's Step 5 format.)
 */
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioErrorBanner } from "../features/session/components/AudioErrorBanner";
import { ComboCard } from "../features/session/components/ComboCard";
import { ControlRow } from "../features/session/components/ControlRow";
import { CountdownRing } from "../features/session/components/CountdownRing";
import { PhaseBadge } from "../features/session/components/PhaseBadge";
import { RoundCounter } from "../features/session/components/RoundCounter";
import { SettingsGear } from "../features/session/components/SettingsGear";
import { theme } from "../features/session/theme";
import { useSession } from "../features/session/useSession";

export function MainTimerScreen() {
  const { timerState, session, settings, audioError, start, togglePause, reset } = useSession();

  const phase = timerState?.phase ?? "ready";
  const isPaused = timerState?.isPaused ?? false;
  const round = timerState?.round ?? 0;

  const phaseDurationMs =
    phase === "warmup"
      ? settings.warmupDurationSec * 1000
      : phase === "rest"
        ? settings.restDurationSec * 1000
        : settings.workDurationSec * 1000;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topRow}>
        <RoundCounter round={round} totalRounds={settings.rounds} />
        <SettingsGear />
      </View>

      <View style={styles.center}>
        <PhaseBadge phase={phase} isPaused={isPaused} />

        <CountdownRing
          phaseEndAt={timerState?.phaseEndAt ?? null}
          phaseDurationMs={phaseDurationMs}
          isPaused={isPaused}
        />

        {audioError ? <AudioErrorBanner /> : null}

        <ComboCard combo={session.currentCombo} comboCount={session.comboCount} />
      </View>

      <View style={styles.bottom}>
        <ControlRow phase={phase} isPaused={isPaused} onStart={start} onTogglePause={togglePause} onReset={reset} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
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
