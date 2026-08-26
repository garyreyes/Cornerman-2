import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TemplateRow } from "../../features/workoutTemplates/components/TemplateRow";
import { summarizeBoxingConfig } from "../../features/workoutTemplates/format";
import { setPendingTemplateStart } from "../../features/workoutTemplates/pendingStart";
import { getWorkoutTemplates } from "../../features/workoutTemplates/service";
import type { WorkoutTemplate } from "../../features/workoutTemplates/types";
import { useTheme } from "../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../shared/theme/tokens";

/**
 * Templates Picker (docs/user-flows.md Flow 6). Tapping a row starts that
 * template directly -- no forced preview step -- by leaving a "start
 * this" signal (see workoutTemplates/pendingStart.ts) and popping back to
 * the already-mounted Main Timer, which consumes it on focus. The
 * separate Edit icon opens the Round Builder (Phase 10c).
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
    setPendingTemplateStart(template.id);
    router.back();
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
            summary={summarizeBoxingConfig(template.config)}
            isBuiltIn={template.isBuiltIn}
            onPress={() => handleStart(template)}
            onEdit={() => router.push({ pathname: "/templates/[id]", params: { id: template.id } })}
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
