import React, { useMemo, useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { router } from '@/lib/nav';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Screen,
  Card,
  Text,
  Badge,
  Button,
  TextField,
  DateField,
  Skeleton,
  SkeletonList,
  ErrorState,
  SegmentedControl,
  Sheet,
  SearchField,
  KpiStrip,
  FoldSection,
  EntityRow,
  IconButton,
} from '@/components/ui';
import type { KpiItem } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { buildCashflowReport } from '@/features/cashflow/cashflowReport';
import { CashflowReportSheet } from '@/features/cashflow/CashflowReportSheet';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { usePrivacyStore, maskIfHidden } from '@/store/privacy';
import { useCashflow, Counterparty, StockLotRow, StockWarehouseRow, UnsoldSupplierRow } from '@/features/cashflow/useCashflow';
import { useCashflowActions } from '@/features/cashflow/useCashflowActions';
import { useSharedStock } from '@/features/stocks/useSharedStock';
import { curSymbol, fmtMoney, dateLabel, moneyFull, moneyLines } from '@/lib/format';
import { radius, spacing, layout } from '@/theme/tokens';
import { matchesAllWords, searchWords } from '@shared/search';
import { entityName } from '@/lib/entityName';
import { useShallow } from 'zustand/react/shallow';

/**
 * CASHFLOW — web's cashflow/page.js, in web's order, shaped for a phone.
 *
 * Structure (web, top to bottom; web's two-column grid reads left column then
 * right column on a narrow screen, which is the order used here):
 *   General Cashflow | Unsold Stocks tabs · find box
 *   KPI strip — Total Balance (admin), Clients due, Suppliers due, Expenses
 *   Opening balances (admin): Future (from Margins) + editable entries
 *   Stocks - Paid · Stocks - UnPaid · Shared Stock (IMS + GIS)
 *   Clients - Payment · Clients - Balances · Financing, left (admin)
 *   Supplier - Payment · Supplier - Balances · Expenses · Financing, right (admin)
 *   Total (Left) | Balance | Total (Right) + Total for {year} (admin)
 *
 * Web's accordions become rows that open a bottom sheet with the same columns;
 * web's per-section sort arrows become one sort control for the whole page. Every
 * figure comes from useCashflow, which is pinned to web's formulas.
 */

type Tab = 'general' | 'unsold';

/* Shown in place of a figure that needs the stock ledger while it is still loading — the
   rest of the page is already real (useCashflow: `stock` is null until the ledger is in). */
const STOCK_PENDING = '—';
const STOCK_PENDING_NOTE = 'Loading stock…';
type SortKey = 'amount' | 'name';
type Kind = 'client' | 'supplier' | 'expense';
type ManualField = 'initial' | 'financedLeft' | 'financedRight';


/* Every amount on Cashflow is exact, as web shows it (funcs.js showAmount) — client,
   2026-09-30: an abbreviated balance ($375.59K) is not the balance anyone pays against.
   curLine is for running text (one line); moneyLines stacks a currency per line for totals. */
const usd = (n: number) => moneyFull('us', n);
const curLine = (byCur: Record<string, number>) => {
  const ents = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
  if (!ents.length) return moneyFull('us', 0);
  return ents.map(([c, v]) => moneyFull(c, v)).join('  ');
};

/** Per-currency total across a section's rows — re-derived over exactly the rows shown. */
const sumCur = (rows: Counterparty[]): Record<string, number> => {
  const out: Record<string, number> = {};
  rows.forEach((r) => Object.entries(r.byCur).forEach(([c, v]) => (out[c] = (out[c] || 0) + v)));
  return out;
};

const qty = (n: number) => fmtMoney(n, 3);
// A credit (negative balance) reads -$500.00, not $-500.00 — the shared money format.
const full = (cur: string, n: number) => moneyFull(cur, n);

/** Per-currency sum of one field over a sheet's items — a sheet can hold $ and € rows, and
    one sum across both would print euros as dollars. */
const itemsByCur = (items: any[], key: string): Record<string, number> => {
  const out: Record<string, number> = {};
  items.forEach((x) => (out[x.cur || 'us'] = (out[x.cur || 'us'] || 0) + (Number(x[key]) || 0)));
  return out;
};

const FIELD_LABEL: Record<ManualField, string> = {
  initial: 'Opening balances',
  financedLeft: 'Financing (left)',
  financedRight: 'Financing (right)',
};

export default function Cashflow() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // `data` is everything that does not need the stock ledger; `stock` (null until the ledger
  // is in) holds every figure that does; `whole` is both, for the report.
  const { flows: data, stock, data: whole, isLoading, isError, error, refetch } = useCashflow();
  const isAdmin = useAuth((s) => s.isAdmin);
  const { settings, settingsLoaded, compData } = useSettings(useShallow((s) => ({ settings: s.settings, settingsLoaded: s.loaded, compData: s.compData })));
  const hideBalances = usePrivacyStore((s) => s.hidden);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);
  const money = (s: string) => maskIfHidden(hideBalances, s);
  const { paySupplier, payExpense, partialPay, payClient, saveManualRows, saveYearTotal, savePending, saveStockPending, closeBalance } = useCashflowActions();
  const shared = useSharedStock();

  const [tab, setTab] = useState<Tab>('general');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('amount');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [detail, setDetail] = useState<{ kind: Kind; cp: Counterparty } | null>(null);
  // Cargo status taps show at once, keyed by contract (every purchase invoice of a PO
  // shares it); the refetch after the write replaces this, a failure reverts it.
  // Pending holds flipped on this screen, by row — shown at once, before the refetch lands.
  const [held, setHeld] = useState<Record<string, boolean>>({});
  // Web supplierCloseBalance: book the residual as a settlement adjustment instead of
  // a payment. It moves money on the ledger, so it asks first — web's button does not,
  // but a mis-tap on a phone is far easier than a mis-click on a table.
  const confirmClose = (item: any) =>
    Alert.alert(
      'Close this balance?',
      `The remaining ${full(item.cur, item.balance)} on purchase invoice ${item.inv ?? ''} is recorded as a settlement adjustment. No payment is made.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close balance',
          style: 'destructive',
          onPress: () =>
            closeBalance.mutate(
              { contractId: item.contractId, contractDate: item.contractDate, poInvoiceId: item.poInvoiceId, inv: item.inv },
              { onSuccess: () => setDetail(null) }
            ),
        },
      ]
    );
  /* Pending — a payment on hold (web Cashflow PendingToggle, client 2026-09-24). A held
     invoice stays listed, faded, and leaves every active total; one tap holds it, one tap
     releases it. Replaces the RDY / TRN cargo status, as on web. */
  const holdKey = (item: any) => (item.kind === 'poInvoice' ? `po:${item.poInvoiceId}` : `inv:${item.raw?.id || item.id}`);
  const isHeld = (item: any) => held[holdKey(item)] ?? !!item.pending;
  const setPending = (item: any, flag: boolean) => {
    const key = holdKey(item);
    setHeld((p) => ({ ...p, [key]: flag }));
    savePending.mutate({ item, flag }, { onError: () => setHeld((p) => ({ ...p, [key]: !flag })) });
  };
  const [reportOpen, setReportOpen] = useState(false);
  // Stock lines flipped on this screen, by lot id — shown at once, put back if the write fails.
  const [stockHeld, setStockHeld] = useState<Record<string, boolean>>({});
  const setStockPending = (l: StockLotRow, flag: boolean) => {
    if (!l.holds?.length) return;
    setStockHeld((p) => ({ ...p, [l.id]: flag }));
    saveStockPending.mutate({ holds: l.holds, flag }, { onError: () => setStockHeld((p) => ({ ...p, [l.id]: !flag })) });
  };
  const [stockSheet, setStockSheet] = useState<{ name: string; row: StockWarehouseRow } | null>(null);
  const [unsoldSheet, setUnsoldSheet] = useState<UnsoldSupplierRow | null>(null);
  const [payItem, setPayItem] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryEditor, setEntryEditor] = useState<{ field: ManualField; index: number | null; title: string; num: string } | null>(null);
  const [yearDraft, setYearDraft] = useState<Record<number, string>>({});

  const whName = (id: string) => entityName(settings?.Stocks?.Stocks, id, 'warehouse', settingsLoaded);
  // Built only while the Report sheet is open (after whName, which it uses), and only from a
  // complete page — its totals include stock.
  const report = useMemo(
    () => (reportOpen && whole ? buildCashflowReport(whole, { isAdmin, warehouseName: (id) => whName(id) }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reportOpen, whole, isAdmin]
  );

  // Web's find box filters ROWS by name; section totals keep covering the full
  // period (web says so next to the box, and so does this screen).
  const words = searchWords(query);
  const arrange = <T,>(rows: T[], amountOf: (r: T) => number, nameOf: (r: T) => string): T[] =>
    rows
      .filter((r) => matchesAllWords(nameOf(r), words))
      .sort((a, b) => (sort === 'name' ? nameOf(a).localeCompare(nameOf(b)) : amountOf(b) - amountOf(a)));

  const manualRowsOf = (field: ManualField) =>
    field === 'initial' ? data?.manualInitialRows : field === 'financedLeft' ? data?.financedLeftRows : data?.financedRightRows;

  // ── payments ───────────────────────────────────────────────────────────────
  const onAction = (item: any) => {
    if (item.kind === 'invoice' || item.kind === 'poInvoice') {
      setAmount('');
      setPayDate(new Date().toISOString().slice(0, 10));
      setPayItem(item);
      return;
    }
    Alert.alert('Mark paid?', `Mark expense ${item.expense ?? ''} paid?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark paid',
        onPress: async () => {
          try {
            await payExpense.mutateAsync({ id: item.id, date: item.date, poSupplier: item.poSupplier });
            setDetail(null);
          } catch (e: any) {
            Alert.alert('Failed', e?.message || 'Could not record payment.');
          }
        },
      },
    ]);
  };

  const submitPartial = async () => {
    if (!payItem) return;
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('Invalid amount', 'Enter a payment amount greater than zero.');
      return;
    }
    try {
      if (payItem.kind === 'invoice') {
        await payClient.mutateAsync({ invoice: payItem.raw, amount: amt, dateIso: payDate });
      } else {
        const perc = payItem.balance > 0 ? Number(((amt / payItem.balance) * 100).toFixed(1)) : 0;
        await partialPay.mutateAsync({
          ref: { contractId: payItem.contractId, contractDate: payItem.contractDate, poInvoiceId: payItem.poInvoiceId },
          amount: amt,
          perc,
          dateIso: payDate,
        });
      }
      setPayItem(null);
      setDetail(null);
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not record payment.');
    }
  };

  const payFull = async () => {
    if (!payItem) return;
    try {
      if (payItem.kind === 'invoice') {
        await payClient.mutateAsync({ invoice: payItem.raw, amount: payItem.balance, dateIso: payDate });
      } else {
        await paySupplier.mutateAsync({
          contractId: payItem.contractId,
          contractDate: payItem.contractDate,
          poInvoiceId: payItem.poInvoiceId,
        });
      }
      setPayItem(null);
      setDetail(null);
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not record payment.');
    }
  };

  // ── manual rows (web saveInitData — the whole field's array is re-saved) ──
  const openEntryEditor = (field: ManualField, index: number | null) => {
    if (index == null) {
      setEntryEditor({ field, index: null, title: '', num: '' });
      return;
    }
    const r = manualRowsOf(field)?.[index];
    setEntryEditor({ field, index, title: r?.title || '', num: r?.num != null ? String(r.num) : '' });
  };

  const saveEntry = async () => {
    if (!entryEditor) return;
    const rowsNow = manualRowsOf(entryEditor.field);
    if (!rowsNow) return;
    const title = entryEditor.title.trim();
    const numVal = parseFloat(entryEditor.num);
    if (!title) {
      Alert.alert('Missing title', 'Enter a name for this entry.');
      return;
    }
    if (!Number.isFinite(numVal)) {
      Alert.alert('Invalid amount', 'Enter a numeric amount.');
      return;
    }
    const rows = rowsNow.map((r) => ({ title: r.title, num: String(r.num) }));
    if (entryEditor.index == null) rows.push({ title, num: String(numVal) });
    else rows[entryEditor.index] = { title, num: String(numVal) };
    try {
      await saveManualRows.mutateAsync({ field: entryEditor.field, rows });
      setEntryEditor(null);
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not save.');
    }
  };

  const deleteEntry = () => {
    if (!entryEditor || entryEditor.index == null) return;
    const { field, index } = entryEditor;
    const rowsNow = manualRowsOf(field);
    if (!rowsNow) return;
    Alert.alert('Delete entry?', `Remove "${rowsNow[index]?.title}" from ${FIELD_LABEL[field]}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const rows = rowsNow.filter((_, i) => i !== index).map((r) => ({ title: r.title, num: String(r.num) }));
          try {
            await saveManualRows.mutateAsync({ field, rows });
            setEntryEditor(null);
          } catch (e: any) {
            Alert.alert('Failed', e?.message || 'Could not delete.');
          }
        },
      },
    ]);
  };

  // ── admin "Total for {year}" — saved when the field loses focus ────────────
  const commitYear = (year: number, stored: string) => {
    const draft = yearDraft[year];
    if (draft == null || draft === stored) return;
    saveYearTotal.mutate(
      { year, value: draft },
      {
        onSuccess: () =>
          setYearDraft((d) => {
            const next = { ...d };
            delete next[year];
            return next;
          }),
        onError: (e: any) => Alert.alert('Failed', e?.message || 'Could not save the year total.'),
      }
    );
  };

  // ── derived rows (search + sort) ───────────────────────────────────────────
  const stocksPaid = stock ? arrange(stock.stocksPaid, (r) => r.total, (r) => whName(r.stock)) : [];
  const stocksUnpaid = stock ? arrange(stock.stocksUnpaid, (r) => r.total, (r) => whName(r.stock)) : [];
  const byCp = (rows: Counterparty[]) => arrange(rows, (r) => r.usd, (r) => r.name);
  const clientsNoPay = data ? byCp(data.clientsNoPayment) : [];
  const clientsBal = data ? byCp(data.clientsWithBalance) : [];
  const suppliersNoPay = data ? byCp(data.suppliersNoPayment) : [];
  const suppliersBal = data ? byCp(data.suppliersWithBalance) : [];
  const expenses = data ? byCp(data.expenseSuppliers) : [];
  const unsold = stock ? arrange(stock.unsoldBySupplier, (r) => r.total, (r) => r.name) : [];
  const sharedMatches = matchesAllWords('Shared Stock inventory IMS GIS', words);

  const kpis: KpiItem[] = data
    ? [
        ...(isAdmin
          ? [
              {
                key: 'balance',
                label: 'Total Balance',
                value: stock ? money(usd(stock.balance)) : STOCK_PENDING,
                icon: 'wallet' as const,
                tone: !stock ? ('default' as const) : stock.balance >= 0 ? ('positive' as const) : ('negative' as const),
                sub: stock ? 'Left − right totals' : STOCK_PENDING_NOTE,
              },
            ]
          : []),
        { key: 'clients', label: 'Clients due', value: money(usd(data.kpi.clientsDue)), icon: 'people' as const, tone: 'primary' as const },
        { key: 'suppliers', label: 'Suppliers due', value: money(usd(data.kpi.suppliersDue)), icon: 'business' as const, tone: 'warn' as const },
        { key: 'expenses', label: 'Expenses', value: money(usd(data.kpi.expenses)), icon: 'receipt' as const, tone: 'negative' as const },
      ]
    : [];

  const emptyRow = (none: string) => (
    <Text variant="body" tone="faint" style={{ paddingHorizontal: layout.cardInset, paddingBottom: layout.cardInset }}>
      {words.length ? 'No matches' : none}
    </Text>
  );

  const counterpartyRows = (rows: Counterparty[], kind: Kind, valueOf: (r: Counterparty) => string, noun: string) =>
    rows.length
      ? rows.map((r, i) => (
          <EntityRow
            key={r.name}
            first={i === 0}
            name={r.name}
            subtitle={`${r.count} ${noun}${r.count === 1 ? '' : 's'}${r.pendingCount ? ` · ${r.pendingCount} pending` : ''}`}
            value={money(valueOf(r))}
            onPress={() => setDetail({ kind, cp: r })}
          />
        ))
      : emptyRow('None outstanding');

  const warehouseRows = (rows: StockWarehouseRow[]) =>
    rows.length
      ? rows.map((w, i) => (
          <EntityRow
            key={w.stock}
            first={i === 0}
            name={whName(w.stock)}
            subtitle={`${w.count} lot${w.count === 1 ? '' : 's'}${w.pendingCount ? ` · ${w.pendingCount} pending` : ''}`}
            value={money(usd(w.total))}
            onPress={() => setStockSheet({ name: whName(w.stock), row: w })}
          />
        ))
      : emptyRow('No stock');

  const manualSection = (field: ManualField, icon: React.ComponentProps<typeof Ionicons>['name'], fixed?: { label: string; hint: string; value: number }) => {
    const rows = manualRowsOf(field) || [];
    const total = rows.reduce((s, r) => s + r.num, 0) + (fixed?.value || 0);
    return (
      <FoldSection id={`cashflow.manual.${field}`} defaultOpen icon={icon} title={FIELD_LABEL[field]} subtitle="Admin only" total={money(usd(total))}>
        {fixed ? <EntityRow first avatar={false} name={fixed.label} subtitle={fixed.hint} value={money(usd(fixed.value))} /> : null}
        {rows.map((r, i) => (
          <EntityRow
            key={`${field}-${i}`}
            first={!fixed && i === 0}
            avatar={false}
            name={r.title}
            value={money(usd(r.num))}
            onPress={() => openEntryEditor(field, i)}
          />
        ))}
        <Pressable
          onPress={() => openEntryEditor(field, null)}
          accessibilityRole="button"
          accessibilityLabel={`Add entry to ${FIELD_LABEL[field]}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: layout.cardInset,
            paddingVertical: layout.rowPad,
            borderTopWidth: fixed || rows.length ? StyleSheet.hairlineWidth : 0,
            borderTopColor: colors.borderStrong,
          }}
        >
          <Ionicons name="add-circle" size={20} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">
            Add entry
          </Text>
        </Pressable>
      </FoldSection>
    );
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false} refreshing={isLoading} onRefresh={refetch}>
      <ScreenHeader
        subtitle="Stocks, clients, suppliers & expenses"
        title="Cashflow"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* The page as one report — web's Report button (eb201c9f). */}
            <IconButton icon="document-text-outline" accessibilityLabel="Cashflow report" disabled={!whole} onPress={() => setReportOpen(true)} />
            <IconButton
              icon={hideBalances ? 'eye-off-outline' : 'eye-outline'}
              accessibilityLabel={hideBalances ? 'Show balances' : 'Hide balances'}
              haptic="selection"
              onPress={() => {
                togglePrivacy();
              }}
            />
          </View>
        }
      />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'general', label: 'General Cashflow' },
          { value: 'unsold', label: 'Unsold Stocks' },
        ]}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={tab === 'unsold' ? 'Find a supplier' : 'Find a client, supplier or stock'}
          style={{ flex: 1 }}
        />
        <Pressable
          haptic="selection"
          onPress={() => {
            setSort((s) => (s === 'amount' ? 'name' : 'amount'));
          }}
          accessibilityRole="button"
          accessibilityLabel={sort === 'amount' ? 'Sorted by amount — sort by name' : 'Sorted by name — sort by amount'}
          style={{
            height: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: layout.cardInset,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name={sort === 'amount' ? 'swap-vertical' : 'text'} size={15} color={colors.textMuted} />
          <Text variant="label" tone="muted">
            {sort === 'amount' ? 'Amount' : 'A–Z'}
          </Text>
        </Pressable>
      </View>
      {words.length ? (
        <Text variant="caption" tone="faint" style={{ marginTop: 6, marginLeft: 6 }}>
          Rows only — totals cover the full period
        </Text>
      ) : null}

      <View style={{ height: 8 }} />

      {isLoading && !data ? (
        <SkeletonList count={6} />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load cashflow.'} onRetry={refetch} />
      ) : !data ? null : tab === 'unsold' ? (
        /* ══ UNSOLD STOCKS tab — web page.js:1370 ══════════════════════════════ */
        // Every line of this tab is worked out from the stock ledger.
        !stock ? (
          <SkeletonList count={4} />
        ) : (
          <FoldSection
            id="cashflow.unsold"
            defaultOpen
            icon="cube-outline"
            title="Unsold Stocks"
            subtitle={`${stock.unsoldBySupplier.length} supplier${stock.unsoldBySupplier.length === 1 ? '' : 's'}`}
            total={money(usd(stock.unsoldTotal))}
            totalTone="warn"
          >
            {unsold.length
              ? unsold.map((r, i) => (
                  <EntityRow
                    key={r.supplier}
                    first={i === 0}
                    name={r.name}
                    subtitle={`${r.items.length} line${r.items.length === 1 ? '' : 's'}`}
                    value={money(moneyFull(r.cur, r.total))}
                    onPress={() => setUnsoldSheet(r)}
                  />
                ))
              : emptyRow('No unsold stocks')}
          </FoldSection>
        )
      ) : (
        /* ══ GENERAL CASHFLOW tab ═════════════════════════════════════════════ */
        <View style={{ gap: layout.stack }}>
          <KpiStrip items={kpis} />

          {isAdmin &&
            manualSection('initial', 'wallet-outline', {
              label: 'Future',
              hint: 'From the Margins page — updates automatically',
              value: data.incoming,
            })}

          {stock ? (
            <FoldSection id="cashflow.stocksPaid" icon="cube-outline" title="Stocks - Paid" subtitle={`${stocksPaid.length} warehouse${stocksPaid.length === 1 ? '' : 's'}`} total={money(usd(stock.stocksPaidTotal))}>
              {warehouseRows(stocksPaid)}
            </FoldSection>
          ) : (
            <FoldSection id="cashflow.stocksPaid" icon="cube-outline" title="Stocks - Paid" subtitle={STOCK_PENDING_NOTE} total={STOCK_PENDING}>
              <View style={{ gap: 10, paddingHorizontal: layout.cardInset, paddingBottom: layout.cardInset }}>
                <Skeleton width="60%" />
                <Skeleton width="45%" />
              </View>
            </FoldSection>
          )}

          {stock && stock.stocksUnpaid.length > 0 && (
            <FoldSection id="cashflow.stocksUnpaid" icon="cube-outline" title="Stocks - UnPaid" subtitle={`${stocksUnpaid.length} warehouse${stocksUnpaid.length === 1 ? '' : 's'}`} total={money(usd(stock.stocksUnpaidTotal))} totalTone="warn">
              {warehouseRows(stocksUnpaid)}
            </FoldSection>
          )}

          {/* Web page.js:1604 — informational: the joint pool has no purchase
              invoices, so it joins none of the totals. Opens the Shared tab. */}
          {shared.rows.length > 0 && sharedMatches && (
            <FoldSection id="cashflow.shared" defaultOpen icon="layers-outline" title="Shared Stock (IMS + GIS)" total={money(moneyLines(shared.money.totals))}>
              <EntityRow
                first
                avatar={false}
                name={`Shared Inventory · ${shared.rows.length} lot${shared.rows.length === 1 ? '' : 's'}`}
                subtitle={`IMS ${money(curLine(shared.money.fin.IMS))}  ·  GIS ${money(curLine(shared.money.fin.GIS))}`}
                onPress={() => router.push('/(app)/stocks?tab=shared')}
              />
            </FoldSection>
          )}

          <FoldSection
            id="cashflow.clientsNoPayment"
            icon="people-outline"
            title="Clients - Payment"
            subtitle="No payment recorded yet"
            total={money(moneyLines(sumCur(data.clientsNoPayment)))}
            totalTone="positive"
          >
            {counterpartyRows(clientsNoPay, 'client', (r) => moneyLines(r.byCur), 'invoice')}
          </FoldSection>

          <FoldSection
            id="cashflow.clientsBalances"
            icon="people-outline"
            title="Clients - Balances"
            subtitle="Partly paid — balance remaining"
            total={money(moneyLines(sumCur(data.clientsWithBalance)))}
            totalTone="positive"
          >
            {counterpartyRows(clientsBal, 'client', (r) => moneyLines(r.byCur), 'invoice')}
          </FoldSection>

          {isAdmin && manualSection('financedLeft', 'cash-outline')}

          <FoldSection
            id="cashflow.suppliersNoPayment"
            icon="business-outline"
            title="Supplier - Payment"
            subtitle="Nothing paid yet"
            total={money(usd(data.suppliersNoPayment.reduce((s, r) => s + r.usd, 0)))}
            totalTone="negative"
          >
            {counterpartyRows(suppliersNoPay, 'supplier', (r) => usd(r.usd), 'invoice')}
          </FoldSection>

          <FoldSection
            id="cashflow.suppliersBalances"
            icon="business-outline"
            title="Supplier - Balances"
            subtitle="Partly paid — balance remaining"
            total={money(usd(data.suppliersWithBalance.reduce((s, r) => s + r.usd, 0)))}
            totalTone="negative"
          >
            {counterpartyRows(suppliersBal, 'supplier', (r) => usd(r.usd), 'invoice')}
          </FoldSection>

          <FoldSection id="cashflow.expenses" icon="receipt-outline" title="Expenses" subtitle="Unpaid" total={money(usd(data.expensesUsd))} totalTone="negative">
            {counterpartyRows(expenses, 'expense', (r) => usd(r.usd), 'expense')}
          </FoldSection>

          {isAdmin && manualSection('financedRight', 'cash-outline')}

          {/* Web page.js:2074 — the totals strip and the year totals, admin only. */}
          {isAdmin && (
            <Card>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: 'Total (Left)', value: stock ? stock.totalLeft : null, filled: false },
                  { label: 'Balance', value: stock ? stock.balance : null, filled: true },
                  { label: 'Total (Right)', value: data.totalRight, filled: false },
                ].map((t) => (
                  <View
                    key={t.label}
                    style={{
                      flex: 1,
                      borderRadius: radius.lg,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      backgroundColor: t.filled ? colors.primary : colors.primary + '14',
                    }}
                  >
                    <Text variant="caption" color={t.filled ? colors.primaryText : colors.textMuted} numberOfLines={1}>
                      {t.label}
                    </Text>
                    <Text
                      variant="bodyStrong"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      color={t.filled ? colors.primaryText : colors.text}
                      style={{ marginTop: 3 }}
                    >
                      {t.value == null ? STOCK_PENDING : money(usd(t.value))}
                    </Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => setShowBreakdown((v) => !v)}
                accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 14, paddingBottom: 4 }}
              >
                <Text variant="label" tone="primary">
                  {showBreakdown ? 'Hide breakdown' : 'How the balance is made up'}
                </Text>
                <Ionicons name={showBreakdown ? 'chevron-up' : 'chevron-down'} size={15} color={colors.primary} />
              </Pressable>

              {showBreakdown && (
                <View style={{ marginTop: 8 }}>
                  <Line label="Future (margins)" v={money(usd(data.incoming))} />
                  <Line label="Opening entries" v={money(usd(data.manual.initial))} />
                  <Line label="Stocks paid" v={stock ? money(usd(stock.stocksPaidTotal)) : STOCK_PENDING} />
                  <Line label="Stocks unpaid" v={stock ? money(usd(stock.stocksUnpaidTotal)) : STOCK_PENDING} />
                  <Line label="Client receivables" v={money(usd(data.kpi.clientsDue))} />
                  <Line label="Financing (left)" v={money(usd(data.manual.financedLeft))} />
                  <Line label="Total (Left)" v={stock ? money(usd(stock.totalLeft)) : STOCK_PENDING} strong />
                  <View style={{ height: 8 }} />
                  <Line label="Supplier payables" v={money(usd(data.payablesUsd))} />
                  <Line label="Unpaid expenses" v={money(usd(data.expensesUsd))} />
                  <Line label="Financing (right)" v={money(usd(data.manual.financedRight))} />
                  <Line label="Total (Right)" v={money(usd(data.totalRight))} strong />
                </View>
              )}

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, marginVertical: 12 }} />
              {data.yearTotals.map((yt) => (
                <View key={yt.year} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Text variant="body" tone="muted" style={{ flex: 1 }}>
                    Total for {yt.year}
                  </Text>
                  <View style={{ width: 170 }}>
                    <TextField
                      value={yearDraft[yt.year] ?? yt.value}
                      onChangeText={(v) => setYearDraft((d) => ({ ...d, [yt.year]: v.replace(/[^0-9.]/g, '') }))}
                      onEndEditing={() => commitYear(yt.year, yt.value)}
                      placeholder="$0.00"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}
                    />
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>
      )}

      {/* ── Counterparty sheet (web ClientDetails / SupplierDetails / ExpensesToolTip) ── */}
      <Sheet
        visible={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.cp.name}
        subtitle={detail ? (() => {
          const active = detail.cp.items.filter((x: any) => !isHeld(x));
          const bal = detail.kind === 'expense' ? itemsByCur(active, 'amount') : itemsByCur(active, 'balance');
          const nHeld = detail.cp.items.length - active.length;
          return `${money(curLine(bal))} · ${active.length} item${active.length === 1 ? '' : 's'}${nHeld ? ` · ${nHeld} pending` : ''}`;
        })() : undefined}
        footer={
          detail?.cp.items?.length ? (
            <View style={{ gap: 4 }}>
              {(() => {
                const items = detail.cp.items;
                if (detail.kind === 'expense') return <SheetTotal label="Total amount" v={money(moneyLines(itemsByCur(items, 'amount')))} strong />;
                // Web FooterRows: the held invoices on a faded "Pending (n)" line, then the
                // active total — the only one that counts.
                const active = items.filter((x: any) => !isHeld(x));
                const pending = items.filter((x: any) => isHeld(x));
                const value = (xs: any[]) => {
                  const a = itemsByCur(xs, 'invValue');
                  Object.entries(itemsByCur(xs, 'amount')).forEach(([c, v]) => (a[c] = (a[c] || 0) + v));
                  return a;
                };
                return (
                  <>
                    {pending.length > 0 && (
                      <View style={{ opacity: 0.72 }}>
                        <SheetTotal label={`Pending (${pending.length})`} v={money(moneyLines(itemsByCur(pending, 'balance')))} />
                      </View>
                    )}
                    <SheetTotal label="Total value" v={money(moneyLines(value(active)))} />
                    <SheetTotal label="Total paid" v={money(moneyLines(itemsByCur(active, 'paid')))} />
                    <SheetTotal label={`Total balance (${active.length})`} v={money(moneyLines(itemsByCur(active, 'balance')))} strong />
                  </>
                );
              })()}
            </View>
          ) : undefined
        }
      >
        {(detail?.cp.items || []).map((item: any, i: number) => {
          const isExp = item.kind === 'expense';
          const title = item.kind === 'invoice'
            ? `Invoice #${item.number}${item.marker || ''}`
            : item.kind === 'poInvoice'
              ? `Purchase inv ${item.inv ?? ''}`
              : item.expense || 'Expense';
          const prepay = item.kind === 'invoice' && !item.paid && item.percentage > 0
            // Web relabelled this column "Payment" (2fe7bccb): it tracks what the client has
            // PAID, not necessarily paid early.
            ? `Payment ${item.percentage}% · ${full(item.cur, (item.amount * item.percentage) / 100)}`
            : '';
          // Supplier purchase invoices don't show planned ETD/ETA (web 3eb1cdae); client
          // invoices keep theirs.
          const isPo = item.kind === 'poInvoice';
          const dates = [
            !isPo && item.etd ? `ETD ${dateLabel(item.etd)}` : '',
            !isPo && item.eta ? `ETA ${dateLabel(item.eta)}` : '',
            isExp && item.date ? dateLabel(item.date) : '',
          ].filter(Boolean).join(' · ');
          const onHold = !isExp && isHeld(item);
          return (
            <View
              key={`${item.id || item.poInvoiceId || i}`}
              style={{ paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.borderStrong, opacity: onHold ? 0.72 : 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {title}
                    </Text>
                    {(item.isFinal || item.marker === 'FN') && <Badge label="Final" tone="info" />}
                  </View>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {isExp ? [`PO ${item.order}`, item.expType].filter(Boolean).join(' · ') : `PO ${item.order || '—'}`}
                  </Text>
                  {!isExp && (
                    <Text variant="caption" tone="faint" numberOfLines={1}>
                      {`${item.kind === 'poInvoice' ? 'Value' : 'Amount'} ${money(full(item.cur, item.invValue ?? item.amount ?? 0))} · Paid ${money(full(item.cur, item.paid ?? 0))}`}
                    </Text>
                  )}
                  {!isExp && (
                    <PendingToggle on={onHold} onPress={() => setPending(item, !onHold)} what="invoice" />
                  )}
                  {prepay ? (
                    <Text variant="caption" tone="primary" numberOfLines={1}>
                      {money(prepay)}
                    </Text>
                  ) : null}
                  {dates ? (
                    <Text variant="caption" tone="faint" numberOfLines={1}>
                      {dates}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Text variant="bodyStrong">
                    {money(full(item.cur, isExp ? item.amount ?? 0 : item.balance ?? 0))}
                  </Text>
                  <Pressable
                    onPress={() => onAction(item)}
                    accessibilityRole="button"
                    style={{
                      paddingHorizontal: layout.cardInset,
                      paddingVertical: 7,
                      borderRadius: radius.pill,
                      backgroundColor: colors.primary + '1A',
                    }}
                  >
                    <Text variant="label" tone="primary">
                      {isExp ? 'Mark paid' : 'Pay'}
                    </Text>
                  </Pressable>
                  {isPo && Math.abs(Number(item.balance) || 0) > 0.011 && (
                    <Pressable
                      onPress={() => confirmClose(item)}
                      disabled={closeBalance.isPending}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Close balance"
                    >
                      <Text variant="caption" tone="muted" style={{ textDecorationLine: 'underline' }}>
                        Close balance
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </Sheet>

      {/* ── Warehouse lots sheet (web StoclToolTip) ── */}
      <Sheet
        visible={!!stockSheet}
        onClose={() => setStockSheet(null)}
        title={stockSheet?.name}
        subtitle={stockSheet ? `${stockSheet.row.count} lot${stockSheet.row.count === 1 ? '' : 's'}` : undefined}
        footer={
          stockSheet ? (
            <View style={{ gap: 4 }}>
              {/* Stocks - UnPaid: rows whose purchase invoices are all on hold (web Pending),
                  on a faded line of their own above the total that counts. */}
              {stockSheet.row.pendingCount > 0 && (
                <View style={{ opacity: 0.72 }}>
                  <SheetTotal label={`Pending (${stockSheet.row.pendingCount})`} v={money(usd(stockSheet.row.pendingTotal))} />
                </View>
              )}
              <SheetTotal label="Total" v={money(usd(stockSheet.row.total))} strong />
            </View>
          ) : undefined
        }
      >
        {(stockSheet?.row.items || []).map((l, i) => {
          const held = stockHeld[l.id] ?? !!l.pending;
          return (
            <View key={`${l.id}-${i}`} style={{ opacity: held ? 0.72 : 1 }}>
              <DetailLine
                first={i === 0}
                title={`PO ${l.order || '—'}`}
                lines={[l.description, l.supplierName, `${qty(l.qnty)} × ${full(l.cur, l.unitPrc)}`, held ? 'Pending — invoice on hold' : ''].filter(Boolean)}
                draft={draftChipFor(data?.draftMaterials, l.draftKeys)}
                value={money(full(l.cur, l.total))}
              />
              {/* Web a074b342: hold a stock line from Stocks - UnPaid itself. */}
              {l.holds?.length ? (
                <View style={{ paddingBottom: 8 }}>
                  <PendingToggle on={held} onPress={() => setStockPending(l, !held)} what="stock line" />
                </View>
              ) : null}
            </View>
          );
        })}
      </Sheet>

      <CashflowReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        report={report}
        company={String((compData as any)?.name || '')}
        money={money}
      />

      {/* ── Unsold supplier sheet (web StocksUnSold) ── */}
      <Sheet
        visible={!!unsoldSheet}
        onClose={() => setUnsoldSheet(null)}
        title={unsoldSheet?.name}
        subtitle={unsoldSheet ? `${unsoldSheet.items.length} line${unsoldSheet.items.length === 1 ? '' : 's'} unsold` : undefined}
        footer={unsoldSheet ? <SheetTotal label="Total" v={money(moneyFull(unsoldSheet.cur, unsoldSheet.total))} strong /> : undefined}
      >
        {(unsoldSheet?.items || []).map((l, i) => (
          <DetailLine
            key={`${l.order}-${i}`}
            first={i === 0}
            title={`PO ${l.order || '—'}`}
            lines={[l.description, l.stockName, `${qty(l.qnty)} × ${full(l.cur, l.unitPrc)}`]}
            draft={draftChipFor(data?.draftMaterials, l.draftKeys)}
            value={money(full(l.cur, l.total))}
          />
        ))}
      </Sheet>

      {/* ── Record a payment ── */}
      <Sheet
        visible={!!payItem}
        onClose={() => setPayItem(null)}
        title="Record payment"
        subtitle={
          payItem
            ? `${payItem.kind === 'invoice' ? `Invoice #${payItem.number}` : `Purchase inv ${payItem.inv ?? ''}`} · balance ${money(full(payItem.cur, payItem.balance))}`
            : undefined
        }
        footer={
          <View style={{ gap: 10 }}>
            <Button title="Record payment" loading={partialPay.isPending || payClient.isPending} onPress={submitPartial} />
            <Button title="Pay full balance" variant="ghost" loading={paySupplier.isPending} onPress={payFull} />
          </View>
        }
      >
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[25, 50, 75, 100].map((p) => (
              <Pressable
                key={p}
                onPress={() => payItem && setAmount(((payItem.balance * p) / 100).toFixed(2))}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <Text variant="label" tone="primary">
                  {p}%
                </Text>
              </Pressable>
            ))}
          </View>
          <TextField
            label={`Amount (${curSymbol(payItem?.cur || 'us').trim() || 'USD'})`}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            autoFocus
          />
          <DateField label="Payment date" value={payDate} onChange={setPayDate} />
        </View>
      </Sheet>

      {/* ── Add / edit a manual row (admin) ── */}
      <Sheet
        visible={!!entryEditor}
        onClose={() => setEntryEditor(null)}
        title={entryEditor?.index == null ? 'Add entry' : 'Edit entry'}
        subtitle={entryEditor ? FIELD_LABEL[entryEditor.field] : undefined}
        footer={
          <View style={{ gap: 10 }}>
            <Button title="Save" loading={saveManualRows.isPending} onPress={saveEntry} />
            {entryEditor?.index != null && (
              <Button title="Delete entry" variant="danger" loading={saveManualRows.isPending} onPress={deleteEntry} />
            )}
          </View>
        }
      >
        {entryEditor && (
          <View style={{ gap: spacing.md }}>
            <TextField
              label="Title"
              value={entryEditor.title}
              onChangeText={(v) => setEntryEditor({ ...entryEditor, title: v })}
              placeholder="e.g. Airwallex"
              autoFocus={entryEditor.index == null}
            />
            <TextField
              label="Amount (USD)"
              value={entryEditor.num}
              onChangeText={(v) => setEntryEditor({ ...entryEditor, num: v })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

/** One line of the balance breakdown — label and figure at one size (web .cf-uniform). */
function Line({ label, v, strong }: { label: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text variant={strong ? 'bodyStrong' : 'body'} tone={strong ? 'default' : 'muted'}>
        {label}
      </Text>
      <Text variant={strong ? 'bodyStrong' : 'bodyMedium'}>
        {v}
      </Text>
    </View>
  );
}

/* Pending — a payment on hold (web PendingToggle). One tap holds, one releases. Deliberately
   no warning colour — the client asked for the existing palette at reduced strength. */
function PendingToggle({ on, onPress, what }: { on: boolean; onPress: () => void; what: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      haptic="selection"
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={on ? 'Pending — tap to release' : `Put this ${what} on hold`}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 26,
        paddingHorizontal: 9,
        marginTop: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderStyle: on ? 'solid' : 'dashed',
        borderColor: colors.borderStrong,
        backgroundColor: on ? colors.surfaceAlt : 'transparent',
      }}
    >
      {on && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted }} />}
      <Text variant={on ? 'captionStrong' : 'caption'} style={{ color: on ? colors.textMuted : colors.textFaint }}>
        {on ? 'Pending' : 'Set pending'}
      </Text>
    </Pressable>
  );
}

/** A total line pinned in a sheet's footer. */
function SheetTotal({ label, v, strong }: { label: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text variant={strong ? 'bodyStrong' : 'body'} tone={strong ? 'default' : 'muted'}>
        {label}
      </Text>
      {/* One line per currency when a total spans several (lib/format moneyLines). */}
      <Text variant={strong ? 'bodyStrong' : 'bodyMedium'} style={{ textAlign: 'right' }}>
        {v}
      </Text>
    </View>
  );
}

/** A read-only row inside a drill-down sheet: bold title, stacked detail lines, figure on the right. */
/** web DraftUseBadge: "Draft 5.202" — the weight already on draft invoices. */
function draftChipFor(map: Record<string, { invoices: (string | number)[]; qnty: number }> | undefined, keys: string[]) {
  const use = keys.map((k) => map?.[k]).find((u) => u && u.invoices.length);
  if (!use) return undefined;
  const q = Number(use.qnty) || 0;
  const label = q > 0 ? `Draft ${q.toFixed(3)}` : 'Draft';
  return { label, note: `on draft invoice${use.invoices.length > 1 ? 's' : ''} ${use.invoices.join(', ')}` };
}

function DetailLine({
  title,
  lines,
  value,
  first,
  draft,
}: {
  title: string;
  lines: string[];
  value: string;
  first?: boolean;
  draft?: { label: string; note: string };
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: colors.borderStrong,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {draft && <Badge label={draft.label} tone="warn" />}
        </View>
        {draft && (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {draft.note} — not shipped, still counts as stock
          </Text>
        )}
        {lines.filter(Boolean).map((l, i) => (
          <Text key={i} variant="caption" tone={i === 0 ? 'muted' : 'faint'} numberOfLines={2}>
            {l}
          </Text>
        ))}
      </View>
      <Text variant="bodyStrong">
        {value}
      </Text>
    </View>
  );
}
