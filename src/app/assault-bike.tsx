import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DrillFeedback } from "../features/assaultBike/components/DrillFeedback";
import { DrillModePicker } from "../features/assaultBike/components/DrillModePicker";
import { ScoreReadout } from "../features/assaultBike/components/ScoreReadout";
import { SessionSummary } from "../features/assaultBike/components/SessionSummary";
import { TrialTimerBar } from "../features/assaultBike/components/TrialTimerBar";
import { useBikeSession } from "../features/assaultBike/useBikeSession";
import { useDrillRun } from "../features/assaultBike/useDrillRun";
import { ColorCallGrid } from "../features/colorCall/components/ColorCallGrid";
import { OddOneOutGrid } from "../features/oddOneOut/components/OddOneOutGrid";
import { AudioErrorBanner } from "../features/session/components/AudioErrorBanner";
import { ControlRow } from "../features/session/components/ControlRow";
import { CountdownRing } from "../features/session/components/CountdownRing";
import { PhaseBadge } from "../features/session/components/PhaseBadge";
import { RoundCounter } from "../features/session/components/RoundCounter";
import { getWorkoutTemplates, toBikeConfig } from "../features/workoutTemplates/service";
import type { AssaultBikeConfig, DrillMode } from "../features/workoutTemplates/types";
import { useTheme } from "../shared/theme/ThemeContext";
import type { ColorTokens } from "../shared/theme/tokens";

/**
 * Assault-Bike Session (docs/user-flows.md Flow 7, Phase 11b/11c).
 * Deliberately visually distinct from the boxing Main Timer per Flow 7's
 * own note -- no combo card (nothing to show), and the Drill phase
 * replaces the countdown ring entirely with the Odd-One-Out grid rather
 * than showing both at once, since "the drill phase is the one moment
 * this mode asks for eyes-on-screen attention" (the grid *is* that
 * moment's countdown-equivalent). Reused as-is: RoundCounter/PhaseBadge/
 * ControlRow/CountdownRing/AudioErrorBanner -- all were already generic
 * (no boxing-specific data), and PhaseBadge's own fallback
 * (`phase.toUpperCase()`) already handles "settle"/"drill"/"reset" with
 * no changes needed there.
 *
 * No background-audio/notification wiring here (unlike Main Timer's
 * useSession) -- this mode is inherently an eyes-on-screen, hands-on-
 * device experience (the Drill phase requires actively tapping the
 * grid), not the boxing flow's audio-first, screen-off-friendly one; see
 * PROJECT_FACTS.md.
 */
export default function AssaultBikeSessionRoute() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const router = useRouter();

  const [template] = useState(() => {
    const found = getWorkoutTemplates().find((t) => t.id === templateId);
    return found?.workoutType === "assault-bike-cognitive" ? found : undefined;
  });

  // Defensive only -- Templates Picker always passes a valid assault-bike
  // template id; degrade gracefully rather than rendering a phantom
  // session if one was ever deleted out from under a stale navigation
  // (mirrors Preset Editor/Round Builder's own guard).
  useEffect(() => {
    if (template === undefined) {
      router.back();
    }
  }, [template, router]);

  if (template === undefined) {
    return null;
  }

  return <AssaultBikeSessionScreen name={template.name} config={template.config} />;
}

function AssaultBikeSessionScreen({ name, config }: { name: string; config: AssaultBikeConfig }) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [bikeConfig] = useState(() => toBikeConfig(config));
  const { bikeState, totalRounds, phaseDurationMs, audioError, start, togglePause, reset } = useBikeSession(bikeConfig);

  const phase = bikeState?.phase ?? "ready";
  const isPaused = bikeState?.isPaused ?? false;
  const round = bikeState?.round ?? 0;
  const showStart = bikeState === null;
  const showReset = phase === "finished";
  const showPauseToggle = bikeState !== null && phase !== "finished";
  // A plain-rest protocol (Lactic Capacity) has no drill at all, so there
  // is no drillMode/difficulty to read -- narrowed once here rather than
  // re-checked at each use.
  const drill = config.rest.kind === "drill" ? config.rest : null;
  const isDrilling = phase === "drill" && !isPaused && drill !== null;

  // The template's drillMode is the default, not the verdict -- there is
  // no bike template editor, so this is the only way Color Call is
  // reachable at all (see DrillModePicker). Chosen per session and not
  // persisted: which drill you feel like has nothing to do with which
  // energy system the protocol trains.
  const [drillMode, setDrillMode] = useState<DrillMode>(drill?.drillMode ?? "odd-one-out");

  // Called unconditionally (rules of hooks); `active` stays false whenever
  // this protocol isn't running its drill phase. Stats live here, above
  // the per-round activation, so score and the shrinking trial window
  // carry across all of the session's rounds.
  const { trial, lastResult, deadlineAt, windowMs, stats, summary, handleTap, resetStats } = useDrillRun(
    isDrilling,
    drillMode,
    drill?.difficulty ?? "medium",
  );

  function handleStart() {
    resetStats();
    start();
  }

  function handleReset() {
    resetStats();
    reset();
  }

  // Ready/Finished have no active phaseDurationMs -- the work duration is
  // as reasonable a static preview/fallback as Main Timer's own
  // equivalent (see src/app/index.tsx's ringDurationMs).
  const ringDurationMs = phaseDurationMs ?? bikeConfig.workSec * 1000;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      {/* This screen is reached via push (Templates Picker), not the
          root's own headerless full-bleed screens (index/onboarding) --
          opts into the same themed header + back arrow Settings/Templates
          already use, per docs/user-flows.md's navigation convention,
          rather than inheriting the root Stack's headerShown:false. */}
      <Stack.Screen
        options={{
          title: name.toUpperCase(),
          headerShown: true,
          headerStyle: { backgroundColor: colors.panel },
          headerTintColor: colors.accent,
          headerTitleStyle: { fontFamily: fonts.bodySemiBold, fontSize: 16 },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.topRow}>
        <RoundCounter round={round} totalRounds={totalRounds} />
      </View>

      <View style={styles.center}>
        <PhaseBadge phase={phase} isPaused={isPaused} />

        {audioError ? <AudioErrorBanner /> : null}

        {phase === "finished" ? (
          <SessionSummary summary={summary} />
        ) : phase === "drill" && drill !== null ? (
          <View style={styles.drill}>
            <TrialTimerBar deadlineAt={deadlineAt} windowMs={windowMs} />
            <ScoreReadout score={stats.score} windowMs={windowMs} />
            <DrillFeedback result={lastResult} />
            {trial === null ? null : trial.mode === "odd-one-out" ? (
              <OddOneOutGrid
                gridSize={trial.puzzle.gridSize}
                oddIndex={trial.puzzle.oddIndex}
                onTapTile={handleTap}
                disabled={isPaused}
              />
            ) : (
              <ColorCallGrid choices={trial.puzzle.choices} onTapTile={handleTap} disabled={isPaused} />
            )}
          </View>
        ) : (
          <CountdownRing phaseEndAt={bikeState?.phaseEndAt ?? null} phaseDurationMs={ringDurationMs} isPaused={isPaused} />
        )}
      </View>

      {/* Only before the session starts, and only for a protocol that
          actually runs a drill -- Lactic Capacity has nothing to pick. */}
      {showStart && drill !== null ? (
        <View style={styles.picker}>
          <DrillModePicker value={drillMode} onChange={setDrillMode} />
        </View>
      ) : null}

      <View style={styles.bottom}>
        <ControlRow
          showStart={showStart}
          showPauseToggle={showPauseToggle}
          showReset={showReset}
          isPaused={isPaused}
          onStart={handleStart}
          onTogglePause={togglePause}
          onReset={handleReset}
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
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      paddingHorizontal: 24,
    },
    // The drill stack is width-constrained to the grid's own max so the
    // timer bar and score row line up with the tiles rather than running
    // the full screen width past them.
    drill: {
      width: "100%",
      maxWidth: 340,
      alignItems: "center",
      gap: 12,
    },
    picker: {
      paddingHorizontal: 24,
      paddingBottom: 8,
    },
    bottom: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
  });
}
