import React, { useState } from 'react';
import { View, GestureResponderEvent } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

interface AreaChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  formatY?: (v: number) => string;
  // Full-length names for the scrub tooltip (falls back to `labels`).
  tooltipLabels?: string[];
}

// Lightweight SVG area/line chart with touch scrubbing: drag a finger across it
// to inspect each point (stock-app style). No chart library required.
export function AreaChart({ data, labels, height = 140, color, formatY, tooltipLabels }: AreaChartProps) {
  const { colors } = useTheme();
  const stroke = color || colors.primary;
  const w = 320; // viewBox width; scales to container via preserveAspectRatio
  const padX = 6;
  const padY = 12;
  const vals = data.length ? data : [0];
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const innerW = w - padX * 2;
  const innerH = height - padY * 2;

  const [layoutW, setLayoutW] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const pts = vals.map((v, i) => {
    const x = padX + (vals.length === 1 ? innerW / 2 : (i / (vals.length - 1)) * innerW);
    const y = padY + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(padY + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padY + innerH).toFixed(1)} Z`;
  const lastIdx = pts.length - 1;

  // Touch → nearest data point (screen px → viewBox fraction → index).
  const scrub = (e: GestureResponderEvent) => {
    if (!layoutW || vals.length < 2) return;
    const frac = Math.min(1, Math.max(0, (e.nativeEvent.locationX / layoutW - padX / w) / (innerW / w)));
    setActive(Math.round(frac * (vals.length - 1)));
  };

  const sx = layoutW ? layoutW / w : 1;
  const tipLabel = active != null ? (tooltipLabels?.[active] ?? labels?.[active] ?? String(active + 1)) : '';
  const tipValue = active != null ? (formatY ? formatY(vals[active]) : String(vals[active])) : '';
  // Keep the floating tooltip inside the container.
  const tipLeft = active != null ? Math.min(Math.max(pts[active].x * sx - 44, 0), Math.max(layoutW - 92, 0)) : 0;

  return (
    <View>
      {/* Scrub tooltip */}
      <View style={{ height: 24 }}>
        {active != null && (
          <View
            style={{
              position: 'absolute',
              left: tipLeft,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.bgElevated,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text variant="caption" tone="muted">{tipLabel}</Text>
            <Text variant="caption" style={{ fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] }}>{tipValue}</Text>
          </View>
        )}
      </View>

      <View
        onLayout={(e) => setLayoutW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={scrub}
        onResponderMove={scrub}
        onResponderRelease={() => setActive(null)}
        onResponderTerminate={() => setActive(null)}
      >
        <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <Line key={g} x1={padX} x2={w - padX} y1={padY + innerH * g} y2={padY + innerH * g} stroke={colors.border} strokeWidth={1} />
          ))}
          <Path d={areaPath} fill="url(#areaFill)" />
          <Path d={linePath} stroke={stroke} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />

          {/* Scrub guide */}
          {active != null && (
            <>
              <Line x1={pts[active].x} x2={pts[active].x} y1={padY} y2={padY + innerH} stroke={stroke} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
              <Circle cx={pts[active].x} cy={pts[active].y} r={5} fill={colors.bgElevated} stroke={stroke} strokeWidth={2.5} />
            </>
          )}

          <Circle cx={pts[lastIdx].x} cy={pts[lastIdx].y} r={4} fill={stroke} />
          {/* Emphasized endpoint: label the latest value right at the line's end */}
          {formatY && vals[lastIdx] > 0 && active == null && (
            <SvgText
              x={Math.min(pts[lastIdx].x, w - padX) - 6}
              y={Math.max(pts[lastIdx].y - 8, 10)}
              fontSize={10}
              fontWeight="600"
              fill={stroke}
              textAnchor="end"
            >
              {formatY(vals[lastIdx])}
            </SvgText>
          )}
        </Svg>
      </View>

      {labels && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          {labels.map((l, i) => (
            <Text key={i} variant="caption" tone={active === i ? 'primary' : 'faint'}>{l}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
