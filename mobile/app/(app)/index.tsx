import { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card, ProgressBar, Select, SectionHeader, SkeletonList, ErrorState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useDashboard, DashboardFilters } from '@/features/dashboard/useDashboard';
import { ReceivablesCard, AgingCard, RankingCard } from '@/features/dashboard/components';
import { MetalPricesStrip } from '@/features/prices/MetalPricesStrip';
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
  const { dateSelect } = useSettings();
  // Supplier / Client / Material filters — web parity. Every aggregate on the page
  // narrows with them.
  const [filters, setFilters] = useState<DashboardFilters>({ supplier: '', client: '', material: '' });
  // Bands start open, and collapse independently, as they do on web.
  const [open, setOpen] = useState({ purchasing: true, sales: true, position: true, other: true });
  const toggle = (k: keyof typeof open) => setOpen((p2) => ({ ...p2, [k]: !p2[k] }));

  /* Band period chips. Web spells these out ("01 Jan - 31 Dec 2026") rather than
     echoing the raw range, because the point is to tell the reader what the
     figures below actually count. */
  const dLabel = (iso: string) => {
    const [y, m, d] = String(iso).split("-");
    const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return y && m && d ? `${Number(d)} ${MON[Number(m) - 1]} ${y}` : iso;
  };
  const periodLabel = `${dLabel(dateSelect.start)} - ${dLabel(dateSelect.end)}`;
  const todayLabel = dLabel(new Date().toISOString().slice(0, 10));
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
          colors={scheme === 'dark' ? ['#4A3BB0', '#131120'] : ['#8B7CF7', '#6D5CE0', '#4A3BB0']}
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
                <Ionicons name={trend.pct >= 0 ? 'trending-up' : 'trending-down'} size={13} color={trend.pct >= 0 ? '#9CCFB4' : '#EDACA9'} />
                <Text variant="caption" color={trend.pct >= 0 ? '#9CCFB4' : '#EDACA9'} style={{ fontFamily: 'Inter_600SemiBold' }}>
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

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: 18 }}>
          {QUICK.map((q) => (
            <Pressable key={q.label} onPress={() => router.push(q.href as any)} style={{ alignItems: 'center', gap: 6, width: '23%' }}>
              <View style={{ width: 54, height: 54, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: '#1E1B39', shadowOpacity: scheme === 'dark' ? 0.35 : 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
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
              {/* ══ BAND 1 — SALES ════════════════════════════════════════════
                  Web renders Sales FIRST (dashboard/page.js:2582, ahead of
                  Purchasing & costs at :2604) — the only two figures on the page
                  counted by INVOICE date, deliberately kept apart from the
                  contract-dated block below. Mobile had Purchasing first. */}
              <Band
                title="Sales"
                subtitle="What was invoiced to clients in this period, whenever the material was bought"
                period={`Invoices dated ${periodLabel}`}
                open={open.sales}
                onToggle={() => toggle('sales')}
              />
              {open.sales && data.consignees.length > 0 && (
                // web's ranking card now LEADS with Total Value itself (page.js
                // "Total Value is the headline") — no separate Sales Revenue card.
                <RankingCard
                  title="Consignees — $"
                  subtitle="Sales revenue by client — invoices dated in the period"
                  rows={data.consignees}
                  total={data.revenueUsd}
                  onPress={() => router.push('/(app)/invoices')}
                />
              )}

              {/* ══ BAND 2 — PURCHASING & COSTS ═══════════════════════════════ */}
              <Band
                title="Purchasing & costs"
                subtitle="Tonnage and profit as recorded on the Margins page · costs from the Expenses pages"
                period={`Contracts dated ${periodLabel}`}
                open={open.purchasing}
                onToggle={() => toggle('purchasing')}
              />
              {open.purchasing && (
                <>
                  {/* Web's eight tiles, in web's order (page.js:2178-2252). Mobile used
                      to show a different set entirely — COGS, Storage Spend, Unsold
                      Stock, Purchase Value — so the two apps did not even name the same
                      figures, let alone agree on them. */}
                  <Tiles
                    items={[
                      { k: 'Contract Expenses', v: fmtAutoKM(data.expensesTotal) },
                      { k: 'Company Expenses', v: fmtAutoKM(data.overheads) },
                      { k: 'Gross Profit', v: fmtAutoKM(data.grossProfit), tone: 'positive' as const },
                      {
                        k: 'Net Profit',
                        v: fmtAutoKM(data.netProfit),
                        tone: data.netProfit >= 0 ? ('positive' as const) : ('negative' as const),
                      },
                      { k: 'Average Rate', v: fmtAutoKM(data.avgCostPerMT) },
                      { k: 'Avg Expense / MT', v: fmtAutoKM(data.avgExpensePerMT) },
                      { k: 'Avg Freight / MT', v: fmtAutoKM(data.avgFreightPerMT) },
                      { k: 'Avg Profit / MT', v: fmtAutoKM(data.avgProfitPerMT) },
                    ]}
                  />

                  {/* Web's TonnageCard: purchased / shipped / pending PLUS the unsold
                      value. All three now read off the Margins worksheet, like web. */}
                  <Card>
                    <SectionHeader
                      title="Tonnage"
                      subtitle={`${data.totalMT > 0 ? Math.round((data.shippedMT / data.totalMT) * 100) : 0}% shipped`}
                    />
                    <ProgressBar
                      pct={data.totalMT > 0 ? (data.shippedMT / data.totalMT) * 100 : 0}
                      color={colors.primary}
                      height={8}
                    />
                    <View style={{ flexDirection: 'row', marginTop: 12 }}>
                      {[
                        { k: 'Purchased', v: fmtMT(data.totalMT), c: colors.primary },
                        { k: 'Shipped', v: fmtMT(data.shippedMT), c: colors.positive },
                        { k: 'Pending', v: fmtMT(data.pendingMT), c: colors.warn },
                      ].map((t) => (
                        <View key={t.k} style={{ flex: 1 }}>
                          <Text variant="caption" tone="muted">{t.k}</Text>
                          <Text variant="bodyMedium" style={{ color: t.c, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                            {t.v}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        marginTop: 12,
                        paddingTop: 10,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text variant="caption" tone="muted">Unsold stock · capital tied up</Text>
                      <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>
                        {fmtAutoKM(data.unsoldValue)}
                      </Text>
                    </View>
                  </Card>

                  {/* GIS COMMISSION — held out of Contract Expenses because it is money
                      moving between the two houses, not a cost of trading (Zak,
                      2026-09-02). Shown only when non-zero, exactly like web. */}
                  {data.gisCommission.total !== 0 && (
                    <Card onPress={() => router.push('/(app)/expenses')}>
                      <SectionHeader title="GIS Commission" subtitle="Excluded from Contract Expenses" />
                      <Text
                        variant="h3"
                        style={{ color: colors.info, fontVariant: ['tabular-nums'] }}
                      >
                        {fmtAutoKM(data.gisCommission.total)}
                      </Text>
                      {data.gisCommission.byEntity.length > 0 && (
                        <View style={{ marginTop: 8, gap: 4 }}>
                          {data.gisCommission.byEntity.map((e) => (
                            <View key={e.name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                                {e.name}
                              </Text>
                              <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{fmtAutoKM(e.value)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </Card>
                  )}

                  <RankingCard
                    title="Contracts — $"
                    subtitle="Contribution breakdown by contract values"
                    rows={data.topSuppliers}
                    total={data.totalContracts}
                    onPress={() => router.push('/(app)/contracts')}
                  />

                  {data.expByType.length > 0 && (
                    <Card>
                      <SectionHeader title="Expenses by Type" subtitle="Freight, warehouse, commission, …" />
                      {data.expByType.map((e) => (
                        <View
                          key={e.name}
                          style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}
                        >
                          <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                            {e.name}
                          </Text>
                          <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{fmtAutoKM(e.value)}</Text>
                        </View>
                      ))}
                    </Card>
                  )}
                </>
              )}

              {/* ══ BAND 3 — POSITION ═════════════════════════════════════════ */}
              <Band
                title="Position"
                subtitle="Money still owed to you — a running total, not a period figure"
                period={`Open balances as of ${todayLabel}`}
                muted
                open={open.position}
                onToggle={() => toggle('position')}
              />
              {open.position && (
                <>
                  <ReceivablesCard byCur={data.receivables} onPress={() => router.push('/(app)/invoices?filter=Unpaid')} />
                  <AgingCard buckets={data.aging} onPress={() => router.push('/(app)/invoices?filter=Unpaid' as any)} />
                </>
              )}

              {/* ══ BAND 4 — OTHER ════════════════════════════════════════════ */}
              <Band
                title="Other"
                subtitle="Standalone sales not linked to any contract"
                period={`Dated ${periodLabel}`}
                muted
                open={open.other}
                onToggle={() => toggle('other')}
              />
              {open.other && (
                <Card onPress={() => router.push('/(app)/misc-invoices')}>
                  <SectionHeader title="Misc invoices" subtitle="By category" />
                  <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>{curLine(data.miscByCur)}</Text>
                  <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{data.miscCount} invoice(s)</Text>
                </Card>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * A dashboard band header — web's BandHeader (dashboard/page.js:2154 onward).
 *
 * The point of these is not decoration: each band states WHICH DATE BASIS the
 * figures under it use. Purchasing is contract-dated, Sales is invoice-dated, and
 * Position is a running total as of today, not a period figure at all. Without
 * that on screen a reader has no way to tell why Sales Revenue and Purchase Value
 * disagree — which is exactly the confusion that let mobile's Net Profit mix an
 * invoice-dated revenue with contract-dated costs and be wrong by 5x.
 *
 * Position and Other are `muted` on web so the two period bands stay visually
 * paired and those read as a different kind of thing.
 */
function Band({
  title,
  subtitle,
  period,
  muted,
  open,
  onToggle,
}: {
  title: string;
  subtitle: string;
  period: string;
  muted?: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={{ marginTop: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textFaint} />
        <Text variant="h3" style={{ flex: 1 }}>{title}</Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: muted ? colors.surfaceAlt : colors.primary + '1A',
            borderWidth: 1,
            borderColor: muted ? colors.border : colors.primary + '33',
          }}
        >
          <Text variant="caption" style={{ color: muted ? colors.textFaint : colors.primary }} numberOfLines={1}>
            {period}
          </Text>
        </View>
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: 3, marginLeft: 24 }}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

/** The band-1 KPI grid — two columns, matching web's tile row. */
function Tiles({ items }: { items: { k: string; v: string; tone?: 'positive' | 'negative' }[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {items.map((t) => (
        <Card key={t.k} style={{ width: '47.5%' }}>
          <Text variant="caption" tone="muted" numberOfLines={1}>{t.k}</Text>
          <Text
            variant="bodyMedium"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{
              marginTop: 2,
              fontVariant: ['tabular-nums'],
              color: t.tone === 'positive' ? colors.positive : t.tone === 'negative' ? colors.negative : colors.text,
            }}
          >
            {t.v}
          </Text>
        </Card>
      ))}
    </View>
  );
}
