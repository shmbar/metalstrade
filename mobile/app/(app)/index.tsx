import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatCard, Text, Card, AreaChart, SectionHeader, LoadingState, ErrorState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { ReceivablesCard, AgingCard, RankingCard } from '@/features/dashboard/components';
import { MetalPricesStrip } from '@/features/prices/MetalPricesStrip';
import { fmtCurKM, fmtMT } from '@/lib/format';
import { spacing, radius } from '@/theme/tokens';

const QUICK = [
  { label: 'New Contract', icon: 'add-circle', href: '/(app)/contracts/edit' },
  { label: 'Invoices', icon: 'receipt', href: '/(app)/invoices' },
  { label: 'Cashflow', icon: 'cash', href: '/(app)/cashflow' },
  { label: 'Assistant', icon: 'sparkles', href: '/(app)/assistant' },
] as const;

export default function Dashboard() {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { data, isLoading, isError, error, refetch } = useDashboard();

  const curLine = (byCur: Record<string, number>) => {
    const ents = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
    if (!ents.length) return '$0';
    return ents.map(([c, v]) => fmtCurKM(c, v)).join('  ');
  };

  const outstanding: Record<string, number> = {};
  if (data) Object.entries(data.receivables).forEach(([c, s]) => (outstanding[c] = s.due + s.balance));

  const firstName = currentUser.name.split(' ')[0] || 'there';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} progressViewOffset={insets.top + 60} />}
      >
        {/* Gradient executive hero */}
        <LinearGradient
          colors={scheme === 'dark' ? ['#0b3b73', '#0a1322'] : ['#0a6fc2', '#0366ae', '#0b3b73']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 14, paddingHorizontal: spacing.lg, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text variant="caption" color="rgba(255,255,255,0.7)">Welcome back</Text>
              <Text variant="h2" color="#ffffff">{firstName}</Text>
            </View>
            <PeriodSelector />
          </View>

          <View style={{ marginTop: 20 }}>
            <Text variant="caption" color="rgba(255,255,255,0.7)">Revenue · this period</Text>
            <Text variant="display" color="#ffffff" style={{ fontSize: 36, lineHeight: 42, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
              {data ? curLine(data.revenueByCur) : '—'}
            </Text>
          </View>

          {/* Glass stat chips */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            {[
              { k: 'Contracts', v: data ? String(data.contractCount) : '—' },
              { k: 'Outstanding', v: data ? curLine(outstanding) : '—' },
              { k: 'Tonnage', v: data ? fmtMT(data.totalMT) : '—' },
            ].map((c) => (
              <View key={c.k} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 10 }}>
                <Text variant="caption" color="rgba(255,255,255,0.7)" numberOfLines={1}>{c.k}</Text>
                <Text variant="bodyMedium" color="#ffffff" numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2, fontFamily: 'Poppins_600SemiBold' }}>{c.v}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: 18 }}>
          {QUICK.map((q) => (
            <Pressable key={q.label} onPress={() => router.push(q.href as any)} style={{ alignItems: 'center', gap: 6, width: '23%' }}>
              <View style={{ width: 54, height: 54, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: '#0f1b35', shadowOpacity: scheme === 'dark' ? 0.35 : 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                <Ionicons name={q.icon as any} size={22} color={colors.primary} />
              </View>
              <Text variant="caption" tone="muted" numberOfLines={1}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Live metal prices */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: 18 }}>
          <MetalPricesStrip />
        </View>

        {/* Body */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: 18 }}>
          {isLoading && !data ? (
            <LoadingState label="Loading your books…" />
          ) : isError ? (
            <ErrorState message={(error as Error)?.message || 'Failed to load dashboard data.'} onRetry={refetch} />
          ) : data ? (
            <View style={{ gap: 14 }}>
              {/* Revenue trend chart */}
              {data.revenueByMonth.some((v) => v > 0) && (
                <Card>
                  <SectionHeader title="Revenue trend" subtitle="Invoiced by month" />
                  <AreaChart
                    data={data.revenueByMonth}
                    labels={['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']}
                    color={colors.primary}
                  />
                </Card>
              )}

              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <StatCard label="Purchase Value" value={curLine(data.purchaseByCur)} accent={colors.primary} icon={<Ionicons name="cart" size={16} color={colors.primary} />} sub="contracts" />
                </View>
                <View style={{ flex: 1 }}>
                  <StatCard label="Tonnage" value={fmtMT(data.totalMT)} accent={colors.warn} icon={<Ionicons name="cube" size={16} color={colors.warn} />} sub="purchased" />
                </View>
              </View>

              <ReceivablesCard byCur={data.receivables} />
              <AgingCard buckets={data.aging} />

              {Object.keys(data.miscByCur).length > 0 && (
                <StatCard label="Misc Invoices · not linked to contracts" value={curLine(data.miscByCur)} accent="#db2777" icon={<Ionicons name="receipt" size={16} color="#db2777" />} sub={`${data.miscCount} invoice${data.miscCount === 1 ? '' : 's'} in period`} />
              )}

              <RankingCard title="Top Suppliers" subtitle="By purchase value (USD basis)" rows={data.topSuppliers} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
