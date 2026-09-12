import React from 'react';
import { View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface KpiItem {
  key: string;
  label: string;
  value: string;
  icon: IconName;
  tone?: 'default' | 'positive' | 'negative' | 'warn' | 'info' | 'primary';
  sub?: string;
  onPress?: () => void;
}

const TILE_W = 158;
const GAP = 10;

/**
 * Web's KpiStrip, shaped for a phone: tiles side by side in a row that snaps as
 * it's swiped, instead of four full-width cards stacked down the screen before
 * the page even starts. The first tiles are fully readable without a swipe, and
 * the cut-off edge of the next one says there's more.
 */
export function KpiStrip({ items }: { items: KpiItem[] }) {
  const { colors } = useTheme();
  const toneColor = (t: KpiItem['tone']) =>
    t === 'positive'
      ? colors.positive
      : t === 'negative'
        ? colors.negative
        : t === 'warn'
          ? colors.warn
          : t === 'info'
            ? colors.info
            : t === 'primary'
              ? colors.primary
              : colors.text;

  return (
    // Bleeds to both screen edges so the strip scrolls the full width and the
    // next tile is clipped by the SCREEN, not by the page gutter — the clipped
    // edge is the affordance that says "swipe me".
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={TILE_W + GAP}
      snapToAlignment="start"
      style={{ marginHorizontal: -spacing.lg }}
      contentContainerStyle={{ gap: GAP, paddingHorizontal: spacing.lg }}
    >
      {items.map((k) => {
        const value = toneColor(k.tone);
        const accent = k.tone && k.tone !== 'default' ? value : colors.primary;
        return (
          <Card key={k.key} onPress={k.onPress} style={{ width: TILE_W, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  backgroundColor: accent + '1F',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={k.icon} size={15} color={accent} />
              </View>
              <Text variant="label" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                {k.label}
              </Text>
            </View>
            <Text
              variant="h2"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: value, fontVariant: ['tabular-nums'] }}
            >
              {k.value}
            </Text>
            {k.sub ? (
              <Text variant="caption" tone="faint" numberOfLines={1}>
                {k.sub}
              </Text>
            ) : null}
          </Card>
        );
      })}
    </ScrollView>
  );
}
