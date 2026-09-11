import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { router } from 'expo-router';
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
  SkeletonList,
  ErrorState,
  SegmentedControl,
  Sheet,
  SearchField,
  KpiStrip,
  SectionCard,
  EntityRow,
} from '@/components/ui';
import type { KpiItem } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { usePrivacyStore, maskIfHidden } from '@/store/privacy';
import { useCashflow, Counterparty, StockWarehouseRow, UnsoldSupplierRow } from '@/features/cashflow/useCashflow';
import { useCashflowActions } from '@/features/cashflow/useCashflowActions';
import { useSharedStock } from '@/features/stocks/useSharedStock';
import { fmtAutoKM, fmtCurKM, curSymbol, fmtMoney, dateLabel } from '@/lib/format';
import { hapticTap } from '@/lib/haptics';
import { radius, spacing } from '@/theme/tokens';

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
type SortKey = 'amount' | 'name';
type Kind = 'client' | 'supplier' | 'expense';
type ManualField = 'initial' | 'financedLeft' | 'financedRight';

const SEMIBOLD = { fontFamily: 'PlusJakartaSans_600SemiBold' };

const curLine = (byCur: Record<string, number>) => {
  const ents = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
  if (!ents.length) return '$0';
  return ents.map(([c, v]) => fmtCurKM(c, v)).join('  ');
};

/** Per-currency total across a section's rows — re-derived over exactly the rows shown. */
const sumCur = (rows: Counterparty[]): Record<string, number> => {
  const out: Record<string, number> = {};
  rows.forEach((r) => Object.entries(r.byCur).forEach(([c, v]) => (out[c] = (out[c] || 0) + v)));
  return out;
};

const qty = (n: number) => fmtMoney(n, 3);
const full = (cur: string, n: number) => `${curSymbol(cur)}${fmtMoney(n)}`;

const FIELD_LABEL: Record<ManualField, string> = {
  initial: 'Opening balances',
  financedLeft: 'Financing (left)',
  financedRight: 'Financing (right)',
};

export default function Cashflow() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useCashflow();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const hideBalances = usePrivacyStore((s) => s.hidden);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);
  const money = (s: string) => maskIfHidden(hideBalances, s);
  const { paySupplier, payExpense, partialPay, payClient, saveManualRows, saveYearTotal } = useCashflowActions();
  const shared = useSharedStock();

  const [tab, setTab] = useState<Tab>('general');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('amount');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [detail, setDetail] = useState<{ kind: Kind; cp: Counterparty } | null>(null);
  const [stockSheet, setStockSheet] = useState<{ name: string; row: StockWarehouseRow } | null>(null);
  const [unsoldSheet, setUnsoldSheet] = useState<UnsoldSupplierRow | null>(null);
  const [payItem, setPayItem] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryEditor, setEntryEditor] = useState<{ field: ManualField; index: number | null; title: string; num: string } | null>(null);
  const [yearDraft, setYearDraft] = useState<Record<number, string>>({});

  const whName = (id: string) => {
    const w = settings?.Stocks?.Stocks?.find((x: any) => x.id === id);
    return w?.nname || w?.stock || id || '—';
  };

  // Web's find box filters ROWS by name; section totals keep covering the full
  // period (web says so next to the box, and so does this screen).
  const q = query.trim().toLowerCase();
  const arrange = <T,>(rows: T[], amountOf: (r: T) => number, nameOf: (r: T) => string): T[] =>
    rows
      .filter((r) => !q || nameOf(r).toLowerCase().includes(q))
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
  const stocksPaid = data ? arrange(data.stocksPaid, (r) => r.total, (r) => whName(r.stock)) : [];
  const stocksUnpaid = data ? arrange(data.stocksUnpaid, (r) => r.total, (r) => whName(r.stock)) : [];
  const byCp = (rows: Counterparty[]) => arrange(rows, (r) => r.usd, (r) => r.name);
  const clientsNoPay = data ? byCp(data.clientsNoPayment) : [];
  const clientsBal = data ? byCp(data.clientsWithBalance) : [];
  const suppliersNoPay = data ? byCp(data.suppliersNoPayment) : [];
  const suppliersBal = data ? byCp(data.suppliersWithBalance) : [];
  const expenses = data ? byCp(data.expenseSuppliers) : [];
  const unsold = data ? arrange(data.unsoldBySupplier, (r) => r.total, (r) => r.name) : [];
  const sharedMatches = !q || 'shared inventory ims gis'.includes(q);

  const kpis: KpiItem[] = data
    ? [
        ...(isAdmin
          ? [
              {
                key: 'balance',
                label: 'Total Balance',
                value: money(fmtAutoKM(data.balance)),
                icon: 'wallet' as const,
                tone: data.balance >= 0 ? ('positive' as const) : ('negative' as const),
                sub: 'Left − right totals',
              },
            ]
          : []),
        { key: 'clients', label: 'Clients due', value: money(fmtAutoKM(data.kpi.clientsDue)), icon: 'people' as const, tone: 'primary' as const },
        { key: 'suppliers', label: 'Suppliers due', value: money(fmtAutoKM(data.kpi.suppliersDue)), icon: 'business' as const, tone: 'warn' as const },
        { key: 'expenses', label: 'Expenses', value: money(fmtAutoKM(data.kpi.expenses)), icon: 'receipt' as const, tone: 'negative' as const },
      ]
    : [];

  const emptyRow = (none: string) => (
    <Text variant="body" tone="faint" style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
      {q ? 'No matches' : none}
    </Text>
  );

  const counterpartyRows = (rows: Counterparty[], kind: Kind, valueOf: (r: Counterparty) => string, noun: string) =>
    rows.length
      ? rows.map((r, i) => (
          <EntityRow
            key={r.name}
            first={i === 0}
            name={r.name}
            subtitle={`${r.count} ${noun}${r.count === 1 ? '' : 's'}`}
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
            subtitle={`${w.count} lot${w.count === 1 ? '' : 's'}`}
            value={money(fmtAutoKM(w.total))}
            onPress={() => setStockSheet({ name: whName(w.stock), row: w })}
          />
        ))
      : emptyRow('No stock');

  const manualSection = (field: ManualField, icon: React.ComponentProps<typeof Ionicons>['name'], fixed?: { label: string; hint: string; value: number }) => {
    const rows = manualRowsOf(field) || [];
    const total = rows.reduce((s, r) => s + r.num, 0) + (fixed?.value || 0);
    return (
      <SectionCard icon={icon} title={FIELD_LABEL[field]} subtitle="Admin only" total={money(fmtAutoKM(total))}>
        {fixed ? <EntityRow first avatar={false} name={fixed.label} subtitle={fixed.hint} value={money(fmtAutoKM(fixed.value))} /> : null}
        {rows.map((r, i) => (
          <EntityRow
            key={`${field}-${i}`}
            first={!fixed && i === 0}
            avatar={false}
            name={r.title}
            value={money(fmtAutoKM(r.num))}
            onPress={() => openEntryEditor(field, i)}
          />
        ))}
        <Pressable
          onPress={() => openEntryEditor(field, null)}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderTopWidth: fixed || rows.length ? StyleSheet.hairlineWidth : 0,
            borderTopColor: colors.borderStrong,
          }}
        >
          <Ionicons name="add-circle" size={20} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">
            Add entry
          </Text>
        </Pressable>
      </SectionCard>
    );
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false} refreshing={isLoading} onRefresh={refetch}>
      <ScreenHeader
        subtitle="Stocks, clients, suppliers & expenses"
        title="Cashflow"
        right={
          <Pressable
            onPress={() => {
              hapticTap();
              togglePrivacy();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hideBalances ? 'Show balances' : 'Hide balances'}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={hideBalances ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
          </Pressable>
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
          onPress={() => {
            hapticTap();
            setSort((s) => (s === 'amount' ? 'name' : 'amount'));
          }}
          accessibilityRole="button"
          accessibilityLabel={sort === 'amount' ? 'Sorted by amount — sort by name' : 'Sorted by name — sort by amount'}
          style={{
            height: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 14,
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
      {q ? (
        <Text variant="caption" tone="faint" style={{ marginTop: 6, marginLeft: 6 }}>
          Rows only — totals cover the full period
        </Text>
      ) : null}

      <View style={{ height: 14 }} />

      {isLoading && !data ? (
        <SkeletonList count={6} />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load cashflow.'} onRetry={refetch} />
      ) : !data ? null : tab === 'unsold' ? (
        /* ══ UNSOLD STOCKS tab — web page.js:1370 ══════════════════════════════ */
        <SectionCard
          icon="cube-outline"
          title="Unsold Stocks"
          subtitle={`${data.unsoldBySupplier.length} supplier${data.unsoldBySupplier.length === 1 ? '' : 's'}`}
          total={money(fmtAutoKM(data.unsoldTotal))}
          totalTone="warn"
        >
          {unsold.length
            ? unsold.map((r, i) => (
                <EntityRow
                  key={r.supplier}
                  first={i === 0}
                  name={r.name}
                  subtitle={`${r.items.length} line${r.items.length === 1 ? '' : 's'}`}
                  value={money(fmtCurKM(r.cur, r.total))}
                  onPress={() => setUnsoldSheet(r)}
                />
              ))
            : emptyRow('No unsold stocks')}
        </SectionCard>
      ) : (
        /* ══ GENERAL CASHFLOW tab ═════════════════════════════════════════════ */
        <View style={{ gap: 14 }}>
          <KpiStrip items={kpis} />

          {isAdmin &&
            manualSection('initial', 'wallet-outline', {
              label: 'Future',
              hint: 'From the Margins page — updates automatically',
              value: data.incoming,
            })}

          <SectionCard icon="cube-outline" title="Stocks - Paid" total={money(fmtAutoKM(data.stocksPaidTotal))}>
            {warehouseRows(stocksPaid)}
          </SectionCard>

          {data.stocksUnpaid.length > 0 && (
            <SectionCard icon="cube-outline" title="Stocks - UnPaid" total={money(fmtAutoKM(data.stocksUnpaidTotal))} totalTone="warn">
              {warehouseRows(stocksUnpaid)}
            </SectionCard>
          )}

          {/* Web page.js:1604 — informational: the joint pool has no purchase
              invoices, so it joins none of the totals. Opens the Shared tab. */}
          {shared.rows.length > 0 && sharedMatches && (
            <SectionCard icon="layers-outline" title="Shared Stock (IMS + GIS)" total={money(curLine(shared.money.totals))}>
              <EntityRow
                first
                avatar={false}
                name={`Shared Inventory · ${shared.rows.length} lot${shared.rows.length === 1 ? '' : 's'}`}
                subtitle={`IMS ${money(curLine(shared.money.fin.IMS))}  ·  GIS ${money(curLine(shared.money.fin.GIS))}`}
                onPress={() => router.push('/(app)/stocks?tab=shared')}
              />
            </SectionCard>
          )}

          <SectionCard
            icon="people-outline"
            title="Clients - Payment"
            subtitle="No payment recorded yet"
            total={money(curLine(sumCur(data.clientsNoPayment)))}
            totalTone="positive"
          >
            {counterpartyRows(clientsNoPay, 'client', (r) => curLine(r.byCur), 'invoice')}
          </SectionCard>

          <SectionCard
            icon="people-outline"
            title="Clients - Balances"
            subtitle="Partly paid — balance remaining"
            total={money(curLine(sumCur(data.clientsWithBalance)))}
            totalTone="positive"
          >
            {counterpartyRows(clientsBal, 'client', (r) => curLine(r.byCur), 'invoice')}
          </SectionCard>

          {isAdmin && manualSection('financedLeft', 'cash-outline')}

          <SectionCard
            icon="business-outline"
            title="Supplier - Payment"
            subtitle="Nothing paid yet"
            total={money(fmtAutoKM(data.suppliersNoPayment.reduce((s, r) => s + r.usd, 0)))}
            totalTone="negative"
          >
            {counterpartyRows(suppliersNoPay, 'supplier', (r) => fmtAutoKM(r.usd), 'invoice')}
          </SectionCard>

          <SectionCard
            icon="business-outline"
            title="Supplier - Balances"
            subtitle="Partly paid — balance remaining"
            total={money(fmtAutoKM(data.suppliersWithBalance.reduce((s, r) => s + r.usd, 0)))}
            totalTone="negative"
          >
            {counterpartyRows(suppliersBal, 'supplier', (r) => fmtAutoKM(r.usd), 'invoice')}
          </SectionCard>

          <SectionCard icon="receipt-outline" title="Expenses" subtitle="Unpaid" total={money(fmtAutoKM(data.expensesUsd))} totalTone="negative">
            {counterpartyRows(expenses, 'expense', (r) => fmtAutoKM(r.usd), 'expense')}
          </SectionCard>

          {isAdmin && manualSection('financedRight', 'cash-outline')}

          {/* Web page.js:2074 — the totals strip and the year totals, admin only. */}
          {isAdmin && (
            <Card>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: 'Total (Left)', value: data.totalLeft, filled: false },
                  { label: 'Balance', value: data.balance, filled: true },
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
                      variant="bodyMedium"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      color={t.filled ? colors.primaryText : colors.text}
                      style={{ ...SEMIBOLD, marginTop: 3, fontVariant: ['tabular-nums'] }}
                    >
                      {money(fmtAutoKM(t.value))}
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
                  <Line label="Future (margins)" v={money(fmtAutoKM(data.incoming))} />
                  <Line label="Opening entries" v={money(fmtAutoKM(data.manual.initial))} />
                  <Line label="Stocks paid" v={money(fmtAutoKM(data.stocksPaidTotal))} />
                  <Line label="Stocks unpaid" v={money(fmtAutoKM(data.stocksUnpaidTotal))} />
                  <Line label="Client receivables" v={money(fmtAutoKM(data.kpi.clientsDue))} />
                  <Line label="Financing (left)" v={money(fmtAutoKM(data.manual.financedLeft))} />
                  <Line label="Total (Left)" v={money(fmtAutoKM(data.totalLeft))} strong />
                  <View style={{ height: 10 }} />
                  <Line label="Supplier payables" v={money(fmtAutoKM(data.payablesUsd))} />
                  <Line label="Unpaid expenses" v={money(fmtAutoKM(data.expensesUsd))} />
                  <Line label="Financing (right)" v={money(fmtAutoKM(data.manual.financedRight))} />
                  <Line label="Total (Right)" v={money(fmtAutoKM(data.totalRight))} strong />
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
        subtitle={detail ? `${money(curLine(detail.cp.byCur))} · ${detail.cp.items.length} item${detail.cp.items.length === 1 ? '' : 's'}` : undefined}
        footer={
          detail?.cp.items?.length ? (
            <View style={{ gap: 4 }}>
              {(() => {
                const items = detail.cp.items;
                const sum = (k: string) => items.reduce((t: number, x: any) => t + (Number(x[k]) || 0), 0);
                if (detail.kind === 'expense') return <SheetTotal label="Total amount" v={money(fmtAutoKM(sum('amount')))} strong />;
                return (
                  <>
                    <SheetTotal label="Total value" v={money(fmtAutoKM(sum('invValue') + sum('amount')))} />
                    <SheetTotal label="Total paid" v={money(fmtAutoKM(sum('paid')))} />
                    <SheetTotal label="Total balance" v={money(fmtAutoKM(sum('balance')))} strong />
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
            ? `Prepayment ${item.percentage}% · ${full(item.cur, (item.amount * item.percentage) / 100)}`
            : '';
          const dates = [
            item.etd ? `ETD ${dateLabel(item.etd)}` : '',
            item.eta ? `ETA ${dateLabel(item.eta)}` : '',
            isExp && item.date ? dateLabel(item.date) : '',
          ].filter(Boolean).join(' · ');
          return (
            <View
              key={`${item.id || item.poInvoiceId || i}`}
              style={{ paddingVertical: 12, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.borderStrong }}
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
                  <Text variant="bodyMedium" style={{ ...SEMIBOLD, fontVariant: ['tabular-nums'] }}>
                    {money(full(item.cur, isExp ? item.amount ?? 0 : item.balance ?? 0))}
                  </Text>
                  <Pressable
                    onPress={() => onAction(item)}
                    accessibilityRole="button"
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: radius.pill,
                      backgroundColor: colors.primary + '1A',
                    }}
                  >
                    <Text variant="label" tone="primary">
                      {isExp ? 'Mark paid' : 'Pay'}
                    </Text>
                  </Pressable>
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
        footer={stockSheet ? <SheetTotal label="Total" v={money(fmtAutoKM(stockSheet.row.total))} strong /> : undefined}
      >
        {(stockSheet?.row.items || []).map((l, i) => (
          <DetailLine
            key={`${l.id}-${i}`}
            first={i === 0}
            title={`PO ${l.order || '—'}`}
            lines={[l.description, l.supplierName, `${qty(l.qnty)} × ${full(l.cur, l.unitPrc)}`]}
            value={money(full(l.cur, l.total))}
          />
        ))}
      </Sheet>

      {/* ── Unsold supplier sheet (web StocksUnSold) ── */}
      <Sheet
        visible={!!unsoldSheet}
        onClose={() => setUnsoldSheet(null)}
        title={unsoldSheet?.name}
        subtitle={unsoldSheet ? `${unsoldSheet.items.length} line${unsoldSheet.items.length === 1 ? '' : 's'} unsold` : undefined}
        footer={unsoldSheet ? <SheetTotal label="Total" v={money(fmtCurKM(unsoldSheet.cur, unsoldSheet.total))} strong /> : undefined}
      >
        {(unsoldSheet?.items || []).map((l, i) => (
          <DetailLine
            key={`${l.order}-${i}`}
            first={i === 0}
            title={`PO ${l.order || '—'}`}
            lines={[l.description, l.stockName, `${qty(l.qnty)} × ${full(l.cur, l.unitPrc)}`]}
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
      <Text variant="body" tone={strong ? 'default' : 'muted'} style={strong ? SEMIBOLD : undefined}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'], ...(strong ? SEMIBOLD : {}) }}>
        {v}
      </Text>
    </View>
  );
}

/** A total line pinned in a sheet's footer. */
function SheetTotal({ label, v, strong }: { label: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text variant="body" tone={strong ? 'default' : 'muted'} style={strong ? SEMIBOLD : undefined}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'], ...(strong ? SEMIBOLD : {}) }}>
        {v}
      </Text>
    </View>
  );
}

/** A read-only row inside a drill-down sheet: bold title, stacked detail lines, figure on the right. */
function DetailLine({ title, lines, value, first }: { title: string; lines: string[]; value: string; first?: boolean }) {
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
        <Text variant="bodyMedium" numberOfLines={1}>
          {title}
        </Text>
        {lines.filter(Boolean).map((l, i) => (
          <Text key={i} variant="caption" tone={i === 0 ? 'muted' : 'faint'} numberOfLines={2}>
            {l}
          </Text>
        ))}
      </View>
      <Text variant="bodyMedium" style={{ ...SEMIBOLD, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}
