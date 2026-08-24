import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resolvePunchName } from "../../../features/comboEngine/service";
import { PresetRow } from "../../../features/settings/components/PresetRow";
import { deletePreset, getPresets, getPunches, getSettings, saveSettings } from "../../../features/settings/service";
import type { Preset, Punch, Settings } from "../../../features/settings/types";
import { theme } from "../../../features/session/theme";

function summarizeSequence(sequence: number[], punches: Punch[]): string {
  if (sequence.length === 0) {
    return "No punches yet";
  }
  return sequence.map((num) => resolvePunchName(punches, num).name).join(" → ");
}

/**
 * Presets List (docs/user-flows.md Flow 5). Tapping a row's body opens the
 * Editor; the separate radio control per row picks `Settings.activePresetId`
 * (confirmed choice -- Flow 5 never actually says how the active preset
 * gets chosen, only how presets get created/edited, so this needed an
 * explicit decision rather than a silent one -- see PROJECT_FACTS.md).
 */
export function PresetsListScreen() {
  const router = useRouter();
  const [presets, setPresets] = useState<Preset[]>(() => getPresets());
  const [punches, setPunches] = useState<Punch[]>(() => getPunches());
  const [settings, setSettings] = useState<Settings>(() => getSettings());

  useFocusEffect(
    useCallback(() => {
      setPresets(getPresets());
      setPunches(getPunches());
      setSettings(getSettings());
    }, []),
  );

  // Functional updaters throughout (matches settings/index.tsx's
  // handleChange) -- two of these rows' Pressables firing in the same
  // batch (e.g. near-simultaneous multi-touch on one row's activate
  // control and another row's delete button) must resolve against each
  // other's actual latest state, not two closures both holding the
  // pre-batch `settings`, or one write can silently clobber the other.
  function handleActivate(id: string) {
    setSettings((prev) => {
      const next = { ...prev, activePresetId: id };
      saveSettings(next);
      return next;
    });
  }

  function handleDelete(id: string) {
    deletePreset(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
    setSettings((prev) => {
      if (prev.activePresetId !== id) {
        return prev;
      }
      const next = { ...prev, activePresetId: null };
      saveSettings(next);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.push({ pathname: "/settings/presets/[id]", params: { id: "new" } })}
          style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="New preset"
        >
          <Text style={styles.newButtonLabel}>+ NEW PRESET</Text>
        </Pressable>

        {presets.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No presets yet.</Text>
          </View>
        ) : (
          presets.map((preset) => (
            <PresetRow
              key={preset.id}
              name={preset.name}
              summary={summarizeSequence(preset.sequence, punches)}
              isActive={preset.id === settings.activePresetId}
              onActivate={() => handleActivate(preset.id)}
              onPress={() => router.push({ pathname: "/settings/presets/[id]", params: { id: preset.id } })}
              onDelete={() => handleDelete(preset.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default PresetsListScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  newButton: {
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.brassAmber,
    alignItems: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  newButtonLabel: {
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 14,
    letterSpacing: 1,
    color: theme.colors.background,
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.enamelMuted,
  },
});
