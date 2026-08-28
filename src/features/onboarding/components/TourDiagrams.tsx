/**
 * One small sketch per tour card, drawn from the app's own motifs rather
 * than screenshots -- a screenshot goes stale the moment a screen changes,
 * and these have to survive both the dark and monochrome palettes, so
 * every colour comes from the live theme.
 *
 * All three are decorative: the card's own headline and body say the same
 * thing in words, so they are hidden from screen readers rather than
 * given labels that would just repeat the text underneath.
 */
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Circle, G, Rect, Svg, Text as SvgText } from "react-native-svg";

import { useTheme } from "../../../shared/theme/ThemeContext";

const WIDTH = 260;
const HEIGHT = 150;

function DiagramFrame({ children }: { children: React.ReactNode }) {
  const styles = useMemo(() => StyleSheet.create({ wrap: { height: HEIGHT, justifyContent: "center" } }), []);
  return (
    <View style={styles.wrap} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {children}
      </Svg>
    </View>
  );
}

/** A round list with the running round picked out -- the shape a template
 * actually has, and the thing the Main Timer now shows mid-session. */
export function TemplateDiagram() {
  const { colors, fonts } = useTheme();
  const rows: [string, string][] = [
    ["1", "JAB"],
    ["2", "1-2"],
    ["3", "BODY"],
    ["4", "KICKS"],
  ];
  const rowH = 30;
  const gap = 6;
  const activeIndex = 2;

  return (
    <DiagramFrame>
      {rows.map(([num, label], i) => {
        const y = i * (rowH + gap) + 6;
        const active = i === activeIndex;
        return (
          <G key={num}>
            <Rect
              x={20}
              y={y}
              width={WIDTH - 40}
              height={rowH}
              rx={5}
              fill={active ? colors.accent : colors.panel}
              stroke={active ? colors.accent : colors.panelLine}
              strokeWidth={1}
            />
            <SvgText
              x={36}
              y={y + 20}
              fill={active ? colors.background : colors.textMuted}
              fontSize={13}
              fontFamily={fonts.numericSemiBold}
            >
              {num}
            </SvgText>
            <SvgText
              x={60}
              y={y + 20}
              fill={active ? colors.background : colors.textPrimary}
              fontSize={13}
              fontFamily={fonts.displaySemiBold}
            >
              {label}
            </SvgText>
          </G>
        );
      })}
    </DiagramFrame>
  );
}

/** The Odd One Out grid with its odd tile already picked out -- the whole
 * drill explained without a word of instruction. */
export function DrillDiagram() {
  const { colors } = useTheme();
  const cell = 34;
  const gap = 10;
  const cols = 3;
  const gridW = cols * cell + (cols - 1) * gap;
  const originX = (WIDTH - gridW) / 2;
  const originY = (HEIGHT - gridW) / 2;
  const oddIndex = 4;

  return (
    <DiagramFrame>
      {Array.from({ length: 9 }, (_, i) => {
        const odd = i === oddIndex;
        return (
          <Rect
            key={i}
            x={originX + (i % cols) * (cell + gap)}
            y={originY + Math.floor(i / cols) * (cell + gap)}
            width={cell}
            height={cell}
            rx={6}
            fill={odd ? colors.accent : colors.panel}
            stroke={odd ? colors.accent : colors.panelLine}
            strokeWidth={1}
          />
        );
      })}
      {/* The tap that resolves it. */}
      <Circle
        cx={originX + (oddIndex % cols) * (cell + gap) + cell / 2}
        cy={originY + Math.floor(oddIndex / cols) * (cell + gap) + cell / 2}
        r={cell * 0.86}
        fill="none"
        stroke={colors.accent}
        strokeWidth={1.5}
        opacity={0.45}
      />
    </DiagramFrame>
  );
}

/** Numbered punch chips plus an empty slot -- a list you own and extend,
 * rather than a fixed vocabulary. */
export function PunchesDiagram() {
  const { colors, fonts } = useTheme();
  const chips: [string, string, number][] = [
    ["1", "JAB", 74],
    ["2", "CROSS", 92],
    ["3", "LEAD HOOK", 118],
    ["12", "LEAD CALF KICK", 148],
  ];
  const rowH = 28;
  const gap = 9;

  // Wrap into rows first, then centre each row -- laying out with a single
  // left-anchored cursor leaves short rows (and the trailing "+" slot)
  // hanging off to one side of an otherwise centred card.
  const rows: [string, string, number][][] = [[]];
  let rowW = 0;
  for (const chip of chips) {
    const width = chip[2];
    if (rows[rows.length - 1]!.length > 0 && rowW + gap + width > WIDTH - 40) {
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1]!.push(chip);
    rowW += (rowW > 0 ? gap : 0) + width;
  }
  // The dashed "add your own" slot gets a row of its own, centred with the rest.
  const addSlotW = 54;
  const addSlotY = rows.length * (rowH + gap) + 12;

  const placed = rows.flatMap((row, rowIndex) => {
    const total = row.reduce((sum, c, i) => sum + c[2] + (i > 0 ? gap : 0), 0);
    let x = (WIDTH - total) / 2;
    return row.map(([num, label, w]) => {
      const pos = { x, y: rowIndex * (rowH + gap) + 12, w, num, label };
      x += w + gap;
      return pos;
    });
  });

  return (
    <DiagramFrame>
      {placed.map((c) => (
        <G key={c.num}>
          <Rect
            x={c.x}
            y={c.y}
            width={c.w}
            height={rowH}
            rx={14}
            fill={colors.panel}
            stroke={colors.accent}
            strokeWidth={1}
          />
          <SvgText x={c.x + 12} y={c.y + 19} fill={colors.accent} fontSize={11} fontFamily={fonts.numericSemiBold}>
            {c.num}
          </SvgText>
          <SvgText
            x={c.x + 12 + (c.num.length > 1 ? 18 : 12)}
            y={c.y + 19}
            fill={colors.textPrimary}
            fontSize={11}
            fontFamily={fonts.displaySemiBold}
          >
            {c.label}
          </SvgText>
        </G>
      ))}
      {/* The "and yours" slot. */}
      <Rect
        x={(WIDTH - addSlotW) / 2}
        y={addSlotY}
        width={addSlotW}
        height={rowH}
        rx={14}
        fill="none"
        stroke={colors.panelLine}
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      <SvgText
        x={WIDTH / 2}
        y={addSlotY + 19}
        textAnchor="middle"
        fill={colors.textMuted}
        fontSize={13}
        fontFamily={fonts.body}
      >
        +
      </SvgText>
    </DiagramFrame>
  );
}

export type DiagramName = "template" | "drill" | "punches";

export function TourDiagram({ name }: { name: DiagramName }) {
  if (name === "template") return <TemplateDiagram />;
  if (name === "drill") return <DrillDiagram />;
  return <PunchesDiagram />;
}
