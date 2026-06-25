import React from 'react';
import { View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

interface StatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: string;
  sub?: string;
  delta?: { pct: number; up: boolean; good: boolean } | null;
  onPress?: () => void;
}

// KPI tile — icon chip, hero number, optional trend delta. The premium executive
// look from the web dashboard, rebuilt for touch.
export function StatCard({ label, value, icon, accent, sub, delta, onPress }: StatCardProps) {
  const { colors } = useTheme();
  const ac = accent || colors.primary;

  return (
    <Card onPress={onPress} style={{ minHeight: 120, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && (
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ac + '22',
            }}
          >
            {icon}
          </View>
        )}
        <Text variant="label" tone="muted" style={{ flex: 1 }} numberOfLines={2}>
          {label}
        </Text>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text variant="h1" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, minHeight: 16 }}>
          {delta && (
            <View
              style={{
                backgroundColor: (delta.good ? colors.positive : colors.negative) + '22',
                borderRadius: radius.pill,
                paddingHorizontal: 6,
                paddingVertical: 1,
              }}
            >
              <Text
                variant="caption"
                color={delta.good ? colors.positive : colors.negative}
                style={{ fontFamily: 'Poppins_600SemiBold' }}
              >
                {delta.up ? '▲' : '▼'} {Math.abs(delta.pct).toFixed(1)}%
              </Text>
            </View>
          )}
          {sub && (
            <Text variant="caption" tone="faint" numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}
