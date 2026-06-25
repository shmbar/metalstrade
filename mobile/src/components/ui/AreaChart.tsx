import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

interface AreaChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  formatY?: (v: number) => string;
}

// Lightweight SVG area/line chart — premium trend visual without a heavy chart lib.
export function AreaChart({ data, labels, height = 140, color, formatY }: AreaChartProps) {
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

  const pts = vals.map((v, i) => {
    const x = padX + (vals.length === 1 ? innerW / 2 : (i / (vals.length - 1)) * innerW);
    const y = padY + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(padY + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padY + innerH).toFixed(1)} Z`;
  const lastIdx = pts.length - 1;

  return (
    <View>
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
        <Circle cx={pts[lastIdx].x} cy={pts[lastIdx].y} r={4} fill={stroke} />
      </Svg>
      {labels && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          {labels.map((l, i) => (
            <Text key={i} variant="caption" tone="faint">{l}</Text>
          ))}
        </View>
      )}
      {formatY && (
        <View style={{ position: 'absolute', top: 0, right: 0 }}>
          <Text variant="caption" tone="faint">{formatY(max)}</Text>
        </View>
      )}
    </View>
  );
}
