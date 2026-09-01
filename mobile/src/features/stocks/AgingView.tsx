import { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Text, Badge, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useStocks } from './useStocks';
import { computeAging, BUCKET_TONE, STALE_DAYS, DEMURRAGE_DAYS } from './aging';

const fmtQty = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3 }).format(Number(n) || 0);
const BUCKETS = ['0-30', '31-60', '61-90', '90+'] as const;

export function AgingView() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { data, isLoading, isError, error, refetch } = useStocks();

  const stockName = (id: string) => settings?.Stocks?.Stocks?.find((s: any) => s.id === id)?.nname || id || '—';

  const { byTerminal, staleRows } = useMemo(
    () => computeAging(data?.rows || [], stockName),
    [data, settings]
  );

  if (isLoading) return <View style={{ flex: 1 }}><SkeletonList /></View>;
  if (isError) return <ErrorState message={(error as Error)?.message || 'Failed to load stock.'} onRetry={refetch} />;
  if (byTerminal.length === 0) {
    return <EmptyState title="No cargo on hand" message="Nothing to age." icon={<Ionicons name="time-outline" size={40} color={colors.textFaint} />} />;
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 96 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Ionicons name="business-outline" size={16} color={colors.primary} />
        <Text variant="h3" style={{ flex: 1 }}>Storage Aging by Terminal</Text>
        {staleRows.length > 0 ? <Badge label={`${staleRows.length} sitting ${STALE_DAYS}d+`} tone="negative" /> : null}
      </View>

      {byTerminal.map((g) => {
        const danger = g.oldest >= DEMURRAGE_DAYS;
        const warn = g.oldest >= STALE_DAYS;
        return (
          <Card key={g.terminal} style={{ marginBottom: 12, borderColor: danger ? colors.negative : warn ? colors.borderStrong : colors.border, borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>{g.name}</Text>
              <Text variant="caption" tone={danger ? 'negative' : warn ? 'warn' : 'faint'}>oldest {g.oldest}d</Text>
            </View>
            <Text variant="caption" tone="muted" style={{ marginBottom: 8 }}>{g.count} item(s) · {fmtQty(g.qty)} qty</Text>

            {/* Age bucket bar */}
            <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
              {BUCKETS.map((b) => {
                const pct = g.count ? (g.buckets[b] / g.count) * 100 : 0;
                return pct > 0 ? <View key={b} style={{ width: `${pct}%`, backgroundColor: colors[BUCKET_TONE[b]] }} /> : null;
              })}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              {BUCKETS.map((b) => g.buckets[b] > 0 ? (
                <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[BUCKET_TONE[b]] }} />
                  <Text variant="caption" tone="faint">{b}d: {g.buckets[b]}</Text>
                </View>
              ) : null)}
              {g.buckets.unknown > 0 ? <Text variant="caption" tone="faint">no date: {g.buckets.unknown}</Text> : null}
            </View>
          </Card>
        );
      })}

      {/* Stale cargo list */}
      {staleRows.length > 0 && (
        <Card style={{ borderColor: colors.borderStrong, borderWidth: 1, backgroundColor: colors.surfaceAlt }}>
          <Text variant="bodyMedium" style={{ color: colors.warn, marginBottom: 8 }}>
            Cargo sitting {STALE_DAYS}+ days without movement
          </Text>
          <View style={{ gap: 6 }}>
            {staleRows.slice(0, 100).map((r) => {
              const risk = r.days >= DEMURRAGE_DAYS;
              return (
                <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 }}>
                  <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>{r.descriptionName} · {r.terminalName} · {fmtQty(r.qnty)}</Text>
                  <View style={{ backgroundColor: risk ? colors.surfaceAlt : colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text variant="caption" style={{ color: risk ? colors.negative : colors.warn }}>{r.days}d{risk ? ' · demurrage' : ''}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}
