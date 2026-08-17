import { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatCard, Text, Card, ProgressBar, Select, SectionHeader, SkeletonList, ErrorState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useDashboard, DashboardFilters } from '@/features/dashboard/useDashboard';
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
  // Supplier / Client / Material filters — web parity. Every aggregate on the page
  // narrows with them.
  const [filters, setFilters] = useState<DashboardFilters>({ supplier: '', client: '', material: '' });
  const { data, options, isLoading, isError, error, refetch } = useDashboard(filters);
  const activeFilters = [filters.supplier, filters.client, filters.material].filter(Boolean).length;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Month-over-month delta — port of web's computeTrend (dashboard/page.js:98).
  // Walks back to the LAST month that actually has data, then to the most recent
  // month before it with a finite value. Mobile used to pin the comparison to the
  // CURRENT calendar month, so viewing a past year compared against a month that
  // is almost always zero and the badge simply never appeared.
  const trend = useMemo(() => {
    const series = data?.revenueByMonth;
    if (!Array.isArray(series) || series.length < 2) return null;
    let last = -1;
    for (let i = series.length - 1; i >= 0; i--) {
      if (Number.isFinite(series[i]) && series[i] !== 0) { last = i; break; }
    }
    if (last <= 0) return null;
    let prev = -1;
    for (let i = last - 1; i >= 0; i--) {
      if (Number.isFinite(series[i])) { prev = i; break; }
    }
    if (prev < 0) return null;
    const before = series[prev];
    if (!before) return null;
    // Divide by |before| so a negative prior month still yields a signed delta.
    const pct = ((series[last] - before) / Math.abs(before)) * 100;
    if (!Number.isFinite(pct)) return null;
    return { pct, last, prev };
  }, [data?.revenueByMonth]);

  // Web parity: 'accounting' users are restricted to the accounting view.
  // NOTE: every hook must run BEFORE this early return.
  if (userTitle === 'accounting') return <Redirect href="/(app)/accounting" />;

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

          <Pressable onPress={() => router.push('/(app)/invoices')} style={{ marginTop: 20 }}>
            <Text variant="caption" color="rgba(255,255,255,0.7)">Revenue · this period</Text>
            {/* ONE USD figure, like web's Sales Revenue KPI — the per-currency
                breakdown moves to the caption beneath so nothing is lost. */}
            <Text variant="display" color="#ffffff" style={{ fontSize: 36, lineHeight: 42, marginTop: 2, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
              {data ? fmtAutoKM(data.revenueUsd) : '—'}
            </Text>
            {data && Object.keys(data.revenueByCur).length > 0 && (
              <Text variant="caption" color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }} numberOfLines={1}>
                {curLine(data.revenueByCur)}
              </Text>
            )}
            {trend && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Ionicons name={trend.pct >= 0 ? 'trending-up' : 'trending-down'} size={13} color={trend.pct >= 0 ? '#7ce3a8' : '#ffb3ab'} />
                <Text variant="caption" color={trend.pct >= 0 ? '#7ce3a8' : '#ffb3ab'} style={{ fontFamily: 'Inter_600SemiBold' }}>
                  {trend.pct >= 0 ? '+' : ''}{trend.pct.toFixed(1)}% {MONTHS[trend.last]} vs {MONTHS[trend.prev]}
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

        {/* Filters — narrow every figure below (web's filter bar). */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="funnel-outline" size={15} color={colors.textMuted} />
            <Text variant="caption" tone="muted">Filters</Text>
            {activeFilters > 0 && (
              <Pressable onPress={() => setFilters({ supplier: '', client: '', material: '' })} hitSlop={8} style={{ marginLeft: 'auto' }}>
                <Text variant="caption" tone="primary">Clear ({activeFilters})</Text>
              </Pressable>
            )}
          </View>
          <Select label="" value={filters.supplier} options={[{ value: '', label: 'All suppliers' }, ...options.suppliers]} onChange={(v) => setFilters((f) => ({ ...f, supplier: v }))} />
          <Select label="" value={filters.client} options={[{ value: '', label: 'All clients' }, ...options.clients]} onChange={(v) => setFilters((f) => ({ ...f, client: v }))} />
          <Select label="" value={filters.material} options={[{ value: '', label: 'All materials' }, ...options.materials]} onChange={(v) => setFilters((f) => ({ ...f, material: v }))} />
        </View>

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
              {/* Removed on client request (2026-08-17): the "Revenue, costs & profit"
                  3-series chart and the "Revenue trend" card.
                  On a phone the three overlaid series were unreadable — the legend
                  collided with the plot and the dashed profit line was easily misread
                  as data ending rather than flattening. The same figures are stated
                  exactly, and unambiguously, by the Net Profit / COGS / Avg-Profit-per-MT
                  tiles immediately below, which is how a small screen should carry them.
                  Web keeps its version of the 3-series chart (dashboard/page.js:1689),
                  where the width makes it legible; "Revenue trend" had no web
                  counterpart at all, so dropping it moved mobile TOWARDS parity.
                  The underlying series (dealRevenueByMonth, cogsByMonth, profitByMonth,
                  revenueByMonth) are still computed and still covered by the parity
                  suite — nothing was deleted from the data layer, so restoring either
                  card is a UI change only. */}

              {/* Sold-basis P&L — web's Net Profit / COGS / Expenses / Storage /
                  Avg-Profit-per-MT KPIs. Deal basis: attributed to the CONTRACT
                  month at the CONTRACT rate, deliberately unlike the invoice-dated
                  revenue figure in the hero above. */}
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <StatCard
                    label="Net Profit"
                    value={fmtAutoKM(data.netProfit)}
                    accent={data.netProfit >= 0 ? colors.positive : colors.negative}
                    icon={<Ionicons name={data.netProfit >= 0 ? 'trending-up' : 'trending-down'} size={16} color={data.netProfit >= 0 ? colors.positive : colors.negative} />}
                    sub="sold basis"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <StatCard
                    label="Cost of Goods Sold"
                    value={fmtAutoKM(data.cogs)}
                    accent={colors.negative}
                    icon={<Ionicons name="pricetag" size={16} color={colors.negative} />}
                    sub="sold portion"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <StatCard label="Other Expenses" value={fmtAutoKM(data.expensesTotal)} accent={colors.warn} icon={<Ionicons name="card" size={16} color={colors.warn} />} sub="contract expenses" onPress={() => router.push('/(app)/expenses')} />
                </View>
                <View style={{ flex: 1 }}>
                  <StatCard label="Storage Spend" value={fmtAutoKM(data.storageTotal)} accent={colors.warn} icon={<Ionicons name="business" size={16} color={colors.warn} />} sub="storage + warehouse" onPress={() => router.push('/(app)/stocks')} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <StatCard label="Avg Profit / MT" value={fmtAutoKM(data.avgProfitPerMT)} accent={colors.primary} icon={<Ionicons name="analytics" size={16} color={colors.primary} />} sub={`${fmtMT(data.shippedMT)} shipped`} />
                </View>
                <View style={{ flex: 1 }}>
                  <StatCard label="Unsold Stock" value={fmtAutoKM(data.unsoldValue)} accent={colors.warn} icon={<Ionicons name="albums" size={16} color={colors.warn} />} sub="capital tied up" onPress={() => router.push('/(app)/stocks')} />
                </View>
              </View>

              {/* An EUR contract with no usable rate is counted 1:1 — web surfaces
                  this so a silently understated total is visible. */}
              {data.missingRate > 0 && (
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="warning-outline" size={16} color={colors.warn} />
                  <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                    {data.missingRate} EUR contract{data.missingRate === 1 ? '' : 's'} have no exchange rate — counted 1:1, so totals may read low.
                  </Text>
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

              {/* Live alerts — web's pill row. Counts come off the receivables slots. */}
              {(data.dueCount > 0 || data.balanceCount > 0) && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {data.dueCount > 0 && (
                    <Pressable
                      onPress={() => router.push('/(app)/invoices?filter=Unpaid')}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.negative }}
                    >
                      <Ionicons name="alert-circle-outline" size={14} color={colors.negative} />
                      <Text variant="caption" style={{ color: colors.negative }}>Due invoices {data.dueCount}</Text>
                    </Pressable>
                  )}
                  {data.balanceCount > 0 && (
                    <Pressable
                      onPress={() => router.push('/(app)/invoices?filter=Unpaid')}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.warn }}
                    >
                      <Ionicons name="time-outline" size={14} color={colors.warn} />
                      <Text variant="caption" style={{ color: colors.warn }}>Balance invoices {data.balanceCount}</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {/* Tonnage — purchased vs shipped vs pending (web's Tonnage card). */}
              <Card>
                <SectionHeader
                  title="Tonnage — purchased vs shipped"
                  subtitle={`${data.totalMT > 0 ? Math.round((data.shippedMT / data.totalMT) * 100) : 0}% shipped`}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { k: 'Purchased', v: data.totalMT, c: colors.primary },
                    { k: 'Shipped', v: data.shippedMT, c: colors.positive },
                    { k: 'Pending', v: data.pendingMT, c: colors.warn },
                  ].map((t) => (
                    <View key={t.k} style={{ flex: 1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 10 }}>
                      <Text variant="caption" tone="muted">{t.k}</Text>
                      <Text variant="bodyMedium" numberOfLines={1} style={{ marginTop: 2, color: t.c, fontVariant: ['tabular-nums'] }}>
                        {fmtMT(t.v)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>

              {/* Capital breakdown — how deal-basis revenue was allocated. */}
              <Card>
                <SectionHeader title="Capital breakdown" subtitle={`Revenue ${fmtAutoKM(data.dealRevenue)} · sold basis`} />
                {[
                  { k: 'Cost of Goods Sold', v: data.cogs, c: colors.primary },
                  { k: 'Other Expenses', v: data.expensesTotal, c: colors.warn },
                  { k: 'Net Profit', v: data.netProfit, c: data.netProfit >= 0 ? colors.positive : colors.negative },
                ].map((r, i) => {
                  const pct = data.dealRevenue > 0 ? (r.v / data.dealRevenue) * 100 : 0;
                  return (
                    <View key={r.k} style={{ paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border, gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text variant="body" tone="muted">{r.k}</Text>
                        <Text variant="bodyMedium" style={{ color: r.c, fontVariant: ['tabular-nums'] }}>{fmtAutoKM(r.v)}</Text>
                      </View>
                      <ProgressBar pct={Math.max(0, Math.min(100, pct))} color={r.c} height={7} />
                    </View>
                  );
                })}
              </Card>

              {/* Per-MT unit economics (web's Per-MT Metrics strip). */}
              <Card>
                <SectionHeader title="Per-MT metrics" subtitle="Unit economics for the period" />
                {[
                  { k: 'Total MT purchased', v: fmtMT(data.totalMT) },
                  { k: 'Avg cost / MT', v: fmtAutoKM(data.avgCostPerMT) },
                  { k: 'Avg expense / MT', v: fmtAutoKM(data.avgExpensePerMT) },
                  { k: 'Avg freight / MT', v: fmtAutoKM(data.avgFreightPerMT) },
                  { k: 'Avg profit / MT', v: fmtAutoKM(data.avgProfitPerMT) },
                ].map((r, i) => (
                  <View
                    key={r.k}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
                  >
                    <Text variant="body" tone="muted">{r.k}</Text>
                    <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>{r.v}</Text>
                  </View>
                ))}
              </Card>

              {/* Most-sold material — tonnage attributed by each contract's sold fraction. */}
              {data.materialSold.length > 0 && (
                <RankingCard
                  title="Most-sold material"
                  subtitle="By tonnage sold this period"
                  rows={data.materialSold.map((r) => ({ name: r.name, value: r.value }))}
                  format={(v: number) => fmtMT(v)}
                />
              )}

              {/* Expenses by type — web's breakdown card. */}
              {data.expByType.length > 0 && (
                <Card>
                  <SectionHeader title="Expenses by type" subtitle={`${data.expByType.length} categor${data.expByType.length === 1 ? 'y' : 'ies'}`} />
                  {data.expByType.map((e, i) => (
                    <View
                      key={e.name}
                      style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border,
                      }}
                    >
                      <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>{e.name}</Text>
                      <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>{fmtAutoKM(e.value)}</Text>
                    </View>
                  ))}
                </Card>
              )}

              <ReceivablesCard byCur={data.receivables} onPress={() => router.push('/(app)/invoices?filter=Unpaid' as any)} />
              <AgingCard buckets={data.aging} onPress={() => router.push('/(app)/invoices?filter=Unpaid' as any)} />

              {Object.keys(data.miscByCur).length > 0 && (
                <StatCard label="Misc Invoices · not linked to contracts" value={curLine(data.miscByCur)} accent="#db2777" icon={<Ionicons name="receipt" size={16} color="#db2777" />} sub={`${data.miscCount} invoice${data.miscCount === 1 ? '' : 's'} in period`} onPress={() => router.push('/(app)/misc-invoices')} />
              )}

              {/* Misc invoices by category — web's 4-way breakdown. */}
              {data.miscByCat.length > 0 && (
                <Card>
                  <SectionHeader title="Misc invoices by category" subtitle={`${data.miscCount} invoice(s) in period`} />
                  {data.miscByCat.map((c, i) => {
                    const total = data.miscByCat.reduce((a, b) => a + b.amount, 0);
                    const share = total > 0 ? (c.amount / total) * 100 : 0;
                    return (
                      <View key={c.name} style={{ paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text variant="body" style={{ textTransform: 'capitalize' }}>{c.name}</Text>
                          <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>{fmtAutoKM(c.amount)}</Text>
                        </View>
                        <Text variant="caption" tone="faint">{c.count} inv · {share.toFixed(0)}%</Text>
                      </View>
                    );
                  })}
                </Card>
              )}

              <RankingCard title="Top Suppliers" subtitle="By purchase value (USD basis)" rows={data.topSuppliers} onPress={() => router.push('/(app)/contracts')} />

              {/* Consignees — web's second ranking list, by client sales volume. */}
              {data.consignees.length > 0 && (
                <RankingCard title="Consignees" subtitle="By client sales volume" rows={data.consignees} onPress={() => router.push('/(app)/invoices')} />
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
