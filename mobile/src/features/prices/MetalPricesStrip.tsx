import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Skeleton } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { useMetalPrices } from './useMetalPrices';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0);

// Horizontal live-price ticker (LME metals) — parity with the web markets ticker.
export function MetalPricesStrip() {
  const { colors } = useTheme();
  const { prices, isLoading, configured } = useMetalPrices();
  if (!configured) return null;

  return (
    <View>
      <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>Live metal prices</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
        {isLoading && prices.length === 0
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} width={96} height={56} style={{ borderRadius: radius.lg }} />)
          : prices.map((p) => {
              const up = (p.change ?? 0) >= 0;
              return (
                <View key={p.key} style={{ minWidth: 96, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text variant="caption" tone="muted">{p.symbol}</Text>
                    {p.change != null && (
                      <Text variant="caption" color={up ? colors.positive : colors.negative} style={{ fontFamily: 'Inter_600SemiBold' }}>
                        {up ? '▲' : '▼'} {Math.abs(p.change).toFixed(1)}%
                      </Text>
                    )}
                  </View>
                  <Text variant="bodyMedium" style={{ marginTop: 2 }}>${fmt(p.price)}</Text>
                  <Text variant="caption" tone="faint" numberOfLines={1}>{p.name}</Text>
                </View>
              );
            })}
      </ScrollView>
    </View>
  );
}
