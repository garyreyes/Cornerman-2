import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { theme } from "../../session/theme";

interface AddPunchRowProps {
  onAdd: (name: string) => void;
}

/** "Saved immediately -- no generation step" (docs/user-flows.md Flow 4). */
export function AddPunchRow({ onAdd }: AddPunchRowProps) {
  const [name, setName] = useState("");

  function handleAdd() {
    const trimmed = name.trim();
    if (trimmed === "") {
      return;
    }
    onAdd(trimmed);
    setName("");
  }

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleAdd}
        placeholder="New punch name"
        placeholderTextColor={theme.colors.enamelMuted}
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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
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
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: theme.colors.brassAmber,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
  addLabel: {
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 13,
    letterSpacing: 1,
    color: theme.colors.background,
  },
});
