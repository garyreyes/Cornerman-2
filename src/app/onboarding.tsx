/**
 * (Same contract src/app/index.tsx opens with, per docs/design-direction.md
 * -- this is the app's first screen chronologically (first launch only)
 * but inherits the same redesigned world, not a new one. See index.tsx's
 * opening comment for the full THESIS/OWN-WORLD/STORY/FORM/FINISH record.)
 *
 * Flow (docs/user-flows.md Flow 1): intro explainer -> Android 13+ system
 * notification permission dialog (iOS has no runtime prompt for this) ->
 * battery-optimization tip (only shown if that permission was granted) ->
 * orientation tour -> done. A denial doesn't block anything -- proceeds
 * straight to the tour per Flow 1's proposed default. router.replace (not
 * push) back to "/" so there's no back-stack entry pointing back here once
 * done, matching Flow 1's "never shown again" behavior.
 *
 * The tour comes last, after the permission business rather than before
 * it: the intro card exists to justify the system dialog it triggers, and
 * putting three feature cards between the two would separate the reason
 * from the ask. It also means the last thing seen before landing on Main
 * Timer is what the app does, not a settings detour.
 */
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestNotificationPermission } from "../lib/backgroundAudio";
import { TourPager } from "../features/onboarding/components/TourPager";
import { openBackgroundSettings } from "../features/onboarding/service";
import { markOnboardingComplete } from "../features/settings/service";
import { useTheme } from "../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../shared/theme/tokens";

type Step = "intro" | "batteryTip" | "tour";

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [step, setStep] = useState<Step>("intro");

  const finish = () => {
    markOnboardingComplete();
    router.replace("/");
  };

  const handleContinue = async () => {
    if (Platform.OS !== "android") {
      setStep("tour");
      return;
    }
    const granted = await requestNotificationPermission();
    setStep(granted ? "batteryTip" : "tour");
  };

  if (step === "tour") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <TourPager finishLabel="START TRAINING" onFinish={finish} onSkip={finish} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.center}>
        {step === "intro" ? (
          <>
            <Text style={styles.title}>THE BELL KEEPS RINGING</Text>
            <Text style={styles.body}>
              Cornerman calls your combos and rings the bell even with your screen off or another app open — like a
              corner-man who doesn&apos;t stop working the moment you look away. On Android, allowing notifications
              keeps that reliable.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>ONE MORE THING</Text>
            <Text style={styles.body}>
              Some phones aggressively shut down background apps to save battery. If combos cut out mid-round, allow
              Cornerman to run in the background.
            </Text>
            <Pressable onPress={() => void openBackgroundSettings()} accessibilityRole="button">
              <Text style={styles.link}>Allow Background Activity</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={step === "intro" ? handleContinue : () => setStep("tour")}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={step === "intro" ? "Continue" : "Got it"}
        >
          <Text style={styles.primaryLabel}>{step === "intro" ? "CONTINUE" : "GOT IT"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      paddingHorizontal: 32,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 32,
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
    link: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      letterSpacing: 1,
      color: colors.accent,
      textAlign: "center",
      marginTop: 4,
    },
    bottom: {
      paddingHorizontal: 24,
      paddingBottom: 24,
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
    pressed: {
      opacity: 0.8,
    },
  });
}
