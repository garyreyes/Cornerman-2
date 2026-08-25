import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";

interface AddPunchRowProps {
  /** Suggested next-unused number, shown pre-filled but editable -- the
   * user can override it (e.g. to recreate a deleted punch at its
   * original number) rather than always taking whatever's next
   * (2026-08-25 feedback: "jab becoming 1" instead of just landing at 8). */
  defaultNum: number;
  onAdd: (name: string, num: number) => void;
}

/** "Saved immediately -- no generation step" (docs/user-flows.md Flow 4). */
export function AddPunchRow({ defaultNum, onAdd }: AddPunchRowProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [name, setName] = useState("");
  const [numDraft, setNumDraft] = useState(String(defaultNum));

  // Resync the suggested number when it advances from outside (e.g. right
  // after adding a punch, the parent recomputes the next suggestion) --
  // same adjust-during-render pattern PunchRow uses for its own drafts.
  const [lastSyncedDefault, setLastSyncedDefault] = useState(defaultNum);
  if (defaultNum !== lastSyncedDefault) {
    setLastSyncedDefault(defaultNum);
    setNumDraft(String(defaultNum));
  }

  function handleAdd() {
    const trimmed = name.trim();
    if (trimmed === "") {
      return;
    }
    const parsedNum = Number.parseInt(numDraft, 10);
    onAdd(trimmed, Number.isNaN(parsedNum) ? defaultNum : parsedNum);
    setName("");
  }

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.numInput}
        value={numDraft}
        onChangeText={setNumDraft}
        keyboardType="number-pad"
        placeholder="#"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Number for the new punch"
      />
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleAdd}
        placeholder="New punch name"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
      />
      <Pressable
        onPress={handleAdd}
        disabled={name.trim() === ""}
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.pressed,
          name.trim() === "" && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add punch"
      >
        <Text style={styles.addLabel}>ADD</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    numInput: {
      width: 44,
      fontFamily: fonts.numericSemiBold,
      fontSize: 15,
      color: colors.accent,
      textAlign: "center",
      // paddingVertical raised from 10 -- combined with the 18px numeral
      // line height, 10 measured out to ~38px, under the 44pt touch-target
      // minimum (found 2026-08-25 via /impeccable critique).
      paddingVertical: 13,
      borderRadius: 6,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    input: {
      flex: 1,
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
    addButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 6,
      backgroundColor: colors.accent,
    },
    pressed: {
      opacity: 0.8,
    },
    disabled: {
      opacity: 0.4,
    },
    addLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      letterSpacing: 1,
      color: colors.background,
    },
  });
}
