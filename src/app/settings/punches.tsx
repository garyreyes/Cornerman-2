import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddPunchRow } from "../../features/settings/components/AddPunchRow";
import { PunchRow } from "../../features/settings/components/PunchRow";
import { UndoBanner } from "../../features/settings/components/UndoBanner";
import { disposePreviewEngine, initPreviewEngine } from "../../features/settings/previewEngine";
import {
  LastPunchError,
  createPunch,
  deletePunch,
  getPunches,
  getSettings,
  isPunchIncludedInRandomPool,
  renamePunch,
  renumberPunch,
  restoreDefaultPunches,
  restorePunch,
  toggleRandomPoolMembership,
} from "../../features/settings/service";
import type { Punch } from "../../features/settings/types";
import { useTheme } from "../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../shared/theme/tokens";

const UNDO_TIMEOUT_MS = 5000;

interface LastDeleted {
  punch: Punch;
  index: number;
}

/**
 * Add/rename/delete + non-blocking Preview (docs/user-flows.md Flow 4),
 * a per-row "include in random draws" toggle, and delete recovery via an
 * Undo banner plus a "Restore defaults" escape hatch (both confirmed
 * 2026-08-25 after user feedback that a deleted punch had no way back).
 * `num` is never user-facing here -- a new punch gets the next unused
 * number automatically, matching how the old app's rename flow only ever
 * wrote the name field (extraction doc §1.6). The last-punch delete guard
 * (LastPunchError) already exists in settings/service.ts from Phase 1b.
 */
export function PunchesScreen() {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [punches, setPunches] = useState<Punch[]>(() => getPunches());
  const [randomPunchPool, setRandomPunchPool] = useState<number[] | null>(() => getSettings().randomPunchPool);
  const [lastDeleted, setLastDeleted] = useState<LastDeleted | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preview's engine is scoped to this screen's lifetime, not the app's --
  // see previewEngine.ts for why (a real native AudioContext, released on
  // unmount rather than left open for the rest of the process).
  useEffect(() => {
    initPreviewEngine();
    return () => disposePreviewEngine();
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current !== null) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  function handleRename(id: string, name: string) {
    renamePunch(id, name);
    setPunches((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function handleRenumber(id: string, num: number) {
    renumberPunch(id, num);
    setPunches((prev) => prev.map((p) => (p.id === id ? { ...p, num } : p)));
  }

  function handleToggleRandomPool(num: number) {
    toggleRandomPoolMembership(num);
    setRandomPunchPool(getSettings().randomPunchPool);
  }

  function armUndo(entry: LastDeleted) {
    if (undoTimeoutRef.current !== null) {
      clearTimeout(undoTimeoutRef.current);
    }
    setLastDeleted(entry);
    undoTimeoutRef.current = setTimeout(() => setLastDeleted(null), UNDO_TIMEOUT_MS);
  }

  function handleDelete(id: string) {
    const index = punches.findIndex((p) => p.id === id);
    if (index === -1) {
      return;
    }
    const punch = punches[index]!;
    try {
      deletePunch(id);
    } catch (error) {
      if (error instanceof LastPunchError) {
        Alert.alert("At least one punch is required");
        return;
      }
      throw error;
    }
    setPunches((prev) => prev.filter((p) => p.id !== id));
    armUndo({ punch, index });
  }

  function handleUndo() {
    if (lastDeleted === null) {
      return;
    }
    if (undoTimeoutRef.current !== null) {
      clearTimeout(undoTimeoutRef.current);
    }
    restorePunch(lastDeleted.punch, lastDeleted.index);
    setPunches((prev) => {
      const next = [...prev];
      next.splice(Math.min(lastDeleted.index, next.length), 0, lastDeleted.punch);
      return next;
    });
    setLastDeleted(null);
  }

  function handleAdd(name: string, num: number) {
    const punch = createPunch(name, num);
    setPunches((prev) => [...prev, punch]);
  }

  function handleRestoreDefaults() {
    Alert.alert(
      "Restore default punches?",
      "This replaces your current list with the original 7 punches. Custom punches you've added will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: () => {
            const defaults = restoreDefaultPunches();
            setPunches(defaults);
            setRandomPunchPool(getSettings().randomPunchPool);
            setLastDeleted(null);
          },
        },
      ],
    );
  }

  const nextNum = punches.reduce((max, p) => Math.max(max, p.num), 0) + 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {punches.map((punch) => (
          <PunchRow
            key={punch.id}
            punch={punch}
            includedInRandomPool={isPunchIncludedInRandomPool(randomPunchPool, punch.num)}
            onRename={handleRename}
            onRenumber={handleRenumber}
            onDelete={handleDelete}
            onToggleRandomPool={handleToggleRandomPool}
          />
        ))}
        <AddPunchRow defaultNum={nextNum} onAdd={handleAdd} />
        {lastDeleted !== null ? (
          <UndoBanner message={`${lastDeleted.punch.name} deleted`} onUndo={handleUndo} />
        ) : null}
        <Pressable
          onPress={handleRestoreDefaults}
          hitSlop={8}
          style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Restore default punches"
        >
          <Text style={styles.restoreLabel}>RESTORE DEFAULTS</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export default PunchesScreen;

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
    restoreButton: {
      alignItems: "center",
      paddingVertical: 12,
      marginTop: 8,
    },
    pressed: {
      opacity: 0.6,
    },
    restoreLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      letterSpacing: 1,
      color: colors.textMuted,
    },
  });
}
