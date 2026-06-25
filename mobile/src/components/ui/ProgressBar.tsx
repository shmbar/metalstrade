import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

interface ProgressBarProps {
  pct: number; // 0-100
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({ pct, color, trackColor, height = 8 }: ProgressBarProps) {
  const { colors, scheme } = useTheme();
  const clamped = Math.max(0, Math.min(100, pct || 0));
  return (
    <View
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: trackColor || (scheme === 'dark' ? '#22304d' : '#eef3f9'),
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${clamped}%`,
          minWidth: clamped > 0 ? 4 : 0,
          backgroundColor: color || colors.primary,
          borderRadius: radius.pill,
        }}
      />
    </View>
  );
}

// Multi-segment proportion bar (e.g. category mix).
export function SegmentBar({ segments, height = 8 }: { segments: { pct: number; color: string }[]; height?: number }) {
  const { scheme } = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: scheme === 'dark' ? '#22304d' : '#f1f5f9',
        overflow: 'hidden',
        flexDirection: 'row',
      }}
    >
      {segments.map((s, i) => (
        <View key={i} style={{ width: `${Math.max(0, Math.min(100, s.pct))}%`, backgroundColor: s.color }} />
      ))}
    </View>
  );
}
