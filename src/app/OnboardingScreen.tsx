/**
 * THESIS: A timer built to look like what a corner-man actually holds in
 * their hand mid-fight -- an analog stopwatch and a brass ring bell -- not
 * another phone-screen fitness app. Refuses the neon-gradient HIIT-timer
 * default and the sterile wellness-app opposite alike.
 *
 * OWN-WORLD: Gunmetal/brass instrument-panel dark ground. Brass-amber
 * carries every active/interactive element -- the one accent. Enamel-white
 * for secondary labels. Numerals and dial-style display type: Barlow
 * Condensed. Body/label text: Inter.
 *
 * (Same locked contract MainTimerScreen.tsx opens with, per
 * docs/design-direction.md -- this is the app's first screen chronologically
 * (first launch only) but inherits the same world, not a new one.)
 *
 * Flow (docs/user-flows.md Flow 1): intro explainer -> Android 13+ system
 * notification permission dialog (iOS has no runtime prompt for this) ->
 * battery-optimization tip (only shown if that permission was granted) ->
 * done. A denial doesn't block anything -- proceeds straight to done per
 * Flow 1's proposed default.
 */
import { useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestNotificationPermission } from "../lib/backgroundAudio";
import { markOnboardingComplete } from "../features/settings/service";
import { theme } from "../features/session/theme";

type Step = "intro" | "batteryTip";

interface OnboardingScreenProps {
  onDone: () => void;
}

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>("intro");

  const finish = () => {
    markOnboardingComplete();
    onDone();
  };

  const handleContinue = async () => {
    if (Platform.OS !== "android") {
      finish();
      return;
    }
    const granted = await requestNotificationPermission();
    if (granted) {
      setStep("batteryTip");
    } else {
      finish();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.center}>
        {step === "intro" ? (
          <>
            <Text style={styles.title}>THE BELL KEEPS RINGING</Text>
            <Text style={styles.body}>
              Cornerman calls your combos and rings the bell even with your screen off or another app open — like a
              corner-man who doesn&apos;t stop working the moment you look away. On Android, allowing notifications keeps
              that reliable.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>ONE MORE THING</Text>
            <Text style={styles.body}>
              Some phones aggressively shut down background apps to save battery. If combos cut out mid-round, allow
              Cornerman to run in the background in your phone&apos;s battery settings.
            </Text>
            <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button">
              <Text style={styles.link}>Open Settings</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={step === "intro" ? handleContinue : finish}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 32,
    letterSpacing: 1,
    color: theme.colors.enamelWhite,
    textAlign: "center",
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.enamelMuted,
    textAlign: "center",
  },
  link: {
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 14,
    letterSpacing: 1,
    color: theme.colors.brassAmber,
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
    backgroundColor: theme.colors.brassAmber,
    alignItems: "center",
  },
  primaryLabel: {
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 16,
    letterSpacing: 2,
    color: theme.colors.background,
  },
  pressed: {
    opacity: 0.8,
  },
});
