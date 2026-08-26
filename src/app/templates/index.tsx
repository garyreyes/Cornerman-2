import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { InfoBanner } from "../../features/workoutTemplates/components/InfoBanner";
import { TemplateRow } from "../../features/workoutTemplates/components/TemplateRow";
import { summarizeBoxingConfig } from "../../features/workoutTemplates/format";
import { getWorkoutTemplates } from "../../features/workoutTemplates/service";
import type { WorkoutTemplate } from "../../features/workoutTemplates/types";
import { useTheme } from "../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../shared/theme/tokens";

const INFO_TIMEOUT_MS = 3000;

/**
 * Templates Picker (docs/user-flows.md Flow 6). Tapping a row starts that
 * template directly; the separate Edit icon opens the Round Builder
 * (Phase 10c, now real). Tap-to-start is still stubbed to an info banner
 * -- wiring the timer engine to actually run a `roundPlan` is Phase 10d,
 * not built yet, so pretending it does something real would be worse
 * than an honest "not yet" -- see ROADMAP.md.
 */
export function TemplatesPickerScreen() {
  const router = useRouter();
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => getWorkoutTemplates());
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const infoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      setTemplates(getWorkoutTemplates());
    }, []),
  );

  useEffect(() => {
    return () => {
      if (infoTimeoutRef.current !== null) {
        clearTimeout(infoTimeoutRef.current);
      }
    };
  }, []);

  function showComingSoon(message: string) {
    if (infoTimeoutRef.current !== null) {
      clearTimeout(infoTimeoutRef.current);
    }
    setInfoMessage(message);
    infoTimeoutRef.current = setTimeout(() => setInfoMessage(null), INFO_TIMEOUT_MS);
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
            onPress={() => showComingSoon("Starting from a template is coming soon")}
            onEdit={() => router.push({ pathname: "/templates/[id]", params: { id: template.id } })}
          />
        ))}

        {infoMessage !== null ? <InfoBanner message={infoMessage} /> : null}
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
