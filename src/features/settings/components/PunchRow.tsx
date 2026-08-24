import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { theme } from "../../session/theme";
import { previewPunchName } from "../previewEngine";
import type { Punch } from "../types";

interface PunchRowProps {
  punch: Punch;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

const PREVIEW_ERROR_TIMEOUT_MS = 2500;

/**
 * One punch: num badge + inline-editable name (commits on blur, matching
 * the range sliders' commit-on-release spirit rather than saving every
 * keystroke) + Preview (non-blocking live playback) + Delete. Renaming
 * only ever touches `name`, never `num` -- no num picker here, matching
 * how the old app's quick-fill dropdown only ever wrote the name field
 * (extraction doc §1.6).
 */
export function PunchRow({ punch, onRename, onDelete }: PunchRowProps) {
  // Resync the draft when `punch.name` changes from outside this row's own
  // edit (e.g. the trimmed value committed on blur flowing back down as a
  // new prop) -- adjusted during render per React's documented pattern for
  // this, not via an effect (which would cost an extra render pass).
  const [lastSyncedName, setLastSyncedName] = useState(punch.name);
  const [draftName, setDraftName] = useState(punch.name);
  if (punch.name !== lastSyncedName) {
    setLastSyncedName(punch.name);
    setDraftName(punch.name);
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
      <Text style={styles.numBadge}>{punch.num}</Text>
      <TextInput
        style={styles.nameInput}
        value={draftName}
        onChangeText={setDraftName}
        onBlur={handleBlur}
        placeholder="Punch name"
        placeholderTextColor={theme.colors.enamelMuted}
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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: theme.colors.panelLine,
  },
  numBadge: {
    fontFamily: theme.fonts.displaySemiBold,
    fontSize: 15,
    color: theme.colors.brassAmber,
    minWidth: 20,
    textAlign: "center",
  },
  nameInput: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.enamelWhite,
    paddingVertical: 4,
    minWidth: 100,
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
    color: theme.colors.brassAmber,
  },
  deleteGlyph: {
    fontSize: 15,
    color: theme.colors.enamelMuted,
  },
  error: {
    width: "100%",
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 12,
    color: theme.colors.danger,
  },
});
