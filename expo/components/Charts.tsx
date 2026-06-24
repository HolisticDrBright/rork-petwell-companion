import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

import Colors, { Fonts, Radius, Space } from "@/constants/colors";

function buildPath(values: number[], width: number, height: number, pad: number): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1 || 1);
  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / range);
    return { x, y };
  });
  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const cx = (prev.x + cur.x) / 2;
    line += ` C ${cx} ${prev.y}, ${cx} ${cur.y}, ${cur.x} ${cur.y}`;
  }
  const area = `${line} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;
  return { line, area };
}

export const LineChart = memo(function LineChart({
  values,
  color = Colors.teal700,
  height = 120,
  width = 300,
}: {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  const pad = 10;
  // Guard degenerate input: an empty series would make min/max ±Infinity and
  // lastY NaN, producing an invalid <Circle/>.
  if (!values || values.length === 0) return <Svg width={width} height={height} />;
  const { line, area } = buildPath(values, width, height, pad);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1 || 1);
  const lastX = pad + (values.length - 1) * stepX;
  const lastY = pad + (height - pad * 2) * (1 - (values[values.length - 1] - min) / range);
  const gid = `grad-${color.replace("#", "")}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path d={area} fill={`url(#${gid})`} />
      <Path d={line} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Circle cx={lastX} cy={lastY} r={5} fill={color} />
      <Circle cx={lastX} cy={lastY} r={9} fill={color} fillOpacity={0.2} />
    </Svg>
  );
});

export const Sparkline = memo(function Sparkline({
  values,
  color,
  width = 64,
  height = 28,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const { line } = buildPath(values, width, height, 3);
  return (
    <Svg width={width} height={height}>
      <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export const BarChart = memo(function BarChart({
  values,
  color = Colors.teal600,
  height = 110,
  labels,
}: {
  values: number[];
  color?: string;
  height?: number;
  labels?: string[];
}) {
  const max = Math.max(...values, 1);
  return (
    <View>
      <View style={[styles.barRow, { height }]}>
        {values.map((v, i) => (
          <View key={i} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                { height: Math.max(6, (v / max) * (height - 8)), backgroundColor: color },
              ]}
            />
          </View>
        ))}
      </View>
      {labels ? (
        <View style={styles.barRow}>
          {labels.map((l, i) => (
            <Text key={i} style={styles.barLabel}>
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
});

export const MiniTrend = memo(function MiniTrend({
  label,
  values,
  unit,
  color,
}: {
  label: string;
  values: number[];
  unit?: string;
  color: string;
}) {
  const last = values[values.length - 1];
  const prev = values[values.length - 2] ?? last;
  const up = last >= prev;
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Sparkline values={values} color={color} />
      <Text style={[styles.miniValue, { color }]}>
        {Number.isInteger(last) ? last : last.toFixed(1)}
        {unit ? <Text style={styles.miniUnit}>{unit}</Text> : null}
        <Text style={styles.miniArrow}>{up ? " ↑" : " ↓"}</Text>
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  barRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: { width: "78%", borderRadius: 6 },
  barLabel: { ...Fonts.tiny, flex: 1, textAlign: "center", marginTop: 6 },
  miniCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Space.sm,
    width: 104,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  miniLabel: { ...Fonts.tiny, textTransform: "capitalize" },
  miniValue: { fontSize: 16, fontWeight: "800" },
  miniUnit: { fontSize: 11, fontWeight: "700" },
  miniArrow: { fontSize: 12 },
});
