import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DrillFeedback } from "../features/assaultBike/components/DrillFeedback";
import { DrillModePicker } from "../features/assaultBike/components/DrillModePicker";
import { ScoreReadout } from "../features/assaultBike/components/ScoreReadout";
import { SessionSummary } from "../features/assaultBike/components/SessionSummary";
import { TrialTimerBar } from "../features/assaultBike/components/TrialTimerBar";
import { withoutDrill } from "../features/assaultBike/service";
import type { DrillChoice } from "../features/assaultBike/types";
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
import type { AssaultBikeConfig } from "../features/workoutTemplates/types";
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
  const [baseBikeConfig] = useState(() => toBikeConfig(config));

  // A plain-rest protocol (Lactic Capacity) has no drill at all -- there
  // is no drillMode/difficulty to read, and no picker to show. Distinct
  // from `drillChoice` below: this is a property of the *protocol*
  // (fixed in the template), that is a property of *this session*
  // (ephemeral, chosen on the pre-start screen).
  const templateDrill = config.rest.kind === "drill" ? config.rest : null;

  // The template's drillMode is the default, not the verdict -- there is
  // no bike template editor, so this picker is the only way to reach
  // Color Call, or to skip the drill on a protocol that has one (see
  // DrillModePicker). Chosen per session and not persisted: which drill
  // you feel like today, or whether you want one at all, has nothing to
  // do with which energy system the protocol trains.
  const [drillChoice, setDrillChoice] = useState<DrillChoice>(templateDrill?.drillMode ?? "none");

  // "none" collapses the session's own BikeConfig to plain rest of the
  // same total duration (assaultBike/service.ts's withoutDrill) rather
  // than threading a null case through the engine -- once collapsed, the
  // state machine simply never enters "drill", so the phase badge reads
  // one continuous REST instead of "PHONE UP" for a phone this session
  // doesn't need. Recomputed only while no session is running (the
  // picker is hidden once one starts), so this can't shift the shape of
  // an in-flight session out from under it.
  const bikeConfig = useMemo(
    () => (drillChoice === "none" ? withoutDrill(baseBikeConfig) : baseBikeConfig),
    [baseBikeConfig, drillChoice],
  );
  const { bikeState, totalRounds, phaseDurationMs, audioError, start, togglePause, reset } = useBikeSession(bikeConfig);

  const phase = bikeState?.phase ?? "ready";
  const isPaused = bikeState?.isPaused ?? false;
  const round = bikeState?.round ?? 0;
  const showStart = bikeState === null;
  const showReset = phase === "finished";
  const showPauseToggle = bikeState !== null && phase !== "finished";
  // Never true when drillChoice is "none": bikeConfig's rest is plain in
  // that case, so the engine can never actually reach phase "drill".
  const isDrilling = phase === "drill" && !isPaused;

  // Called unconditionally (rules of hooks); `active` stays false whenever
  // this protocol isn't running its drill phase. The drillMode argument is
  // a harmless placeholder when drillChoice is "none" -- it's never read,
  // since `active` can't be true in that case either. Stats live here,
  // above the per-round activation, so score and the shrinking trial
  // window carry across all of the session's rounds.
  const { trial, lastResult, deadlineAt, windowMs, stats, summary, handleTap, resetStats } = useDrillRun(
    isDrilling,
    drillChoice === "none" ? "odd-one-out" : drillChoice,
    templateDrill?.difficulty ?? "medium",
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
  // equivalent (see src/app/index.tsx's ringDurationMs). workSec never
  // changes between baseBikeConfig and bikeConfig (withoutDrill only
  // touches rest), so either would do here.
  const ringDurationMs = phaseDurationMs ?? baseBikeConfig.workSec * 1000;

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
        ) : phase === "drill" ? (
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
          structurally has a drill -- Lactic Capacity has nothing to pick,
          since its rest is already too short for one. */}
      {showStart && templateDrill !== null ? (
        <View style={styles.picker}>
          <DrillModePicker value={drillChoice} onChange={setDrillChoice} />
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
