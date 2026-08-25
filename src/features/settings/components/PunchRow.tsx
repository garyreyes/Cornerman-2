import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";
import { previewPunchName } from "../previewEngine";
import type { Punch } from "../types";

interface PunchRowProps {
  punch: Punch;
  /** Whether `punch.num` is currently eligible for Random mode's draw --
   * see settings/service.ts's isPunchIncludedInRandomPool. */
  includedInRandomPool: boolean;
  onRename: (id: string, name: string) => void;
  onRenumber: (id: string, num: number) => void;
  onDelete: (id: string) => void;
  onToggleRandomPool: (num: number) => void;
}

const PREVIEW_ERROR_TIMEOUT_MS = 2500;

/**
 * One punch: inline-editable num + name (both commit on blur, matching
 * the range sliders' commit-on-release spirit rather than saving every
 * keystroke) + Preview (non-blocking live playback) + a "random draws"
 * toggle + Delete. Numbers were originally fixed at creation (extraction
 * doc §1.6), reversed 2026-08-25 after real use surfaced the actual need
 * -- recreating a deleted punch at its original number, not just
 * whatever's next-unused. `num` still isn't required to be unique (same
 * as before); a Preset referencing a number that moves away from this
 * punch degrades to `resolvePunchName`'s generic fallback rather than
 * breaking (PROJECT_FACTS.md).
 */
export function PunchRow({
  punch,
  includedInRandomPool,
  onRename,
  onRenumber,
  onDelete,
  onToggleRandomPool,
}: PunchRowProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  // Resync the draft when `punch.name`/`punch.num` change from outside this
  // row's own edit (e.g. the trimmed value committed on blur flowing back
  // down as a new prop) -- adjusted during render per React's documented
  // pattern for this, not via an effect (which would cost an extra render
  // pass).
  const [lastSyncedName, setLastSyncedName] = useState(punch.name);
  const [draftName, setDraftName] = useState(punch.name);
  if (punch.name !== lastSyncedName) {
    setLastSyncedName(punch.name);
    setDraftName(punch.name);
  }

  const [lastSyncedNum, setLastSyncedNum] = useState(punch.num);
  const [draftNum, setDraftNum] = useState(String(punch.num));
  if (punch.num !== lastSyncedNum) {
    setLastSyncedNum(punch.num);
    setDraftNum(String(punch.num));
  }

  const [previewFailed, setPreviewFailed] = useState(false);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current !== null) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  function handleBlur() {
    const trimmed = draftName.trim();
    if (trimmed !== "" && trimmed !== punch.name) {
      onRename(punch.id, trimmed);
    } else {
      setDraftName(punch.name);
    }
  }

  function handleNumBlur() {
    const parsed = Number.parseInt(draftNum, 10);
    if (Number.isNaN(parsed)) {
      setDraftNum(String(punch.num));
      return;
    }
    if (parsed !== punch.num) {
      onRenumber(punch.id, parsed);
    } else {
      setDraftNum(String(parsed));
    }
  }

  function handlePreview() {
    const trimmed = draftName.trim();
    if (trimmed === "") {
      return;
    }
    const succeeded = previewPunchName(trimmed);
    if (!succeeded) {
      setPreviewFailed(true);
      if (previewTimeoutRef.current !== null) {
        clearTimeout(previewTimeoutRef.current);
      }
      previewTimeoutRef.current = setTimeout(() => setPreviewFailed(false), PREVIEW_ERROR_TIMEOUT_MS);
    }
  }

  const canPreview = draftName.trim() !== "";

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.numInput}
        value={draftNum}
        onChangeText={setDraftNum}
        onBlur={handleNumBlur}
        keyboardType="number-pad"
        placeholder="#"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={`Number for ${punch.name}`}
      />
      <TextInput
        style={styles.nameInput}
        value={draftName}
        onChangeText={setDraftName}
        onBlur={handleBlur}
        placeholder="Punch name"
        placeholderTextColor={colors.textMuted}
      />
      <Switch
        value={includedInRandomPool}
        onValueChange={() => onToggleRandomPool(punch.num)}
        trackColor={{ false: colors.panelLine, true: colors.accentDim }}
        thumbColor={includedInRandomPool ? colors.accent : colors.textMuted}
        accessibilityLabel={`Include ${punch.name} in random draws`}
      />
      <Pressable
        onPress={handlePreview}
        disabled={!canPreview}
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, !canPreview && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`Preview ${punch.name}`}
      >
        <Text style={styles.previewGlyph}>▶</Text>
      </Pressable>
      <Pressable
        onPress={() => onDelete(punch.id)}
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${punch.name}`}
      >
        <Text style={styles.deleteGlyph}>✕</Text>
      </Pressable>
      {previewFailed ? <Text style={styles.error}>Couldn&apos;t preview this name</Text> : null}
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    numInput: {
      width: 44,
      fontFamily: fonts.numericSemiBold,
      fontSize: 15,
      color: colors.accent,
      textAlign: "center",
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    nameInput: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.textPrimary,
      paddingVertical: 6,
      paddingHorizontal: 10,
      minWidth: 100,
      // Bordered box, matching AddPunchRow's "New punch name" field --
      // plain unbordered text here read as static/non-interactive
      // (user feedback 2026-08-25: "entries are not editable").
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    iconButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.6,
    },
    disabled: {
      opacity: 0.35,
    },
    previewGlyph: {
      fontSize: 15,
      color: colors.accent,
    },
    deleteGlyph: {
      fontSize: 15,
      color: colors.textMuted,
    },
    error: {
      width: "100%",
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.danger,
    },
  });
}
