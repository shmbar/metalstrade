import { useMemo, useRef, useState } from 'react';
import { View, ScrollView, RefreshControl, Animated } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Select, SkeletonList, ErrorState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useCollapsible } from '@/lib/collapse';
import { useSettings } from '@/store/settings';
import { usePrivacyStore, maskIfHidden } from '@/store/privacy';
import { useDashboard, DashboardFilters, ExpenseRow } from '@/features/dashboard/useDashboard';
import { ReceivablesCard, AgingCard } from '@/features/dashboard/components';
import {
  SummaryPanel,
  RankingGrid,
  TonnageCard,
  GisCommissionCard,
  MiscInvoicesCard,
  DetailSheet,
  DashDetail,
  DetailRow,
  fmtMTWhole,
} from '@/features/dashboard/webCards';
import { palette, layout } from '@/theme/tokens';
import { MarketsTicker } from '@/features/prices/MarketsTicker';
import { fmtCurKM, fmtMT, fmtAutoKM, curSymbol, moneyFull } from '@/lib/format';
import { spacing, radius, LIST_END_PADDING } from '@/theme/tokens';
import { routeKeyOf } from '@/lib/access';
import { useShallow } from 'zustand/react/shallow';
import { keyboardScrollProps } from '@/lib/keyboard';

export default function Dashboard() {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentUser, marginsLabel, canRoute } = useAuth(useShallow((s) => ({ currentUser: s.currentUser, marginsLabel: s.marginsLabel, canRoute: s.canRoute })));
  const hideBalances = usePrivacyStore((s) => s.hidden);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);
  // Scroll position drives the status-bar backdrop (fades in once the hero has
  // scrolled away), on the native driver so it costs the JS thread nothing.
  const scrollY = useRef(new Animated.Value(0)).current;
  // Admin-only shortcut straight to Margins — web calls that page 'Sharon Admin'
  // / 'Gis Admin' depending on the workspace (components/const.js:69), which is
  // also how mobile's More menu labels it, so the two match.
  const QUICK = [
    { label: 'New Contract', icon: 'add-circle', href: '/(app)/contracts/edit' },
    { label: 'Invoices', icon: 'receipt', href: '/(app)/invoices' },
    { label: 'Cashflow', icon: 'cash', href: '/(app)/cashflow' },
    ...(canRoute('margins')
      ? [{ label: marginsLabel, icon: 'stats-chart', href: '/(app)/margins' } as const]
      : []),
    { label: 'Assistant', icon: 'sparkles', href: '/(app)/assistant' },
  ] as const;
  const { dateSelect, settings } = useSettings(useShallow((s) => ({ dateSelect: s.dateSelect, settings: s.settings })));
  // Supplier / Client / Material filters — web parity. Every aggregate on the page
  // narrows with them.
  const [filters, setFilters] = useState<DashboardFilters>({ supplier: '', client: '', material: '' });
  // Bands start open, and collapse independently, as they do on web.
  /* Bands remember what this user left open (lib/collapse). Sales leads, so it starts
     open; the rest start folded to their heading — the client's "too much scrolling"
     was four full bands re-opening on every visit. */
  const [salesOpen, toggleSales] = useCollapsible('dash.sales', true);
  const [purchasingOpen, togglePurchasing] = useCollapsible('dash.purchasing', false);
  const [positionOpen, togglePosition] = useCollapsible('dash.position', false);
  const [otherOpen, toggleOther] = useCollapsible('dash.other', false);
  const open = { sales: salesOpen, purchasing: purchasingOpen, position: positionOpen, other: otherOpen };
  const toggle = (k: keyof typeof open) =>
    ({ sales: toggleSales, purchasing: togglePurchasing, position: togglePosition, other: toggleOther })[k]();

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
  // Access to this screen (and the redirect to a user's landing page) is enforced
  // by the (app) layout's per-page permission guard.

  const curLine = (byCur: Record<string, number>) => {
    const ents = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
    if (!ents.length) return '$0';
    return ents.map(([c, v]) => fmtCurKM(c, v)).join('  ');
  };

  const outstanding: Record<string, number> = {};
  if (data) Object.entries(data.receivables).forEach(([c, s]) => (outstanding[c] = s.due + s.balance));

  const firstName = currentUser.name.split(' ')[0] || 'there';

  /* ── What each card and tile opens — web's TILE_DETAILS / DetailModal ──────────
     Two shapes, as on web: rows for a figure with records behind it, a formula for a
     derived one whose detail IS the arithmetic. Built from the same data the tile
     reads, so a detail can never state a different number from its tile. */
  const [detail, setDetail] = useState<DashDetail | null>(null);
  const okFigure = scheme === 'dark' ? '#74B896' : palette.okFigure;
  const profitColor = (v: number) => (v < 0 ? colors.negative : okFigure);
  // Always the currency's symbol and two decimals (lib/format moneyFull) — this used to
  // print $1,234.5, and € for any currency that was not $.
  const money = (c: string, v: number) => moneyFull(c, v);
  const tonnes1 = (v: number) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(v || 0)} MT`;
  const sumOf = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((a, r) => a + (Number(f(r)) || 0), 0);
  const supName = (id: string) => settings?.Supplier?.Supplier?.find((x: any) => x.id === id)?.nname || 'GIS';

  const expenseRowsFor = (rows: ExpenseRow[], titleBy: 'type' | 'vendor'): DetailRow[] =>
    rows.map((r, i) => ({
      key: `${r.type}-${r.ref}-${r.date}-${i}`,
      title: titleBy === 'type' ? r.type : r.supplierName,
      meta: [titleBy === 'type' ? r.supplierName : '', r.ref ? `Invoice ${r.ref}` : '', r.order ? `PO ${r.order}` : '']
        .filter(Boolean)
        .join(' · '),
      sub: [r.date, r.paid, r.comments].filter(Boolean).join(' · '),
      value: fmtAutoKM(r.usd),
      valueSub: `${money(r.cur, r.amount)} as entered`,
    }));

  const openDetail = (kind: string, arg = '') => {
    if (!data) return;
    const d = data;
    const perCur = (rows: { cur: string; amount: number }[]) => {
      const by: Record<string, number> = {};
      rows.forEach((r) => (by[r.cur] = (by[r.cur] || 0) + r.amount));
      return Object.entries(by).map(([c, v]) => money(c, v)).join('  ');
    };
    const miscDetail = (title: string, subtitle: string, rows: typeof d.miscRows): DashDetail => ({
      title,
      subtitle,
      rows: rows.map((r, i) => ({
        key: `${r.invoice}-${i}`,
        title: r.invoice ? `Invoice ${r.invoice}` : '—',
        meta: [r.company, r.description].filter(Boolean).join(' · '),
        sub: [r.order && r.order !== '-' ? `PO ${r.order}` : '', r.date, r.paid].filter(Boolean).join(' · '),
        value: money(r.cur, r.amount),
      })),
      total: rows.length ? perCur(rows) : undefined,
    });

    const build = (): DashDetail | null => {
      switch (kind) {
        case 'contractExpenses':
          return {
            title: 'Contract Expenses',
            subtitle: `${d.expenseRows.length} expense records in the period · GIS commission excluded`,
            rows: expenseRowsFor(d.expenseRows, 'type'),
            total: fmtAutoKM(sumOf(d.expenseRows, (r) => r.usd)),
          };
        case 'companyExpenses':
          return {
            title: 'Company Expenses',
            subtitle: `${d.companyExpenseRows.length} overhead records in the period`,
            rows: d.companyExpenseRows.map((r, i) => ({
              key: `${r.ref}-${i}`,
              title: r.supplierName,
              meta: [r.ref ? `Ref ${r.ref}` : '', r.comments].filter(Boolean).join(' · '),
              sub: [r.date, r.paid].filter(Boolean).join(' · '),
              value: fmtAutoKM(r.usd),
              valueSub: `${money(r.cur, r.amount)} as entered`,
            })),
            total: fmtAutoKM(sumOf(d.companyExpenseRows, (r) => r.usd)),
          };
        case 'grossProfit':
          return {
            title: 'Gross Profit',
            subtitle: 'Taken from the Margins page, before company overheads',
            formula: [
              { label: 'Margins worksheet rows', value: String(d.marginsItems), note: "each row's margin × its quantity" },
              { label: 'GIS-shared rows counted at half', value: '50%', note: 'the Margins page halves profit on a shared deal' },
              { label: 'Gross Profit', value: fmtAutoKM(d.grossProfit), result: true },
            ],
          };
        case 'netProfit':
          return {
            title: 'Net Profit',
            subtitle: 'Gross profit after company overheads',
            formula: [
              { label: 'Gross Profit', value: fmtAutoKM(d.grossProfit), note: 'from the Margins page' },
              { label: 'less Company Expenses', value: `− ${fmtAutoKM(d.overheads)}`, note: `${d.companyExpenseCount} overhead records` },
              { label: 'Net Profit', value: fmtAutoKM(d.netProfit), result: true },
            ],
          };
        case 'averageRate':
          return {
            title: 'Average Rate',
            subtitle: 'Purchase cost per tonne',
            formula: [
              { label: 'Total contract value', value: fmtAutoKM(d.totalContracts), note: 'supplier invoices on contracts dated in the period' },
              { label: 'divided by tonnage purchased', value: fmtMTWhole(d.totalMT), note: 'from the Margins page' },
              { label: 'Average Rate', value: fmtAutoKM(d.avgCostPerMT), result: true },
            ],
          };
        case 'avgExpense':
          return {
            title: 'Avg Expense / MT',
            subtitle: 'Contract expenses per tonne purchased',
            formula: [
              { label: 'Contract expenses', value: fmtAutoKM(d.expensesTotal), note: `${d.expenseRows.length} records · GIS commission excluded` },
              { label: 'divided by tonnage purchased', value: fmtMTWhole(d.totalMT) },
              { label: 'Avg Expense / MT', value: fmtAutoKM(d.avgExpensePerMT), result: true },
            ],
          };
        case 'avgFreight': {
          const freight = d.expenseRows.filter((r) => /freight/i.test(r.type));
          return {
            title: 'Avg Freight / MT',
            subtitle: 'Freight expenses per tonne purchased',
            formula: [
              { label: 'Freight expenses', value: fmtAutoKM(d.freightTotal) },
              { label: 'divided by tonnage purchased', value: fmtMTWhole(d.totalMT) },
              { label: 'Avg Freight / MT', value: fmtAutoKM(d.avgFreightPerMT), result: true },
            ],
            rows: expenseRowsFor(freight, 'type'),
          };
        }
        case 'avgProfit':
          return {
            title: 'Avg Profit / MT',
            subtitle: 'Profit per tonne actually shipped',
            formula: [
              { label: 'Gross Profit', value: fmtAutoKM(d.grossProfit), note: 'from the Margins page' },
              { label: 'divided by tonnage SHIPPED', value: fmtMTWhole(d.shippedMT), note: 'shipped, not purchased — unsold stock has earned nothing yet' },
              { label: 'Avg Profit / MT', value: fmtAutoKM(d.avgProfitPerMT), result: true },
            ],
          };
        case 'suppliersTotal': {
          const rows = d.topSuppliers.map((sp) => {
            const cs = d.supplierContracts[sp.name] || [];
            return { name: sp.name, value: sp.value, paid: sumOf(cs, (r) => r.paid), contracts: cs.length, waiting: cs.filter((r) => r.invoices === 0).length };
          });
          return {
            title: 'Suppliers — Total Value',
            subtitle: `Every supplier in the period · ${rows.length} in total`,
            rows: rows.map((r) => ({
              key: r.name,
              title: r.name,
              meta: `${r.contracts} contract${r.contracts === 1 ? '' : 's'}${r.waiting ? ` · ${r.waiting} not invoiced yet` : ''}`,
              value: fmtAutoKM(r.value),
              valueSub: `Paid ${fmtAutoKM(r.paid)} · Balance ${fmtAutoKM(r.value - r.paid)}`,
            })),
            total: fmtAutoKM(sumOf(rows, (r) => r.value)),
          };
        }
        case 'supplier': {
          const cs = d.supplierContracts[arg] || [];
          const waiting = cs.filter((r) => r.invoices === 0).length;
          return {
            title: arg,
            subtitle: `Contracts bought from this supplier in the period${waiting ? ` · ${waiting} not invoiced yet` : ''}`,
            rows: cs.map((r, i) => ({
              key: `${r.order}-${i}`,
              title: r.order ? `PO ${r.order}` : '—',
              meta: [r.date, tonnes1(r.mt)].filter(Boolean).join(' · '),
              sub: r.lineValue > 0 ? `Contract value ${fmtAutoKM(r.lineValue)}` : 'No price entered',
              value: r.invoices === 0 ? 'Not invoiced yet' : r.value ? fmtAutoKM(r.value) : 'No amount entered',
              valueMuted: r.invoices === 0 || !r.value,
              valueSub: r.invoices === 0 ? undefined : `Paid ${fmtAutoKM(r.paid)} · Balance ${fmtAutoKM(r.value - r.paid)}`,
              valueTone: r.invoices > 0 && r.value - r.paid < -0.005 ? 'negative' : undefined,
            })),
            total: fmtAutoKM(sumOf(cs, (r) => r.value)),
          };
        }
        case 'consigneesTotal':
          return {
            title: 'Consignees — Total Value',
            subtitle: `Every client invoiced in the period · ${d.consignees.length} in total`,
            rows: d.consignees.map((c) => ({ key: c.name, title: c.name, value: fmtAutoKM(c.value) })),
            total: fmtAutoKM(d.revenueUsd),
          };
        case 'client': {
          const rows = d.consigneeDetails[arg] || [];
          return {
            title: arg,
            subtitle: 'Invoices issued to this client in the period',
            rows: rows.map((r, i) => ({
              key: `${r.invoice}-${i}`,
              title: `Invoice ${r.invoice}`,
              sub: r.date,
              value: fmtAutoKM(r.usd),
              valueSub: `${money(r.cur, r.amount)} as entered`,
            })),
            total: fmtAutoKM(sumOf(rows, (r) => r.usd)),
          };
        }
        case 'expensesTotal':
          return {
            title: 'Expenses by Type — Total',
            subtitle: 'Every expense type in the period · GIS commission excluded',
            rows: d.expByType.map((e) => ({ key: e.name, title: e.name, value: fmtAutoKM(e.value) })),
            total: fmtAutoKM(d.expensesTotal),
          };
        case 'expenseType': {
          const rows = d.expDetails[arg] || [];
          const vendors = new Set(rows.map((r) => r.supplierName)).size;
          const tot = sumOf(rows, (r) => r.usd);
          return {
            title: arg || 'Expenses',
            subtitle: `${rows.length} expense${rows.length === 1 ? '' : 's'} across ${vendors} supplier${vendors === 1 ? '' : 's'} · ${fmtAutoKM(tot)}`,
            rows: expenseRowsFor(rows, 'vendor'),
            total: fmtAutoKM(tot),
          };
        }
        case 'gis':
          return {
            title: 'GIS Commission',
            subtitle: 'Commission billed by GIS — held out of Contract Expenses',
            rows: d.gisCommission.rows.map((r: any, i: number) => ({
              key: `${r.ref}-${i}`,
              title: supName(r.supplier),
              meta: [r.ref ? `Invoice ${r.ref}` : '', r.order ? `PO ${r.order}` : ''].filter(Boolean).join(' · '),
              sub: [r.date, r.comments].filter(Boolean).join(' · '),
              value: fmtAutoKM(r.usd),
              valueSub: `${money(r.cur, r.amount)} as entered`,
            })),
            total: fmtAutoKM(d.gisCommission.total),
          };
        case 'tonnage':
          return {
            title: 'Tonnage — Purchased vs Shipped',
            subtitle: 'As recorded on the Margins page',
            formula: [
              { label: 'Purchased', value: fmtMTWhole(d.totalMT), note: 'Quantity column, all rows' },
              { label: 'Shipped', value: fmtMTWhole(d.shippedMT) },
              { label: 'Pending', value: fmtMTWhole(d.pendingMT), note: 'purchased − shipped · worth ' + fmtAutoKM(d.unsoldValue) },
              { label: 'Shipped share', value: `${d.totalMT > 0 ? Math.round((d.shippedMT / d.totalMT) * 100) : 0}%`, result: true },
            ],
          };
        case 'tonnage:purchased':
          return { title: 'Purchased', subtitle: 'Tonnage bought in this period, from the Margins page', formula: [{ label: 'Quantity column, all Margins rows', value: fmtMTWhole(d.totalMT), result: true }] };
        case 'tonnage:shipped':
          return {
            title: 'Shipped',
            subtitle: 'Tonnage shipped in this period, from the Margins page',
            formula: [
              { label: 'Shipped column, all Margins rows', value: fmtMTWhole(d.shippedMT) },
              { label: 'share of purchased', value: `${d.totalMT > 0 ? Math.round((d.shippedMT / d.totalMT) * 100) : 0}%`, result: true },
            ],
          };
        case 'tonnage:pending':
          return {
            title: 'Pending',
            subtitle: 'Bought but not yet shipped',
            formula: [
              { label: 'Purchased', value: fmtMTWhole(d.totalMT) },
              { label: 'less Shipped', value: '- ' + fmtMTWhole(d.shippedMT) },
              { label: 'Pending', value: fmtMTWhole(d.pendingMT), note: 'purchase value ' + fmtAutoKM(d.unsoldValue), result: true },
            ],
          };
        case 'receivables':
          return {
            title: 'Outstanding Receivables',
            subtitle: 'Open balances as of today — every period, not just this one',
            formula: Object.entries(d.receivables || {}).flatMap(([cur, r]) => {
              const f = (v: number) => moneyFull(cur, v);
              return [
                { label: `Finalized (${cur.toUpperCase()})`, value: f(r.finalized), note: `${r.finalizedCount} invoice${r.finalizedCount === 1 ? '' : 's'} · after the final invoice` },
                { label: `Provisional (${cur.toUpperCase()})`, value: f(r.provisional), note: `${r.provisionalCount} invoice${r.provisionalCount === 1 ? '' : 's'} · before the final invoice` },
                { label: `Total outstanding (${cur.toUpperCase()})`, value: f(r.finalized + r.provisional), result: true },
              ];
            }),
          };
        case 'aging':
          return {
            title: 'Receivables Aging',
            subtitle: 'Outstanding balances by invoice age, as of today',
            formula: (d.aging || []).map((b) => ({
              label: `${b.label} days`,
              note: `${b.count} invoice${b.count === 1 ? '' : 's'}`,
              value:
                Object.entries(b.byCur || {})
                  .map(([c, v]) => moneyFull(c, v))
                  .join(' · ') || '—',
            })),
          };
        case 'misc':
          return miscDetail('Misc Invoices', `${d.miscRows.length} standalone sales not linked to any contract`, d.miscRows);
        case 'miscCategory':
          return miscDetail(
            `Misc Invoices — ${arg.charAt(0).toUpperCase()}${arg.slice(1)}`,
            'Standalone sales in this category',
            d.miscRows.filter((r) => (['personal', 'random', 'shipments'].includes(r.category) ? r.category : 'uncategorized') === arg)
          );
        default:
          return null;
      }
    };
    setDetail(build());
  };



  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        {...keyboardScrollProps}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentContainerStyle={{ paddingBottom: LIST_END_PADDING }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} progressViewOffset={insets.top + 60} />}
      >
        {/* Gradient executive hero */}
        <LinearGradient
          colors={scheme === 'dark' ? ['#4A3BB0', '#131120'] : ['#8B7CF7', '#6D5CE0', '#4A3BB0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 10, paddingHorizontal: spacing.lg, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text variant="caption" color="rgba(255,255,255,0.7)">Welcome back</Text>
              <Text variant="h2" color="#ffffff">{firstName}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Privacy toggle — masks headline figures across the app (this
                  hero, Cashflow's Incoming/Outgoing, Margins' Profit/Incoming)
                  for a screen shared over someone's shoulder, the way every
                  banking app's eye icon works. One global switch, not a
                  per-screen one, so turning it on before you hand over your
                  phone actually covers the whole app. */}
              <Pressable
                haptic="selection" onPress={() => { togglePrivacy(); }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={hideBalances ? 'Show balances' : 'Hide balances'}
                style={{ width: layout.iconButton, height: layout.iconButton, borderRadius: layout.iconButton / 2, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={hideBalances ? 'eye-off' : 'eye'} size={17} color="#ffffff" />
              </Pressable>
              <PeriodSelector />
            </View>
          </View>

          <Pressable onPress={() => router.push('/(app)/invoices')} style={{ marginTop: 20 }}>
            <Text variant="caption" color="rgba(255,255,255,0.7)">Revenue · this period</Text>
            {/* ONE USD figure, like web's Sales Revenue KPI — the per-currency
                breakdown moves to the caption beneath so nothing is lost. */}
            <Text variant="hero" color="#ffffff" style={{ marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
              {data ? maskIfHidden(hideBalances, fmtAutoKM(data.revenueUsd)) : '—'}
            </Text>
            {data && Object.keys(data.revenueByCur).some((c) => curSymbol(c) !== '$') && (
              <Text variant="caption" color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }} numberOfLines={1}>
                {maskIfHidden(hideBalances, curLine(data.revenueByCur))}
              </Text>
            )}
            {trend && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Ionicons name={trend.pct >= 0 ? 'trending-up' : 'trending-down'} size={13} color={trend.pct >= 0 ? '#9CCFB4' : '#EDACA9'} />
                <Text variant="captionStrong" color={trend.pct >= 0 ? '#9CCFB4' : '#EDACA9'}>
                  {trend.pct >= 0 ? '+' : ''}{trend.pct.toFixed(1)}% {MONTHS[trend.last]} vs {MONTHS[trend.prev]}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Glass stat chips — each drills into its report */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {[
              { k: 'Contracts', v: data ? String(data.contractCount) : '—', href: '/(app)/contracts' },
              { k: 'Outstanding', v: data ? curLine(outstanding) : '—', href: '/(app)/invoices?filter=Unpaid' },
              { k: 'Tonnage', v: data ? fmtMT(data.totalMT) : '—', href: '/(app)/stocks' },
            ].filter((c) => canRoute(routeKeyOf(c.href))).map((c) => (
              <Pressable key={c.k} onPress={() => router.push(c.href as any)} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 10 }}>
                <Text variant="caption" color="rgba(255,255,255,0.7)" numberOfLines={1}>{c.k}</Text>
                <Text variant="bodyStrong" color="#ffffff" numberOfLines={1} adjustsFontSizeToFit={c.v.length > 9} style={{ marginTop: 2 }}>{c.v}</Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        {/* Filters — web's filter bar, as one swipeable row of chips instead of
            three full-width dropdowns stacked above the page. A chip shows its
            choice, tints while set, clears with its own ✕ and opens the picker. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 14 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, alignItems: 'center' }}
        >
          <Select variant="chip" label="Supplier" placeholder="All suppliers" value={filters.supplier} options={options.suppliers} onChange={(v) => setFilters((f) => ({ ...f, supplier: v }))} />
          <Select variant="chip" label="Client" placeholder="All clients" value={filters.client} options={options.clients} onChange={(v) => setFilters((f) => ({ ...f, client: v }))} />
          <Select variant="chip" label="Material" placeholder="All materials" value={filters.material} options={options.materials} onChange={(v) => setFilters((f) => ({ ...f, material: v }))} />
          {activeFilters > 0 && (
            <Pressable
              onPress={() => setFilters({ supplier: '', client: '', material: '' })}
              hitSlop={8}
              accessibilityRole="button"
              style={{ height: 36, justifyContent: 'center', paddingHorizontal: 6 }}
            >
              <Text variant="label" tone="primary">Clear all</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Quick actions — wraps to a second row once the admin-only 5th tile
            (Sharon/Gis Admin) joins the other four. */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, marginTop: layout.stack }}>
          {QUICK.filter((q) => canRoute(routeKeyOf(q.href))).map((q) => (
            /* Each tile takes an equal share of the row, so four actions or five
               (the admin-only workspace tile) both come out evenly spaced instead
               of wrapping one lonely tile onto a second line. */
            <Pressable key={q.label} onPress={() => router.push(q.href as any)} accessibilityRole="button" style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: colors.text, shadowOpacity: scheme === 'dark' ? 0.35 : 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
                <Ionicons name={q.icon as any} size={22} color={colors.primary} />
              </View>
              <Text variant="caption" tone="muted" numberOfLines={2} style={{ textAlign: 'center' }}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Markets - web's MarketsTicker: exchange rates + LME metal prices,
            both scrolling and refreshing live. */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: layout.stack }}>
          <MarketsTicker />
        </View>

        {/* Body */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: layout.stack }}>
          {isLoading && !data ? (
            <SkeletonList count={6} />
          ) : isError ? (
            <ErrorState message={(error as Error)?.message || 'Failed to load dashboard data.'} onRetry={refetch} />
          ) : data ? (
            <View style={{ gap: layout.stack }}>
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
              {open.sales && (
                // web: the ranking card leads with Total Value itself — no separate revenue card.
                <RankingGrid
                  title="Consignees — $"
                  subtitle="Sales revenue by client — invoices dated in the period"
                  rows={data.consignees.map((c) => ({ label: c.name, value: c.value }))}
                  total={data.revenueUsd}
                  totalLabel="Total Value"
                  series={data.consigneeSeries}
                  avatar
                  onTotal={() => openDetail('consigneesTotal')}
                  onPick={(name) => openDetail('client', name)}
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
                  {/* Web's eight summary tiles, in web's order, with web's notes. */}
                  <SummaryPanel
                    tiles={[
                      { label: 'Contract Expenses', value: fmtAutoKM(data.expensesTotal), note: 'freight, storage, commission…', icon: { set: 'ion', name: 'receipt-outline' }, tone: 'gray', onPress: () => openDetail('contractExpenses') },
                      { label: 'Company Expenses', value: fmtAutoKM(data.overheads), note: `${data.companyExpenseCount} recorded, period`, icon: { set: 'ion', name: 'business-outline' }, tone: 'gray', onPress: () => openDetail('companyExpenses') },
                      { label: 'Gross Profit', value: fmtAutoKM(data.grossProfit), note: 'deal basis, before overheads', icon: { set: 'ion', name: 'trending-up-outline' }, tone: data.grossProfit < 0 ? 'red' : 'green', valueColor: profitColor(data.grossProfit), onPress: () => openDetail('grossProfit') },
                      { label: 'Net Profit', value: fmtAutoKM(data.netProfit), note: 'after company expenses', icon: { set: 'ion', name: 'trending-up-outline' }, tone: data.netProfit < 0 ? 'red' : 'green', valueColor: profitColor(data.netProfit), onPress: () => openDetail('netProfit') },
                      { label: 'Average Rate', value: fmtAutoKM(data.avgCostPerMT), note: 'purchase cost per MT', icon: { set: 'ion', name: 'speedometer-outline' }, tone: 'blue', onPress: () => openDetail('averageRate') },
                      { label: 'Avg Expense / MT', value: fmtAutoKM(data.avgExpensePerMT), note: 'expenses per MT', icon: { set: 'ion', name: 'receipt-outline' }, tone: 'gray', onPress: () => openDetail('avgExpense') },
                      { label: 'Avg Freight / MT', value: fmtAutoKM(data.avgFreightPerMT), note: 'freight cost per MT', icon: { set: 'mci', name: 'truck-outline' }, tone: 'gray', onPress: () => openDetail('avgFreight') },
                      { label: 'Avg Profit / MT', value: fmtAutoKM(data.avgProfitPerMT), note: 'profit per MT', icon: { set: 'ion', name: 'trending-up-outline' }, tone: data.avgProfitPerMT < 0 ? 'red' : 'green', valueColor: profitColor(data.avgProfitPerMT), onPress: () => openDetail('avgProfit') },
                    ]}
                  />

                  <TonnageCard
                    purchased={data.totalMT}
                    shipped={data.shippedMT}
                    pending={data.pendingMT}
                    unsoldValue={data.unsoldValue}
                    onPress={() => openDetail('tonnage')}
                    onPill={(k) => openDetail(`tonnage:${k}`)}
                  />

                  {/* GIS COMMISSION — shown only when non-zero, exactly like web. */}
                  {data.gisCommission.total !== 0 && (
                    <GisCommissionCard
                      total={data.gisCommission.total}
                      byEntity={data.gisCommission.byEntity}
                      count={data.gisCommission.rows.length}
                      onPress={() => openDetail('gis')}
                    />
                  )}

                  {/* Web renamed this card 2026-09-03: it ranks SUPPLIERS by invoiced value. */}
                  <RankingGrid
                    title="Suppliers — $"
                    subtitle="Invoiced value by supplier — contracts dated in the period"
                    rows={data.topSuppliers.map((sp) => ({ label: sp.name, value: sp.value }))}
                    total={data.totalContracts}
                    totalLabel="Total Value"
                    series={data.supplierSeries}
                    avatar
                    onTotal={() => openDetail('suppliersTotal')}
                    onPick={(name) => openDetail('supplier', name)}
                  />

                  <RankingGrid
                    title="Expenses by Type"
                    subtitle="Freight, warehouse, commission, …"
                    rows={data.expByType.map((e) => ({ label: e.name, value: e.value }))}
                    total={data.expensesTotal}
                    totalLabel="Total"
                    accent={scheme === 'dark' ? '#B9A3C6' : palette.pinkText}
                    onTotal={() => openDetail('expensesTotal')}
                    onPick={(label) => openDetail('expenseType', label)}
                  />
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
                  <ReceivablesCard byCur={data.receivables} onPress={() => openDetail('receivables')} />
                  <AgingCard buckets={data.aging} onPress={() => openDetail('aging')} />
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
                <MiscInvoicesCard
                  byCur={data.miscByCur}
                  byCat={data.miscCategories}
                  count={data.miscCount}
                  onPress={() => openDetail('misc')}
                  onCategory={(cat) => openDetail('miscCategory', cat)}
                />
              )}
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>
      <DetailSheet detail={detail} onClose={() => setDetail(null)} />

      {/* Status-bar backdrop: transparent over the gradient hero, solid once the
          page has scrolled far enough that content would sit under the clock. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: colors.bg,
          opacity: scrollY.interpolate({ inputRange: [0, 140], outputRange: [0, 1], extrapolate: 'clamp' }),
        }}
      />
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
        <Text variant="h3" numberOfLines={1} style={{ flex: 1 }}>{title}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, marginLeft: 24 }}>
        <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {subtitle}
        </Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: muted ? colors.surfaceAlt : colors.primary + '1A',
            borderWidth: 1,
            borderColor: muted ? colors.border : colors.primary + '33',
            flexShrink: 0,
          }}
        >
          <Text variant="caption" style={{ color: muted ? colors.textFaint : colors.primary }} numberOfLines={1}>
            {period}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
