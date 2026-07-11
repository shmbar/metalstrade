import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatCard, Text, Card, AreaChart, SectionHeader, SkeletonList, ErrorState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { ReceivablesCard, AgingCard, RankingCard } from '@/features/dashboard/components';
import { MetalPricesStrip } from '@/features/prices/MetalPricesStrip';
import { BriefingCard } from '@/features/briefing/BriefingCard';
import { fmtCurKM, fmtMT, fmtAutoKM } from '@/lib/format';
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
  const { currentUser, userTitle } = useAuth();
  const { data, isLoading, isError, error, refetch } = useDashboard();

  // Web parity: 'accounting' users are restricted to the accounting view.
  if (userTitle === 'accounting') return <Redirect href="/(app)/accounting" />;

  const curLine = (byCur: Record<string, number>) => {
    const ents = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
    if (!ents.length) return '$0';
    return ents.map(([c, v]) => fmtCurKM(c, v)).join('  ');
  };

  const outstanding: Record<string, number> = {};
  if (data) Object.entries(data.receivables).forEach(([c, s]) => (outstanding[c] = s.due + s.balance));

  const firstName = currentUser.name.split(' ')[0] || 'there';

  // Month-over-month delta on invoiced revenue (current vs previous calendar month).
  const m = new Date().getMonth();
  const curM = data?.revenueByMonth[m] ?? 0;
  const prevM = m > 0 ? data?.revenueByMonth[m - 1] ?? 0 : 0;
  const deltaPct = prevM > 0 ? ((curM - prevM) / prevM) * 100 : null;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

          <Pressable onPress={() => router.push('/(app)/invoices')} style={{ marginTop: 20 }}>
            <Text variant="caption" color="rgba(255,255,255,0.7)">Revenue · this period</Text>
            <Text variant="display" color="#ffffff" style={{ fontSize: 36, lineHeight: 42, marginTop: 2, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
              {data ? curLine(data.revenueByCur) : '—'}
            </Text>
            {deltaPct != null && Math.abs(deltaPct) >= 0.5 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Ionicons name={deltaPct >= 0 ? 'trending-up' : 'trending-down'} size={13} color={deltaPct >= 0 ? '#7ce3a8' : '#ffb3ab'} />
                <Text variant="caption" color={deltaPct >= 0 ? '#7ce3a8' : '#ffb3ab'} style={{ fontFamily: 'Inter_600SemiBold' }}>
                  {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(0)}% {MONTHS[m]} vs {MONTHS[m - 1]}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Glass stat chips — each drills into its report */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            {[
              { k: 'Contracts', v: data ? String(data.contractCount) : '—', href: '/(app)/contracts' },
              { k: 'Outstanding', v: data ? curLine(outstanding) : '—', href: '/(app)/invoices?filter=Unpaid' },
              { k: 'Tonnage', v: data ? fmtMT(data.totalMT) : '—', href: '/(app)/stocks' },
            ].map((c) => (
              <Pressable key={c.k} onPress={() => router.push(c.href as any)} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 10 }}>
                <Text variant="caption" color="rgba(255,255,255,0.7)" numberOfLines={1}>{c.k}</Text>
                <Text variant="bodyMedium" color="#ffffff" numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] }}>{c.v}</Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        {/* AI morning briefing */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: 14 }}>
          <BriefingCard />
        </View>

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
            <SkeletonList count={6} />
          ) : isError ? (
            <ErrorState message={(error as Error)?.message || 'Failed to load dashboard data.'} onRetry={refetch} />
          ) : data ? (
            <View style={{ gap: 14 }}>
              {/* Revenue trend chart */}
              {data.revenueByMonth.some((v) => v > 0) && (
                <Card onPress={() => router.push('/(app)/invoices')}>
                  <SectionHeader title="Revenue trend" subtitle="Invoiced by month" />
                  <AreaChart
                    data={data.revenueByMonth}
                    labels={['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']}
                    tooltipLabels={MONTHS}
                    color={colors.primary}
                    formatY={(v) => fmtAutoKM(v, 1)}
                  />
                </Card>
              )}

              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <StatCard label="Purchase Value" value={curLine(data.purchaseByCur)} accent={colors.primary} icon={<Ionicons name="cart" size={16} color={colors.primary} />} sub="contracts" onPress={() => router.push('/(app)/contracts')} />
                </View>
                <View style={{ flex: 1 }}>
                  <StatCard label="Tonnage" value={fmtMT(data.totalMT)} accent={colors.warn} icon={<Ionicons name="cube" size={16} color={colors.warn} />} sub="purchased" onPress={() => router.push('/(app)/stocks')} />
                </View>
              </View>

              <ReceivablesCard byCur={data.receivables} onPress={() => router.push('/(app)/invoices?filter=Unpaid' as any)} />
              <AgingCard buckets={data.aging} onPress={() => router.push('/(app)/invoices?filter=Unpaid' as any)} />

              {Object.keys(data.miscByCur).length > 0 && (
                <StatCard label="Misc Invoices · not linked to contracts" value={curLine(data.miscByCur)} accent="#db2777" icon={<Ionicons name="receipt" size={16} color="#db2777" />} sub={`${data.miscCount} invoice${data.miscCount === 1 ? '' : 's'} in period`} onPress={() => router.push('/(app)/misc-invoices')} />
              )}

              <RankingCard title="Top Suppliers" subtitle="By purchase value (USD basis)" rows={data.topSuppliers} onPress={() => router.push('/(app)/contracts')} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
