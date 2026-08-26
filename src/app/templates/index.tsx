import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TemplateRow } from "../../features/workoutTemplates/components/TemplateRow";
import { summarizeAssaultBikeConfig, summarizeBoxingConfig } from "../../features/workoutTemplates/format";
import { setPendingTemplateStart } from "../../features/workoutTemplates/pendingStart";
import { getWorkoutTemplates } from "../../features/workoutTemplates/service";
import type { WorkoutTemplate } from "../../features/workoutTemplates/types";
import { useTheme } from "../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../shared/theme/tokens";

function summarize(template: WorkoutTemplate): string {
  return template.workoutType === "boxing"
    ? summarizeBoxingConfig(template.config)
    : summarizeAssaultBikeConfig(template.config);
}

/**
 * Templates Picker (docs/user-flows.md Flow 6). Tapping a row starts that
 * template directly -- no forced preview step. Boxing templates leave a
 * "start this" signal (see workoutTemplates/pendingStart.ts) and pop
 * back to the already-mounted Main Timer, which consumes it on focus;
 * assault-bike templates push the Assault-Bike Session screen directly
 * (Phase 11b) -- no always-mounted instance to pop back to, so a normal
 * push is the right call there, unlike boxing's pop-back. The Edit icon
 * only opens the Round Builder (Phase 10c) for boxing templates --
 * there's no assault-bike editor (not a planned Phase 11 deliverable),
 * so TemplateRow renders that icon disabled for those rows instead of
 * routing somewhere that would crash.
 */
export function TemplatesPickerScreen() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => getWorkoutTemplates());

  useFocusEffect(
    useCallback(() => {
      setTemplates(getWorkoutTemplates());
    }, []),
  );

  function handleStart(template: WorkoutTemplate) {
    if (template.workoutType === "boxing") {
      setPendingTemplateStart(template.id);
      router.back();
    } else {
      router.push({ pathname: "/assault-bike", params: { templateId: template.id } });
    }
  }

  function handleEdit(template: WorkoutTemplate) {
    if (template.workoutType !== "boxing") {
      return;
    }
    router.push({ pathname: "/templates/[id]", params: { id: template.id } });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={() => router.push({ pathname: "/templates/[id]", params: { id: "new" } })}
          style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="New template"
        >
          <Text style={styles.newButtonLabel}>+ NEW TEMPLATE</Text>
        </Pressable>

        {templates.map((template) => (
          <TemplateRow
            key={template.id}
            name={template.name}
            summary={summarize(template)}
            isBuiltIn={template.isBuiltIn}
            editDisabled={template.workoutType !== "boxing"}
            onPress={() => handleStart(template)}
            onEdit={() => handleEdit(template)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default TemplatesPickerScreen;

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      gap: 10,
    },
    newButton: {
      paddingVertical: 12,
      borderRadius: 6,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    pressed: {
      opacity: 0.8,
    },
    newButtonLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      letterSpacing: 1,
      color: colors.background,
    },
  });
}
