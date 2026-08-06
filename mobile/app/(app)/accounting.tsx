import { useMemo, useState } from 'react';
import { View, Pressable, FlatList, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, TextField, Button, BarChart, SectionHeader, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useAccounting, AccountingGroup } from '@/features/accounting/useAccounting';
import { useAccountingEdit } from '@/features/accounting/useAccountingEdit';
import { curSymbol, fmtMoney, fmtCurKM, dateLabel } from '@/lib/format';
import { exportCsv } from '@/lib/export';
import { useSettings } from '@/store/settings';

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const dayIdx = (iso?: string) => {
  if (!iso) return -1;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return -1;
  const day = d.getDay(); // 0=Sun … 6=Sat
  return day === 6 ? 0 : day + 1; // Sat→0, Sun→1 … Fri→6
};

export default function Accounting() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useAccounting();
  const [search, setSearch] = useState('');
  const { dateSelect } = useSettings();
  const { editExpense } = useAccountingEdit();
  const [editLine, setEditLine] = useState<any | null>(null);
  const [draft, setDraft] = useState<{ expInvoice: string; amountExp: string }>({ expInvoice: '', amountExp: '' });

  const groups: AccountingGroup[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data || [];
    if (!q) return all;
    return all.filter(
      (g) => g.saleInvoice.toLowerCase().includes(q) || g.clientInvName.toLowerCase().includes(q) || g.invoice.includes(q)
    );
  }, [data, search]);

  // Financial summary — web accounting tiles (totalIncome/expense/balance/margin).
  const summary = useMemo(() => {
    const groups = data || [];
    const income = groups.reduce((s, g) => s + (g.amountInv || 0), 0);
    const expense = groups.reduce((s, g) => s + g.lines.reduce((t, l) => t + (l.amountExp || 0), 0), 0);
    const balance = income - expense;
    // Web's transaction count is the MERGED ROW count (one row per invoice plus one
    // per orphan expense/purchase), which is strictly larger than the group count.
    const txCount = groups.reduce((s, g) => s + Math.max(1, g.lines?.length || 1), 0);
    return {
      income,
      expense,
      balance,
      marginPct: income > 0 ? (balance / income) * 100 : 0,
      savings: balance > 0 ? balance * 0.2 : 0, // web: 20% of a positive balance
      txCount,
      avgTx: txCount > 0 ? (income + expense) / txCount : 0,
    };
  }, [data]);

  // Excel export — web parity. One row per merged line (invoice row, then each of
  // its expense/purchase lines), matching how web flattens the table.
  const onExport = () => {
    const rows: (string | number)[][] = [];
    (data || []).forEach((g) => {
      rows.push([
        g.saleInvoice ?? g.invoice ?? '',
        dateLabel(g.dateInv),
        g.clientInvName || '',
        g.curINV || '',
        (g.amountInv || 0).toFixed(2),
        '', '', '', '',
      ]);
      (g.lines || []).forEach((l) => {
        rows.push([
          g.saleInvoice ?? g.invoice ?? '',
          '', '', '', '',
          l.expInvoice || '',
          dateLabel(l.dateExp),
          l.supplierName || '',
          (l.amountExp || 0).toFixed(2),
        ]);
      });
    });
    exportCsv(
      `Accounting ${dateSelect.start.substring(0, 4)}`,
      ['Sales Invoice', 'Date', 'Client', 'Currency', 'Amount', 'Expense/Purchase #', 'Exp date', 'Supplier', 'Exp amount'],
      rows
    );
  };

  // Web formatPercent: 2 decimals, with a +/-999% clamp.
  const pct = (v: number) => {
    if (!isFinite(v) || isNaN(v)) return '0%';
    if (Math.abs(v) > 999) return v > 0 ? '>999%' : '<-999%';
    return v.toFixed(2) + '%';
  };

  // Debit (costs) vs Credit (sales) by weekday — parity with the web accounting chart.
  const chart = useMemo(() => {
    const debit = new Array(7).fill(0);
    const credit = new Array(7).fill(0);
    (data || []).forEach((g) => {
      const ci = dayIdx(g.dateInv);
      if (ci >= 0) credit[ci] += g.amountInv || 0;
      g.lines.forEach((l) => {
        const di = dayIdx(l.dateExp);
        if (di >= 0) debit[di] += l.amountExp || 0;
      });
    });
    return { debit, credit, hasData: debit.some((v) => v) || credit.some((v) => v) };
  }, [data]);

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Accounting</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={onExport} hitSlop={8}>
            <Ionicons name="download-outline" size={20} color={colors.primary} />
          </Pressable>
          <PeriodSelector />
        </View>
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search invoice # or client…"
        autoCapitalize="none"
        rightElement={<Ionicons name="search" size={18} color={colors.textFaint} />}
      />
      <View style={{ height: 12 }} />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : groups.length === 0 ? (
        <EmptyState title="No entries" message="No invoices in the selected period." icon={<Ionicons name="reader-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.invoice}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <View>
              {/* Financial summary tiles (web parity) */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {[
                  { k: 'Income', v: fmtCurKM('us', summary.income), tone: 'positive' as const },
                  { k: 'Costs', v: fmtCurKM('us', summary.expense), tone: 'negative' as const },
                  { k: 'Net', v: fmtCurKM('us', summary.balance), tone: summary.balance >= 0 ? ('positive' as const) : ('negative' as const) },
                  { k: 'Margin', v: pct(summary.marginPct), tone: 'default' as const },
                ].map((t) => (
                  <Card key={t.k} style={{ flex: 1 }}>
                    <Text variant="caption" tone="muted">{t.k}</Text>
                    <Text variant="bodyMedium" tone={t.tone} numberOfLines={1} style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>
                      {t.v}
                    </Text>
                  </Card>
                ))}
              </View>

              {/* Web's second tile row: Savings, Total Transactions, Avg. Transaction. */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                {[
                  { k: 'Savings', v: fmtCurKM('us', summary.savings), tone: 'positive' as const },
                  { k: 'Transactions', v: String(summary.txCount), tone: 'default' as const },
                  { k: 'Avg. txn', v: fmtCurKM('us', summary.avgTx), tone: 'default' as const },
                ].map((t) => (
                  <Card key={t.k} style={{ flex: 1 }}>
                    <Text variant="caption" tone="muted">{t.k}</Text>
                    <Text variant="bodyMedium" tone={t.tone} numberOfLines={1} style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>
                      {t.v}
                    </Text>
                  </Card>
                ))}
              </View>

              {chart.hasData ? (
                <Card style={{ marginBottom: 12 }}>
                  <SectionHeader title="Debit vs Credit" subtitle="By weekday" />
                  <BarChart
                    labels={DAYS}
                    series={[
                      { name: 'Debit', color: '#103a7a', data: chart.debit },
                      { name: 'Credit', color: '#9fb8d4', data: chart.credit },
                    ]}
                  />
                </Card>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const symS = curSymbol(item.curINV);
            const costs = item.lines.reduce((s, l) => s + l.amountExp, 0);
            return (
              <Card style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="h3" numberOfLines={1}>#{item.saleInvoice || item.invoice}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>{item.clientInvName}{item.dateInv ? ` · ${item.dateInv}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="h3" tone="primary">{symS}{fmtMoney(item.amountInv)}</Text>
                    {item.invType ? <Badge label={item.invType} tone="info" /> : null}
                  </View>
                </View>

                {item.lines.length > 0 && (
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 6 }}>
                    {item.lines.map((l, i) => (
                      <Pressable
                        key={i}
                        onPress={() => {
                          if (l.expType === 'Purchase') return;
                          setDraft({ expInvoice: String(l.expInvoice ?? ''), amountExp: String(l.amountExp ?? '') });
                          setEditLine(l);
                        }}
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text variant="caption" numberOfLines={1}>{l.supplierName}</Text>
                          <Text variant="caption" tone="faint" numberOfLines={1}>
                            {[l.expType, l.expInvoice, l.dateExp].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <Text variant="caption" tone="negative">−{curSymbol(l.curEX)}{fmtMoney(l.amountExp)}</Text>
                        {l.expType !== 'Purchase' && (
                          <Ionicons name="create-outline" size={13} color={colors.textFaint} style={{ marginLeft: 6 }} />
                        )}
                      </Pressable>
                    ))}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text variant="caption" tone="muted">Costs</Text>
                      <Text variant="caption" tone="negative">{symS}{fmtMoney(costs)}</Text>
                    </View>
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}

      {/* Inline edit — web's edit mode, restricted to non-Purchase rows. */}
      <Modal visible={!!editLine} transparent animationType="slide" onRequestClose={() => setEditLine(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setEditLine(null)} />
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
          <Text variant="h2">Edit expense</Text>
          <Text variant="caption" tone="muted">{editLine?.supplierName}</Text>
          <TextField label="Expense invoice #" value={draft.expInvoice} onChangeText={(t) => setDraft((d) => ({ ...d, expInvoice: t }))} />
          <TextField label="Amount" value={draft.amountExp} keyboardType="decimal-pad" onChangeText={(t) => setDraft((d) => ({ ...d, amountExp: t.replace(/[^0-9.-]/g, '') }))} />
          <Button
            title="Save"
            loading={editExpense.isPending}
            onPress={async () => {
              if (!editLine) return;
              try {
                if (draft.expInvoice !== String(editLine.expInvoice ?? ''))
                  await editExpense.mutateAsync({ line: editLine, field: 'expInvoice', value: draft.expInvoice });
                if (draft.amountExp !== String(editLine.amountExp ?? ''))
                  await editExpense.mutateAsync({ line: editLine, field: 'amountExp', value: draft.amountExp });
                setEditLine(null);
              } catch (e: any) {
                Alert.alert('Save failed', e?.message || 'Could not save.');
              }
            }}
          />
          <Button title="Cancel" variant="secondary" onPress={() => setEditLine(null)} />
        </View>
      </Modal>
    </Screen>
  );
}
