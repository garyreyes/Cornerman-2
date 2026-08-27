import { useMemo } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { AddToSequenceRow } from "../../settings/components/AddToSequenceRow";
import { PresetSequenceEntry } from "../../settings/components/PresetSequenceEntry";
import { formatSeconds, range } from "../../settings/format";
import type { Preset, Punch } from "../../settings/types";
import { ChipMultiSelect } from "../../../shared/components/ChipMultiSelect";
import { RangeSliderPair } from "../../../shared/components/RangeSliderPair";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";
import { WheelPicker } from "../../../shared/components/WheelPicker";
import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ColorTokens, Fonts } from "../../../shared/theme/tokens";
import { roundDisplayLabel, summarizeComboSource } from "../format";
import type { ComboSource, RoundConfig } from "../types";

interface RoundCardProps {
  round: RoundConfig;
  index: number;
  isExpanded: boolean;
  punches: Punch[];
  presets: Preset[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleExpand: () => void;
  onChange: (round: RoundConfig) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const WORK_VALUES = range(0, 600, 5);
const REST_VALUES = range(0, 300, 5);

// Abbreviated to keep five segments legible on a narrow phone -- the
// editor that opens underneath each one says what it is at full length.
const SOURCE_OPTIONS: { value: ComboSource["type"]; label: string }[] = [
  { value: "random", label: "RANDOM" },
  { value: "fixed-punch", label: "FIXED" },
  { value: "fixed-sequence", label: "SEQ" },
  { value: "combo-pool", label: "COMBOS" },
  { value: "preset", label: "PRESET" },
];

/**
 * One round in the Round Builder's inline scrollable list (docs/user-flows.md
 * Flow 6: "each round is an expandable card ... not a per-round sub-screen").
 * Collapsed shows just a summary row; expanded reveals label/note, optional
 * duration/gap overrides (each independently toggleable, mirroring
 * CombinationsSection's "restrict pool" switch pattern -- `undefined` means
 * "use the template's base value"), and the comboSource editor, whose shape
 * changes with the selected type. Reuses PresetSequenceEntry/AddToSequenceRow
 * as-is for the "fixed-sequence" case -- they're generic number-sequence
 * builders, not Preset-specific, so no need to duplicate them here.
 */
export function RoundCard({
  round,
  index,
  isExpanded,
  punches,
  presets,
  canMoveUp,
  canMoveDown,
  onToggleExpand,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: RoundCardProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const hasDurationOverride = round.workDurationSec !== undefined || round.restDurationSec !== undefined;
  const hasGapOverride = round.comboGapMinSec !== undefined || round.comboGapMaxSec !== undefined;
  const source = round.comboSource;

  function updateSource(next: ComboSource) {
    onChange({ ...round, comboSource: next });
  }

  function handleSourceTypeChange(type: ComboSource["type"]) {
    if (type === source.type) return;
    if (type === "random") {
      updateSource({ type: "random" });
    } else if (type === "fixed-punch") {
      updateSource({ type: "fixed-punch", punchNum: punches[0]?.num ?? 1 });
    } else if (type === "fixed-sequence") {
      updateSource({ type: "fixed-sequence", sequence: [] });
    } else if (type === "combo-pool") {
      // Carries an existing single sequence over rather than discarding it --
      // a fixed sequence is exactly a pool of one, so switching should feel
      // like widening what is already there, not starting again.
      updateSource({ type: "combo-pool", combos: source.type === "fixed-sequence" ? [source.sequence] : [[]] });
    } else {
      updateSource({ type: "preset", presetId: presets[0]?.id ?? "" });
    }
  }

  function handleToggleDurationOverride(next: boolean) {
    onChange({
      ...round,
      workDurationSec: next ? (round.workDurationSec ?? WORK_VALUES[0]) : undefined,
      restDurationSec: next ? (round.restDurationSec ?? REST_VALUES[0]) : undefined,
    });
  }

  function handleToggleGapOverride(next: boolean) {
    onChange({
      ...round,
      comboGapMinSec: next ? (round.comboGapMinSec ?? 1.5) : undefined,
      comboGapMaxSec: next ? (round.comboGapMaxSec ?? 3) : undefined,
    });
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          onPress={onToggleExpand}
          style={({ pressed }) => [styles.headerBody, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${isExpanded ? "Collapse" : "Expand"} ${roundDisplayLabel(round, index)}`}
        >
          <Text style={styles.title}>{roundDisplayLabel(round, index)}</Text>
          <Text style={styles.summary} numberOfLines={1}>
            {summarizeComboSource(source, punches, presets)}
          </Text>
        </Pressable>
        <View style={styles.iconGroup}>
          <Pressable
            onPress={onMoveUp}
            disabled={!canMoveUp}
            hitSlop={6}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, !canMoveUp && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={`Move ${roundDisplayLabel(round, index)} up`}
          >
            <Text style={styles.glyph}>▲</Text>
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={!canMoveDown}
            hitSlop={6}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, !canMoveDown && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={`Move ${roundDisplayLabel(round, index)} down`}
          >
            <Text style={styles.glyph}>▼</Text>
          </Pressable>
          <Pressable
            onPress={onRemove}
            hitSlop={6}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${roundDisplayLabel(round, index)}`}
          >
            <Text style={styles.deleteGlyph}>✕</Text>
          </Pressable>
        </View>
      </View>

      {isExpanded ? (
        <View style={styles.body}>
          <TextInput
            style={styles.input}
            value={round.label ?? ""}
            onChangeText={(label) => onChange({ ...round, label })}
            placeholder={`Label (optional, defaults to "Round ${index + 1}")`}
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={round.note ?? ""}
            onChangeText={(note) => onChange({ ...round, note })}
            placeholder="Coaching note shown on screen during this round (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Override work/rest for this round</Text>
            <Switch
              value={hasDurationOverride}
              onValueChange={handleToggleDurationOverride}
              trackColor={{ false: colors.panelLine, true: colors.accentDim }}
              thumbColor={hasDurationOverride ? colors.accent : colors.textMuted}
              accessibilityLabel="Override work and rest duration for this round"
            />
          </View>
          {hasDurationOverride ? (
            <View style={styles.row}>
              <WheelPicker
                label="Work"
                value={round.workDurationSec ?? WORK_VALUES[0]!}
                values={WORK_VALUES}
                formatValue={formatSeconds}
                onChange={(workDurationSec) => onChange({ ...round, workDurationSec })}
              />
              <WheelPicker
                label="Rest"
                value={round.restDurationSec ?? REST_VALUES[0]!}
                values={REST_VALUES}
                formatValue={formatSeconds}
                onChange={(restDurationSec) => onChange({ ...round, restDurationSec })}
              />
            </View>
          ) : null}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Override combo gap for this round</Text>
            <Switch
              value={hasGapOverride}
              onValueChange={handleToggleGapOverride}
              trackColor={{ false: colors.panelLine, true: colors.accentDim }}
              thumbColor={hasGapOverride ? colors.accent : colors.textMuted}
              accessibilityLabel="Override combo gap for this round"
            />
          </View>
          {hasGapOverride ? (
            <RangeSliderPair
              title="Combo gap"
              minLabel="Min gap"
              maxLabel="Max gap"
              minValue={round.comboGapMinSec ?? 1.5}
              maxValue={round.comboGapMaxSec ?? 3}
              bounds={[0.5, 10]}
              step={0.1}
              formatValue={(v) => `${v.toFixed(1)}s`}
              onChange={(comboGapMinSec, comboGapMaxSec) => onChange({ ...round, comboGapMinSec, comboGapMaxSec })}
            />
          ) : null}

          <Text style={styles.sectionTitle}>COMBO SOURCE</Text>
          <SegmentedControl options={SOURCE_OPTIONS} value={source.type} onChange={handleSourceTypeChange} />

          {source.type === "random" ? (
            <RandomSourceEditor source={source} punches={punches} onChange={updateSource} />
          ) : null}
          {source.type === "fixed-punch" ? (
            <WheelPicker
              label="Punch"
              value={source.punchNum}
              values={punches.map((p) => p.num)}
              formatValue={(num) => punches.find((p) => p.num === num)?.name ?? `Punch ${num}`}
              onChange={(punchNum) => updateSource({ type: "fixed-punch", punchNum })}
            />
          ) : null}
          {source.type === "fixed-sequence" ? (
            <SequenceSourceEditor source={source} punches={punches} onChange={updateSource} />
          ) : null}
          {source.type === "combo-pool" ? (
            <ComboPoolSourceEditor source={source} punches={punches} onChange={updateSource} />
          ) : null}
          {source.type === "preset" ? (
            <PresetSourceEditor source={source} presets={presets} onChange={updateSource} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

interface RandomSourceEditorProps {
  source: Extract<ComboSource, { type: "random" }>;
  punches: Punch[];
  onChange: (source: ComboSource) => void;
}

function RandomSourceEditor({ source, punches, onChange }: RandomSourceEditorProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const restrictPool = source.punchPool !== undefined;
  const poolNums = source.punchPool ?? punches.map((p) => p.num);

  function handleToggle(next: boolean) {
    onChange({ type: "random", punchPool: next ? Array.from(new Set(punches.map((p) => p.num))) : undefined });
  }

  function handleToggleChip(num: number) {
    const next = poolNums.includes(num) ? poolNums.filter((n) => n !== num) : [...poolNums, num];
    onChange({ type: "random", punchPool: Array.from(new Set(next)) });
  }

  return (
    <View style={styles.subSection}>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Restrict punch pool for this round</Text>
        <Switch
          value={restrictPool}
          onValueChange={handleToggle}
          trackColor={{ false: colors.panelLine, true: colors.accentDim }}
          thumbColor={restrictPool ? colors.accent : colors.textMuted}
          accessibilityLabel="Restrict punch pool for this round"
        />
      </View>
      {restrictPool ? (
        <ChipMultiSelect
          items={punches.map((p) => ({ id: p.id, value: p.num, label: p.name }))}
          selected={poolNums}
          onToggle={handleToggleChip}
        />
      ) : null}
    </View>
  );
}

interface SequenceSourceEditorProps {
  source: Extract<ComboSource, { type: "fixed-sequence" }>;
  punches: Punch[];
  onChange: (source: ComboSource) => void;
}

function SequenceSourceEditor({ source, punches, onChange }: SequenceSourceEditorProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  function handleAdd(num: number) {
    onChange({ type: "fixed-sequence", sequence: [...source.sequence, num] });
  }

  function handleRemove(index: number) {
    onChange({ type: "fixed-sequence", sequence: source.sequence.filter((_, i) => i !== index) });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= source.sequence.length) return;
    const next = [...source.sequence];
    const moved = next[index]!;
    next[index] = next[target]!;
    next[target] = moved;
    onChange({ type: "fixed-sequence", sequence: next });
  }

  return (
    <View style={styles.subSection}>
      {source.sequence.length === 0 ? (
        <Text style={styles.hint}>Add at least one punch below.</Text>
      ) : (
        <View style={styles.sequenceList}>
          {source.sequence.map((num, index) => (
            <PresetSequenceEntry
              key={index}
              position={index + 1}
              label={punches.find((p) => p.num === num)?.name ?? `Punch ${num}`}
              canMoveUp={index > 0}
              canMoveDown={index < source.sequence.length - 1}
              onMoveUp={() => handleMove(index, -1)}
              onMoveDown={() => handleMove(index, 1)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </View>
      )}
      <AddToSequenceRow punches={punches} onAdd={handleAdd} />
    </View>
  );
}

interface ComboPoolSourceEditorProps {
  source: Extract<ComboSource, { type: "combo-pool" }>;
  punches: Punch[];
  onChange: (source: ComboSource) => void;
}

/**
 * Several whole combos, one drawn per call-out -- the shape bagwork.md's
 * rounds actually have ("Head-body-head: 1-2b-3, 2-3b-2"). Each combo gets
 * the same sequence builder a fixed-sequence round uses; the combos
 * themselves are unordered, so they have no move up/down, unlike the
 * punches inside one.
 */
function ComboPoolSourceEditor({ source, punches, onChange }: ComboPoolSourceEditorProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  function replaceCombo(index: number, sequence: number[]) {
    onChange({ type: "combo-pool", combos: source.combos.map((c, i) => (i === index ? sequence : c)) });
  }

  return (
    <View style={styles.subSection}>
      <Text style={styles.hint}>One of these is called each time. Add several to vary the round.</Text>
      {source.combos.map((combo, comboIndex) => (
        <View key={comboIndex} style={styles.comboBlock}>
          <View style={styles.comboHeader}>
            <Text style={styles.comboTitle}>COMBO {comboIndex + 1}</Text>
            <Pressable
              onPress={() =>
                onChange({ type: "combo-pool", combos: source.combos.filter((_, i) => i !== comboIndex) })
              }
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Remove combo ${comboIndex + 1}`}
            >
              <Text style={styles.removeGlyph}>✕</Text>
            </Pressable>
          </View>
          {combo.length === 0 ? <Text style={styles.hint}>Add at least one punch below.</Text> : null}
          {combo.map((num, punchIndex) => (
            <PresetSequenceEntry
              key={punchIndex}
              position={punchIndex + 1}
              label={punches.find((p) => p.num === num)?.name ?? `Punch ${num}`}
              canMoveUp={punchIndex > 0}
              canMoveDown={punchIndex < combo.length - 1}
              onMoveUp={() => replaceCombo(comboIndex, swap(combo, punchIndex, punchIndex - 1))}
              onMoveDown={() => replaceCombo(comboIndex, swap(combo, punchIndex, punchIndex + 1))}
              onRemove={() => replaceCombo(comboIndex, combo.filter((_, i) => i !== punchIndex))}
            />
          ))}
          <AddToSequenceRow punches={punches} onAdd={(num) => replaceCombo(comboIndex, [...combo, num])} />
        </View>
      ))}
      <Pressable
        onPress={() => onChange({ type: "combo-pool", combos: [...source.combos, []] })}
        style={styles.addComboButton}
        accessibilityRole="button"
        accessibilityLabel="Add another combo to this round"
      >
        <Text style={styles.addComboLabel}>+ ADD COMBO</Text>
      </Pressable>
    </View>
  );
}

function swap(sequence: number[], from: number, to: number): number[] {
  const next = [...sequence];
  next[from] = sequence[to]!;
  next[to] = sequence[from]!;
  return next;
}

interface PresetSourceEditorProps {
  source: Extract<ComboSource, { type: "preset" }>;
  presets: Preset[];
  onChange: (source: ComboSource) => void;
}

function PresetSourceEditor({ source, presets, onChange }: PresetSourceEditorProps) {
  const { colors, fonts } = useTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (presets.length === 0) {
    return <Text style={styles.hint}>No saved presets yet -- add one from Settings › Presets first.</Text>;
  }

  return (
    <View style={styles.chipWrap}>
      {presets.map((preset) => {
        const active = preset.id === source.presetId;
        return (
          <Pressable
            key={preset.id}
            onPress={() => onChange({ type: "preset", presetId: preset.id })}
            style={[styles.chip, active && styles.chipActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{preset.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ColorTokens, fonts: Fonts) {
  return StyleSheet.create({
    card: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.panelLine,
      backgroundColor: colors.panel,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    headerBody: {
      flex: 1,
    },
    pressed: {
      opacity: 0.6,
    },
    title: {
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      color: colors.textPrimary,
    },
    summary: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    iconGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    iconButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    disabled: {
      opacity: 0.25,
    },
    glyph: {
      fontSize: 11,
      color: colors.textMuted,
    },
    deleteGlyph: {
      fontSize: 14,
      color: colors.textMuted,
    },
    body: {
      gap: 14,
      paddingHorizontal: 12,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.panelLine,
      paddingTop: 14,
    },
    input: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    noteInput: {
      minHeight: 60,
      textAlignVertical: "top",
    },
    row: {
      flexDirection: "row",
      gap: 8,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    toggleLabel: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textPrimary,
    },
    sectionTitle: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 12,
      letterSpacing: 1.5,
      color: colors.accent,
    },
    subSection: {
      gap: 10,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
    },
    sequenceList: {
      gap: 6,
    },
    comboBlock: {
      gap: 6,
      paddingLeft: 10,
      borderLeftWidth: 2,
      borderLeftColor: colors.panelLine,
    },
    comboHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    comboTitle: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 11,
      letterSpacing: 1.5,
      color: colors.textMuted,
    },
    removeGlyph: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.danger,
    },
    addComboButton: {
      paddingVertical: 12,
      alignItems: "center",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.panelLine,
    },
    addComboLabel: {
      fontFamily: fonts.displaySemiBold,
      fontSize: 12,
      letterSpacing: 1.5,
      color: colors.accent,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.panelLine,
      backgroundColor: colors.background,
    },
    chipActive: {
      backgroundColor: colors.accentDim,
      borderColor: colors.accent,
    },
    chipLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: colors.textMuted,
    },
    chipLabelActive: {
      color: colors.textPrimary,
    },
  });
}
