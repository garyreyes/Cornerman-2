import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resolvePunchName } from "../../../features/comboEngine/service";
import { AddToSequenceRow } from "../../../features/settings/components/AddToSequenceRow";
import { PresetSequenceEntry } from "../../../features/settings/components/PresetSequenceEntry";
import { createPreset, getPresets, getPunches, updatePreset } from "../../../features/settings/service";
import { theme } from "../../../features/session/theme";

/**
 * Preset Editor (docs/user-flows.md Flow 5): name field + ordered sequence
 * builder (pick punches in order, reorder, remove, save). `id === "new"`
 * is the create-mode sentinel; anything else looks up an existing preset.
 * Unlike Settings/Punches' autosave, this has an explicit Save button --
 * Flow 5 itself lists "save" as a distinct step, and autosaving a
 * new-preset draft on every keystroke would persist abandoned/partial
 * presets, unlike a punch rename where every intermediate value is already
 * a valid, usable name.
 */
export function PresetEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";

  const [punches] = useState(() => getPunches());
  const [existing] = useState(() => (isNew ? undefined : getPresets().find((p) => p.id === id)));

  const [name, setName] = useState(existing?.name ?? "");
  const [sequence, setSequence] = useState<number[]>(existing?.sequence ?? []);
  const [saveError, setSaveError] = useState(false);

  // Defensive only -- List always passes a valid id for an existing
  // preset, but degrade gracefully rather than editing a phantom preset
  // if one was ever deleted out from under a stale navigation.
  useEffect(() => {
    if (!isNew && existing === undefined) {
      router.back();
    }
  }, [isNew, existing, router]);

  function handleAdd(num: number) {
    setSequence((prev) => [...prev, num]);
  }

  function handleRemove(index: number) {
    setSequence((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMove(index: number, direction: -1 | 1) {
    setSequence((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const moved = next[index]!;
      next[index] = next[target]!;
      next[target] = moved;
      return next;
    });
  }

  const trimmedName = name.trim();
  const canSave = trimmedName !== "" && sequence.length > 0;

  function handleSave() {
    if (!canSave) {
      return;
    }
    try {
      if (isNew) {
        createPreset(trimmedName, sequence);
      } else {
        updatePreset(id, trimmedName, sequence);
      }
      setSaveError(false);
      router.back();
    } catch {
      setSaveError(true);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: isNew ? "NEW PRESET" : "EDIT PRESET" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Preset name"
          placeholderTextColor={theme.colors.enamelMuted}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SEQUENCE</Text>
          {sequence.length === 0 ? (
            <Text style={styles.hint}>Add at least one punch below.</Text>
          ) : (
            <View style={styles.sequenceList}>
              {sequence.map((num, index) => (
                <PresetSequenceEntry
                  key={index}
                  position={index + 1}
                  label={resolvePunchName(punches, num).name}
                  canMoveUp={index > 0}
                  canMoveDown={index < sequence.length - 1}
                  onMoveUp={() => handleMove(index, -1)}
                  onMoveDown={() => handleMove(index, 1)}
                  onRemove={() => handleRemove(index)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ADD A PUNCH</Text>
          <AddToSequenceRow punches={punches} onAdd={handleAdd} />
        </View>

        {saveError ? <Text style={styles.error}>Couldn&apos;t save, try again</Text> : null}

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Save preset"
        >
          <Text style={styles.saveButtonLabel}>SAVE</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export default PresetEditorScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  nameInput: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.enamelWhite,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: theme.colors.panelLine,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: theme.fonts.displaySemiBold,
    fontSize: 13,
    letterSpacing: 2,
    color: theme.colors.brassAmber,
  },
  sequenceList: {
    gap: 6,
  },
  hint: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.enamelMuted,
  },
  error: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 13,
    color: theme.colors.danger,
    textAlign: "center",
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.brassAmber,
    alignItems: "center",
  },
  saveButtonLabel: {
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 15,
    letterSpacing: 2,
    color: theme.colors.background,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
});
