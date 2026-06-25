import { useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, StatCard, Button, SectionHeader, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useMargins } from '@/features/margins/useMargins';
import { streamSse, apiConfigured } from '@/lib/api';
import { fmtAutoKM, fmtMoney } from '@/lib/format';

const mt = (n: number) => `${fmtMoney(n, 0)} MT`;

export default function Margins() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userTitle, gisAccount } = useAuth();
  const { rows, totals, alertedItems, isLoading, isError, error, refetch } = useMargins();
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const analyzeMargins = async () => {
    setAiText('');
    setAiBusy(true);
    try {
      await streamSse('/api/ai/margin-alert', { alertedItems, threshold: 0 }, (d) => setAiText((t) => t + d));
    } catch (e: any) {
      setAiText(`⚠️ ${e?.message || 'Analysis failed.'}`);
    } finally {
      setAiBusy(false);
    }
  };

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">Back</Text>
    </Pressable>
  );

  if (userTitle !== 'Admin') {
    return (
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        {back}
        <EmptyState title="Admin only" message="Margins are restricted to Admin accounts." icon={<Ionicons name="lock-closed-outline" size={40} color={colors.textFaint} />} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false} refreshing={isLoading} onRefresh={refetch}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {back}
        <Text variant="h2">{gisAccount ? 'GIS Margins' : 'Margins'}</Text>
        <PeriodSelector />
      </View>

      {isLoading ? (
        <LoadingState label="Loading margins…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : (
        <View style={{ gap: 14 }}>
          {/* Headline stats */}
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <StatCard label="Profit" value={fmtAutoKM(totals.profit)} accent={colors.positive} sub="total margin $" icon={<Ionicons name="trending-up" size={16} color={colors.positive} />} />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard label="Quantity" value={mt(totals.quantity)} accent={colors.primary} sub="purchased" icon={<Ionicons name="cube" size={16} color={colors.primary} />} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <StatCard label="Shipped" value={mt(totals.shipped)} accent={colors.info} sub="qty − open" icon={<Ionicons name="boat" size={16} color={colors.info} />} />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard label="Outstanding" value={mt(totals.outstandingShip)} accent={colors.warn} sub="open shipment" icon={<Ionicons name="hourglass" size={16} color={colors.warn} />} />
            </View>
          </View>

          {gisAccount && (
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label" tone="muted">GIS profit</Text>
              <Text variant="h3" tone="positive">{fmtAutoKM(totals.profitGIS)}</Text>
            </Card>
          )}

          {/* AI margin analysis */}
          {apiConfigured() && (
            <Card>
              <SectionHeader
                title="AI Margin Analysis"
                subtitle={`${alertedItems.length} item(s) at or below break-even`}
                right={<Ionicons name="sparkles" size={18} color={colors.primary} />}
              />
              {aiText ? (
                <Text variant="body" tone="muted" style={{ marginBottom: 12 }}>{aiText}{aiBusy ? '▍' : ''}</Text>
              ) : null}
              {aiBusy && !aiText ? (
                <View style={{ paddingVertical: 8, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>
              ) : (
                <Button
                  title={aiText ? 'Re-analyze' : 'Analyze low margins'}
                  variant="secondary"
                  loading={aiBusy}
                  disabled={alertedItems.length === 0}
                  leftIcon={<Ionicons name="bulb-outline" size={18} color={colors.primary} />}
                  onPress={analyzeMargins}
                />
              )}
              {alertedItems.length === 0 && !aiText ? (
                <Text variant="caption" tone="faint" style={{ marginTop: 8, textAlign: 'center' }}>No loss-making items to analyze 🎉</Text>
              ) : null}
            </Card>
          )}

          {/* Per-month */}
          <Card>
            <SectionHeader title="By month" subtitle={String(totals.quantity > 0 ? '' : 'No margin data yet')} />
            {rows.length === 0 ? (
              <Text variant="body" tone="muted">No margin months for this year.</Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderStrong, paddingBottom: 6 }}>
                  <Text variant="caption" tone="muted" style={{ width: 44, fontFamily: 'Poppins_600SemiBold' }}>Mon</Text>
                  <Text variant="caption" tone="muted" style={{ flex: 1, textAlign: 'right', fontFamily: 'Poppins_600SemiBold' }}>Qty</Text>
                  <Text variant="caption" tone="muted" style={{ flex: 1, textAlign: 'right', fontFamily: 'Poppins_600SemiBold' }}>Shipped</Text>
                  <Text variant="caption" tone="muted" style={{ flex: 1.2, textAlign: 'right', fontFamily: 'Poppins_600SemiBold' }}>Profit</Text>
                </View>
                {rows.map((r, i) => (
                  <View key={r.month + i} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text variant="caption" style={{ width: 44 }}>{r.monthLabel}</Text>
                    <Text variant="caption" style={{ flex: 1, textAlign: 'right' }}>{fmtMoney(r.purchase, 0)}</Text>
                    <Text variant="caption" style={{ flex: 1, textAlign: 'right' }}>{fmtMoney(r.shipped, 0)}</Text>
                    <Text variant="caption" tone={r.totalMargin >= 0 ? 'positive' : 'negative'} style={{ flex: 1.2, textAlign: 'right', fontFamily: 'Poppins_500Medium' }}>
                      {fmtAutoKM(r.totalMargin)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </Card>
        </View>
      )}
    </Screen>
  );
}
