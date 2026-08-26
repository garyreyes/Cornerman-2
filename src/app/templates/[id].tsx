import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RoundCard } from "../../features/workoutTemplates/components/RoundCard";
import { createWorkoutTemplate, getWorkoutTemplates, updateWorkoutTemplate } from "../../features/workoutTemplates/service";
import type { BoxingConfig, RoundConfig } from "../../features/workoutTemplates/types";
import { getPresets, getPunches } from "../../features/settings/service";
import { formatSeconds, range } from "../../features/settings/format";
import { RangeSliderPair } from "../../shared/components/RangeSliderPair";
import { SectionCard } from "../../shared/components/SectionCard";
import { WheelPicker } from "../../shared/components/WheelPicker";
import { useTheme } from "../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../shared/theme/tokens";

const WORK_VALUES = range(0, 600, 5);
const REST_VALUES = range(0, 300, 5);
const WARMUP_VALUES = range(0, 120, 5);

/**
 * Round Builder / Template Editor (docs/user-flows.md Flow 6, Phase 10c).
 * `id === "new"` is the create-mode sentinel, mirroring Preset Editor
 * exactly -- name + base pace fields + an inline scrollable list of
 * expandable round cards (add/reorder/remove/edit in place, never a
 * per-round sub-screen), explicit Save button. No delete here (or on the
 * Picker) yet -- Flow 6 doesn't call for one; same deliberate deferral
 * noted in PROJECT_FACTS.md for 10b, revisit once real use surfaces the
 * need, matching how Punches/Presets only grew delete+Undo after
 * on-device feedback.
 */
export function TemplateEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const isNew = id === "new";

  const [punches] = useState(() => getPunches());
  const [presets] = useState(() => getPresets());
  // Narrowed to the boxing variant right here, not just looked up --
  // this editor is boxing-only (Round Builder has no assault-bike
  // equivalent yet), so a non-boxing match resolves to undefined exactly
  // like a missing one, and the guard effect below redirects back either
  // way (defense-in-depth: the Picker already prevents navigating here
  // for a non-boxing template -- see templates/index.tsx's handleEdit).
  const [existing] = useState(() => {
    if (isNew) {
      return undefined;
    }
    const found = getWorkoutTemplates().find((t) => t.id === id);
    return found?.workoutType === "boxing" ? found : undefined;
  });

  const [name, setName] = useState(existing?.name ?? "");
  const [baseWorkDurationSec, setBaseWorkDurationSec] = useState(existing?.config.baseWorkDurationSec ?? 180);
  const [baseRestDurationSec, setBaseRestDurationSec] = useState(existing?.config.baseRestDurationSec ?? 60);
  const [warmupDurationSec, setWarmupDurationSec] = useState(existing?.config.warmupDurationSec ?? 0);
  const [baseComboGapMinSec, setBaseComboGapMinSec] = useState(existing?.config.baseComboGapMinSec ?? 1.5);
  const [baseComboGapMaxSec, setBaseComboGapMaxSec] = useState(existing?.config.baseComboGapMaxSec ?? 3);
  const [roundPlan, setRoundPlan] = useState<RoundConfig[]>(existing?.config.roundPlan ?? []);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);

  // Defensive only -- List always passes a valid id, but degrade gracefully
  // rather than editing a phantom template if one was ever deleted out
  // from under a stale navigation (mirrors Preset Editor's own guard).
  useEffect(() => {
    if (!isNew && existing === undefined) {
      router.back();
    }
  }, [isNew, existing, router]);

  function handleAddRound() {
    setRoundPlan((prev) => {
      const next: RoundConfig[] = [...prev, { comboSource: { type: "random" } }];
      setExpandedIndex(next.length - 1);
      return next;
    });
  }

  function handleChangeRound(index: number, round: RoundConfig) {
    setRoundPlan((prev) => prev.map((r, i) => (i === index ? round : r)));
  }

  function handleRemoveRound(index: number) {
    setRoundPlan((prev) => prev.filter((_, i) => i !== index));
    setExpandedIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  }

  function handleMoveRound(index: number, direction: -1 | 1) {
    const target = index + direction;
    setRoundPlan((prev) => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const moved = next[index]!;
      next[index] = next[target]!;
      next[target] = moved;
      return next;
    });
    setExpandedIndex((prev) => {
      if (prev === index) return target;
      if (prev === target) return index;
      return prev;
    });
  }

  const trimmedName = name.trim();
  const canSave = trimmedName !== "" && roundPlan.length > 0;

  function handleSave() {
    if (!canSave) {
      return;
    }
    const config: BoxingConfig = {
      baseWorkDurationSec,
      baseRestDurationSec,
      warmupDurationSec,
      baseComboGapMinSec,
      baseComboGapMaxSec,
      roundPlan,
    };
    try {
      if (isNew) {
        createWorkoutTemplate(trimmedName, config);
      } else {
        updateWorkoutTemplate(id, trimmedName, config);
      }
      setSaveError(false);
      router.back();
    } catch {
      setSaveError(true);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: isNew ? "NEW TEMPLATE" : "EDIT TEMPLATE" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Template name"
          placeholderTextColor={colors.textMuted}
        />

        <SectionCard title="BASE PACE">
          <View style={styles.row}>
            <WheelPicker
              label="Work"
              value={baseWorkDurationSec}
              values={WORK_VALUES}
              formatValue={formatSeconds}
              onChange={setBaseWorkDurationSec}
            />
            <WheelPicker
              label="Rest"
              value={baseRestDurationSec}
              values={REST_VALUES}
              formatValue={formatSeconds}
              onChange={setBaseRestDurationSec}
            />
            <WheelPicker
              label="Warmup"
              value={warmupDurationSec}
              values={WARMUP_VALUES}
              formatValue={formatSeconds}
              onChange={setWarmupDurationSec}
            />
          </View>
          <RangeSliderPair
            title="Combo gap"
            minLabel="Min gap"
            maxLabel="Max gap"
            minValue={baseComboGapMinSec}
            maxValue={baseComboGapMaxSec}
            bounds={[0.5, 10]}
            step={0.1}
            formatValue={(v) => `${v.toFixed(1)}s`}
            onChange={(min, max) => {
              setBaseComboGapMinSec(min);
              setBaseComboGapMaxSec(max);
            }}
          />
        </SectionCard>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ROUNDS</Text>
          {roundPlan.length === 0 ? <Text style={styles.hint}>Add at least one round below.</Text> : null}
          <View style={styles.roundList}>
            {roundPlan.map((round, index) => (
              <RoundCard
                key={index}
                round={round}
                index={index}
                isExpanded={expandedIndex === index}
                punches={punches}
                presets={presets}
                canMoveUp={index > 0}
                canMoveDown={index < roundPlan.length - 1}
                onToggleExpand={() => setExpandedIndex((prev) => (prev === index ? null : index))}
                onChange={(next) => handleChangeRound(index, next)}
                onRemove={() => handleRemoveRound(index)}
                onMoveUp={() => handleMoveRound(index, -1)}
                onMoveDown={() => handleMoveRound(index, 1)}
              />
            ))}
          </View>
          <Pressable
            onPress={handleAddRound}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Add round"
          >
            <Text style={styles.addButtonLabel}>+ ADD ROUND</Text>
          </Pressable>
        </View>

        {saveError ? <Text style={styles.error}>Couldn&apos;t save, try again</Text> : null}

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Save template"
        >
          <Text style={styles.saveButtonLabel}>SAVE</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export default TemplateEditorScreen;

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      gap: 20,
    },
    nameInput: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.textPrimary,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    row: {
      flexDirection: "row",
      gap: 8,
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 13,
      letterSpacing: 2,
      color: colors.accent,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
    },
    roundList: {
      gap: 10,
    },
    addButton: {
      paddingVertical: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.accentDim,
      alignItems: "center",
    },
    addButtonLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      letterSpacing: 1,
      color: colors.accent,
    },
    error: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.danger,
      textAlign: "center",
    },
    saveButton: {
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    saveButtonLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      letterSpacing: 2,
      color: colors.background,
    },
    saveButtonDisabled: {
      opacity: 0.4,
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
