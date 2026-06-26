import { View } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

interface Series { name: string; color: string; data: number[] }
interface BarChartProps {
  labels: string[];
  series: Series[];
  height?: number;
}

// Lightweight grouped bar chart (SVG) — used for the Accounting Debit/Credit view.
export function BarChart({ labels, series, height = 170 }: BarChartProps) {
  const { colors } = useTheme();
  const w = 320;
  const padX = 8;
  const padTop = 8;
  const padBottom = 4;
  const innerW = w - padX * 2;
  const innerH = height - padTop - padBottom;
  const groups = labels.length || 1;
  const groupW = innerW / groups;
  const max = Math.max(1, ...series.flatMap((s) => s.data.map((v) => Math.abs(v))));
  const barGap = 2;
  const n = series.length || 1;
  const barW = Math.max(2, (groupW * 0.62 - barGap * (n - 1)) / n);

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <Line key={g} x1={padX} x2={w - padX} y1={padTop + innerH * (1 - g)} y2={padTop + innerH * (1 - g)} stroke={colors.border} strokeWidth={1} />
        ))}
        {labels.map((_, gi) => {
          const groupX = padX + gi * groupW + (groupW - (barW * n + barGap * (n - 1))) / 2;
          return series.map((s, si) => {
            const v = Math.abs(s.data[gi] || 0);
            const h = (v / max) * innerH;
            const x = groupX + si * (barW + barGap);
            const y = padTop + innerH - h;
            return <Rect key={`${gi}-${si}`} x={x} y={y} width={barW} height={Math.max(0, h)} rx={2} fill={s.color} />;
          });
        })}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, paddingHorizontal: 4 }}>
        {labels.map((l, i) => (
          <Text key={i} variant="caption" tone="faint">{l}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 8 }}>
        {series.map((s) => (
          <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
            <Text variant="caption" tone="muted">{s.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
