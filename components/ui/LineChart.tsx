import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Polyline,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';

export interface ChartPoint {
  date: string;
  value: number;
}

interface LineChartProps {
  points: ChartPoint[];
  height?: number;
  color?: string;
}

const PAD = { top: 22, bottom: 26, left: 4, right: 4 } as const;

function fmtVal(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

function fmtDate(s: string): string {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function LineChart({ points, height = 120, color = Colors.accent }: LineChartProps) {
  const [width, setWidth] = useState(0);

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const chartW = Math.max(width - PAD.left - PAD.right, 0);
  const chartH = Math.max(height - PAD.top - PAD.bottom, 0);

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal === minVal ? 1 : maxVal - minVal;

  const getX = (i: number): number => {
    if (points.length <= 1) return PAD.left + chartW / 2;
    return PAD.left + (i / (points.length - 1)) * chartW;
  };

  const getY = (val: number): number =>
    PAD.top + (1 - (val - minVal) / range) * chartH;

  const flatY = PAD.top + chartH / 2;

  const pts = points.map((p, i) => ({
    x: getX(i),
    y: maxVal === minVal ? flatY : getY(p.value),
    value: p.value,
    date: p.date,
  }));

  const bottomY = PAD.top + chartH;
  const first = pts[0];
  const last = pts[pts.length - 1];

  const fillPath =
    points.length > 1
      ? `M ${first.x},${bottomY} ` +
        pts.map((p) => `L ${p.x},${p.y}`).join(' ') +
        ` L ${last.x},${bottomY} Z`
      : '';

  const polylineStr = pts.map((p) => `${p.x},${p.y}`).join(' ');

  const minPt = pts.reduce((a, b) => (a.value < b.value ? a : b));
  const maxPt = pts.reduce((a, b) => (a.value > b.value ? a : b));

  const maxLabelY = Math.max(maxPt.y - 6, 11);
  const minLabelY = Math.min(minPt.y + 14, height - 4);

  return (
    <View
      style={{ height }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && w !== width) setWidth(w);
      }}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.38" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {fillPath !== '' && <Path d={fillPath} fill="url(#chartGrad)" />}

          {points.length > 1 && (
            <Polyline
              points={polylineStr}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {points.length === 1 ? (
            <Circle cx={pts[0].x} cy={pts[0].y} r={5} fill={color} />
          ) : (
            <>
              <Circle cx={first.x} cy={first.y} r={3} fill={color} opacity={0.55} />
              <Circle cx={last.x} cy={last.y} r={4} fill={color} />
            </>
          )}

          <SvgText
            x={maxPt.x}
            y={maxLabelY}
            fill={Colors.secondary}
            fontSize={9}
            fontFamily={Fonts.display}
            textAnchor="middle"
          >
            {fmtVal(maxPt.value)}
          </SvgText>

          {minVal !== maxVal && (
            <SvgText
              x={minPt.x}
              y={minLabelY}
              fill={Colors.muted}
              fontSize={9}
              fontFamily={Fonts.display}
              textAnchor="middle"
            >
              {fmtVal(minPt.value)}
            </SvgText>
          )}

          {points.length > 1 && (
            <>
              <SvgText
                x={PAD.left + 2}
                y={height - 2}
                fill={Colors.hint}
                fontSize={8}
                fontFamily={Fonts.body}
                textAnchor="start"
              >
                {fmtDate(first.date)}
              </SvgText>
              <SvgText
                x={width - PAD.right - 2}
                y={height - 2}
                fill={Colors.hint}
                fontSize={8}
                fontFamily={Fonts.body}
                textAnchor="end"
              >
                {fmtDate(last.date)}
              </SvgText>
            </>
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
  },
});
