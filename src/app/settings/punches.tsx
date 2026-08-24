import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddPunchRow } from "../../features/settings/components/AddPunchRow";
import { PunchRow } from "../../features/settings/components/PunchRow";
import { disposePreviewEngine, initPreviewEngine } from "../../features/settings/previewEngine";
import { LastPunchError, createPunch, deletePunch, getPunches, renamePunch } from "../../features/settings/service";
import type { Punch } from "../../features/settings/types";
import { useTheme } from "../../shared/theme/ThemeContext";
import type { ColorTokens } from "../../shared/theme/tokens";

/**
 * Add/rename/delete + non-blocking Preview (docs/user-flows.md Flow 4).
 * `num` is never user-facing here -- a new punch gets the next unused
 * number automatically, matching how the old app's rename flow only ever
 * wrote the name field (extraction doc §1.6). The last-punch delete guard
 * (LastPunchError) already exists in settings/service.ts from Phase 1b.
 */
export function PunchesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [punches, setPunches] = useState<Punch[]>(() => getPunches());

  // Preview's engine is scoped to this screen's lifetime, not the app's --
  // see previewEngine.ts for why (a real native AudioContext, released on
  // unmount rather than left open for the rest of the process).
  useEffect(() => {
    initPreviewEngine();
    return () => disposePreviewEngine();
  }, []);

  function handleRename(id: string, name: string) {
    renamePunch(id, name);
    setPunches((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function handleDelete(id: string) {
    try {
      deletePunch(id);
      setPunches((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      if (error instanceof LastPunchError) {
        Alert.alert("At least one punch is required");
      } else {
        throw error;
      }
    }
  }

  function handleAdd(name: string) {
    const nextNum = punches.reduce((max, p) => Math.max(max, p.num), 0) + 1;
    const punch = createPunch(name, nextNum);
    setPunches((prev) => [...prev, punch]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {punches.map((punch) => (
          <PunchRow key={punch.id} punch={punch} onRename={handleRename} onDelete={handleDelete} />
        ))}
        <AddPunchRow onAdd={handleAdd} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default PunchesScreen;

function createStyles(colors: ColorTokens) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      gap: 10,
    },
  });
}
