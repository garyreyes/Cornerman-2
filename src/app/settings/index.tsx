import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppearanceSection } from "../../features/settings/components/AppearanceSection";
import { CombinationsSection } from "../../features/settings/components/CombinationsSection";
import { ComboTimingSection } from "../../features/settings/components/ComboTimingSection";
import { DefenseCuesSection } from "../../features/settings/components/DefenseCuesSection";
import { ModeSection } from "../../features/settings/components/ModeSection";
import { PunchesSection } from "../../features/settings/components/PunchesSection";
import { SectionCard } from "../../shared/components/SectionCard";
import { SummaryRow } from "../../shared/components/SummaryRow";
import { RoundSection } from "../../features/settings/components/RoundSection";
import { SoundsSection } from "../../features/settings/components/SoundsSection";
import { openBackgroundSettings } from "../../features/onboarding/service";
import { getPresets, getPunches, getSettings, saveSettings } from "../../features/settings/service";
import type { Settings } from "../../features/settings/types";
import { useTheme } from "../../shared/theme/ThemeContext";
import type { ColorTokens } from "../../shared/theme/tokens";

/**
 * The real Settings form (docs/user-flows.md Flow 3), following the
 * nav-infra pass's placeholder. Section order: Appearance (new, dark/
 * orange redesign) -> Round -> Mode -> Sounds -> Combinations -> Combo
 * Timing -> Defense Cues (Phase 5d) -> Punches -- the confirmed
 * extraction-doc §1.14 order for everything below Appearance, which leads
 * as an app-level preference distinct from workout config. Autosaves on
 * every change (no separate Save button), matching Punches' instant-save
 * precedent -- the native header's back arrow is the screen's only real
 * affordance, consistent with the one-obvious-primary-action rule (there
 * isn't one here beyond "adjust a value").
 */
export function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [punches, setPunches] = useState(() => getPunches());
  const [presets, setPresets] = useState(() => getPresets());

  // Punches/Presets can be mutated on their own sub-screens (Phase 8b
  // shipped add/rename/delete for punches; 8c does the same for presets,
  // plus setting Settings.activePresetId from the Presets List screen's
  // radio control), and this screen stays mounted underneath them in the
  // stack rather than unmounting -- so a mount-only load would show stale
  // data (the "N defined" summary rows, the Random-mode punch-pool chips,
  // and Combinations' active-preset name) after navigating back. Refetch
  // all three on focus instead. Always safe to overwrite local `settings`
  // with the persisted copy here specifically because this screen
  // autosaves every change immediately -- there's never an unsaved draft
  // to lose.
  useFocusEffect(
    useCallback(() => {
      setSettings(getSettings());
      setPunches(getPunches());
      setPresets(getPresets());
    }, []),
  );

  // Functional updater (matches useSession.ts's established pattern for
  // this exact kind of merge-update) so two onChange calls in the same
  // tick can't have the second one discard the first via a stale closure.
  function handleChange(partial: Partial<Settings>) {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppearanceSection />
        <RoundSection settings={settings} onChange={handleChange} />
        <ModeSection settings={settings} onChange={handleChange} />
        <SoundsSection settings={settings} onChange={handleChange} />
        <CombinationsSection
          settings={settings}
          punches={punches}
          presets={presets}
          onChange={handleChange}
          onOpenPresets={() => router.push("/settings/presets")}
        />
        <ComboTimingSection settings={settings} onChange={handleChange} />
        <DefenseCuesSection settings={settings} onChange={handleChange} />
        <PunchesSection punches={punches} onOpen={() => router.push("/settings/punches")} />
        {/* Last section deliberately: onboarding shows this tour once and
            never again, so this is the only way back to it. */}
        <SectionCard title="HELP">
          <SummaryRow label="How Cornerman works" value="Take the tour" onPress={() => router.push("/settings/tour")} />
          <SummaryRow
            label="Combos cutting out mid-round?"
            value="Allow background activity"
            onPress={() => void openBackgroundSettings()}
          />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

export default SettingsScreen;

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      gap: 16,
    },
  });
}
