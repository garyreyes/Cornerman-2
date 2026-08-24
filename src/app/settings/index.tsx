import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CombinationsSection } from "../../features/settings/components/CombinationsSection";
import { ComboTimingSection } from "../../features/settings/components/ComboTimingSection";
import { DefenseCuesSection } from "../../features/settings/components/DefenseCuesSection";
import { ModeSection } from "../../features/settings/components/ModeSection";
import { PunchesSection } from "../../features/settings/components/PunchesSection";
import { RoundSection } from "../../features/settings/components/RoundSection";
import { SoundsSection } from "../../features/settings/components/SoundsSection";
import { getPresets, getPunches, getSettings, saveSettings } from "../../features/settings/service";
import type { Settings } from "../../features/settings/types";
import { theme } from "../../features/session/theme";

/**
 * The real Settings form (docs/user-flows.md Flow 3), following the
 * nav-infra pass's placeholder. Section order: Round -> Mode -> Sounds ->
 * Combinations -> Combo Timing -> Defense Cues (new, Phase 5d) -> Punches
 * -- the confirmed extraction-doc §1.14 order, with Defense Cues appended
 * rather than disrupting it. Autosaves on every change (no separate Save
 * button), matching Punches' instant-save precedent -- the native header's
 * back arrow is the screen's only real affordance, consistent with the
 * one-obvious-primary-action rule (there isn't one here beyond "adjust a
 * value").
 */
export function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  // Loaded once on mount, not re-fetched on focus -- fine while 8b/8c are
  // still placeholders with no mutation capability. Once they can actually
  // add/rename/delete a punch or preset, navigating back here will show
  // stale data (this screen's summary rows / punch-pool chips) until 8b/8c
  // add a focus-triggered refresh -- see PROJECT_FACTS.md.
  const [punches] = useState(() => getPunches());
  const [presets] = useState(() => getPresets());

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
      </ScrollView>
    </SafeAreaView>
  );
}

export default SettingsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
});
