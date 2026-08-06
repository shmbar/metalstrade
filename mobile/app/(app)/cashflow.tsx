import { useState } from 'react';
import { View, Pressable, Modal, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, TextField, DateField, SectionHeader, ProgressBar, SkeletonList, ErrorState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useCashflow, Counterparty } from '@/features/cashflow/useCashflow';
import { useCashflowActions } from '@/features/cashflow/useCashflowActions';
import { ForecastCard } from '@/features/cashflow/ForecastCard';
import { fmtAutoKM, fmtCurKM, curSymbol, fmtMoney, dateLabel } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';

type Kind = 'client' | 'supplier' | 'expense';

const curLine = (byCur: Record<string, number>) => {
  const ents = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
  if (!ents.length) return '$0';
  return ents.map(([c, v]) => fmtCurKM(c, v)).join('  ');
};

function CounterpartyList({ rows, accent, onSelect }: { rows: Counterparty[]; accent: string; onSelect: (cp: Counterparty) => void }) {
  const { colors } = useTheme();
  const max = Math.max(...rows.map((r) => r.usd), 1);
  if (!rows.length) return <Text variant="body" tone="muted">None in this period.</Text>;
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r) => (
        <Pressable key={r.name} onPress={() => onSelect(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="caption" numberOfLines={1} style={{ marginBottom: 3 }}>{r.name}</Text>
            <ProgressBar pct={(r.usd / max) * 100} color={accent} height={10} />
          </View>
          <Text variant="caption" style={{ fontFamily: 'Inter_600SemiBold', width: 70, textAlign: 'right', color: colors.text }}>{curLine(r.byCur)}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
        </Pressable>
      ))}
    </View>
  );
}

export default function Cashflow() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useCashflow();
  const { settings } = useSettings();
  const whName = (id: string) =>
    settings?.Stocks?.Stocks?.find((w: any) => w.id === id)?.nname ||
    settings?.Stocks?.Stocks?.find((w: any) => w.id === id)?.stock || id || '—';
  const { paySupplier, payExpense, partialPay, payClient } = useCashflowActions();
  const [detail, setDetail] = useState<{ kind: Kind; cp: Counterparty } | null>(null);
  // Partial-payment entry for a supplier purchase invoice.
  const [payItem, setPayItem] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  const net = data ? data.payablesUsd + data.expensesUsd : 0;

  const onAction = (item: any) => {
    if (item.kind === 'invoice') {
      // Record the payment in place (web parity) — the invoice page is still one
      // tap away from the sheet.
      setAmount('');
      setPayDate(new Date().toISOString().slice(0, 10));
      setPayItem(item);
      return;
    }
    if (item.kind === 'poInvoice') {
      // Open the partial-payment entry (with a "Pay full" shortcut).
      setAmount('');
      setPayDate(new Date().toISOString().slice(0, 10));
      setPayItem(item);
      return;
    }
    // Expense — mark paid in full.
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
        setPayItem(null);
        setDetail(null);
        return;
      }
      const perc = payItem.balance > 0 ? Number(((amt / payItem.balance) * 100).toFixed(1)) : 0;
      await partialPay.mutateAsync({
        ref: { contractId: payItem.contractId, contractDate: payItem.contractDate, poInvoiceId: payItem.poInvoiceId },
        amount: amt,
        perc,
        dateIso: payDate,
      });
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
        setPayItem(null);
        setDetail(null);
        return;
      }
      await paySupplier.mutateAsync({ contractId: payItem.contractId, contractDate: payItem.contractDate, poInvoiceId: payItem.poInvoiceId });
      setPayItem(null);
      setDetail(null);
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not record payment.');
    }
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false} refreshing={isLoading} onRefresh={refetch}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Cashflow</Text>
        <PeriodSelector />
      </View>

      {isLoading && !data ? (
        <SkeletonList count={6} />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load cashflow.'} onRetry={refetch} />
      ) : data ? (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="arrow-down-circle" size={16} color={colors.positive} />
                <Text variant="label" tone="muted">Incoming</Text>
              </View>
              <Text variant="h2" tone="positive" style={{ marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>{curLine(data.receivablesByCur)}</Text>
              <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>receivables</Text>
            </Card>
            <Card style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="arrow-up-circle" size={16} color={colors.negative} />
                <Text variant="label" tone="muted">Outgoing</Text>
              </View>
              <Text variant="h2" tone="negative" style={{ marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>{fmtAutoKM(net)}</Text>
              <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>payables + expenses (USD)</Text>
            </Card>
          </View>

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cube" size={16} color={colors.warn} />
                <Text variant="label" tone="muted">Unsold stock · capital tied up</Text>
              </View>
              <Text variant="h3" color={colors.warn}>{curLine(data.unsoldByCur)}</Text>
            </View>
          </Card>

          {/* Stocks split by whether the purchase invoice has been paid — two of
              web's sections and two components of its Total (Left). */}
          {(data.stocksPaid.length > 0 || data.stocksUnpaid.length > 0) && (
            <Card>
              <SectionHeader
                title="Stocks · paid"
                subtitle={`${data.stocksPaid.length} warehouse(s)`}
                right={<Text variant="h3" tone="primary">{fmtAutoKM(data.stocksPaidTotal)}</Text>}
              />
              {data.stocksPaid.map((w, i) => (
                <WhRow key={w.stock} name={whName(w.stock)} total={w.total} count={w.count} first={i === 0} />
              ))}

              <View style={{ height: 12 }} />
              <SectionHeader
                title="Stocks · unpaid"
                subtitle={`${data.stocksUnpaid.length} warehouse(s)`}
                right={<Text variant="h3" color={colors.warn}>{fmtAutoKM(data.stocksUnpaidTotal)}</Text>}
              />
              {data.stocksUnpaid.map((w, i) => (
                <WhRow key={w.stock} name={whName(w.stock)} total={w.total} count={w.count} first={i === 0} />
              ))}
            </Card>
          )}

          {/* Bottom line — web's Total (Left) / Balance / Total (Right) strip. */}
          <Card>
            <SectionHeader title="Bottom line" subtitle="Left − Right" />
            <Line label="Future / incoming (margins)" v={data.incoming} />
            <Line label="Initial entries" v={data.manual.initial} muted />
            <Line label="Stocks paid" v={data.stocksPaidTotal} />
            <Line label="Stocks unpaid" v={data.stocksUnpaidTotal} />
            <Line label="Client receivables" v={Object.values(data.receivablesByCur).reduce((a, b) => a + b, 0)} />
            <Line label="Financing (left)" v={data.manual.financedLeft} muted />
            <Line label="Total (Left)" v={data.totalLeft} strong />

            <View style={{ height: 10 }} />
            <Line label="Supplier payables" v={data.payablesUsd} />
            <Line label="Unpaid expenses" v={data.expensesUsd} />
            <Line label="Financing (right)" v={data.manual.financedRight} muted />
            <Line label="Total (Right)" v={data.totalRight} strong />

            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Line label="Balance" v={data.balance} strong tone={data.balance >= 0 ? 'positive' : 'negative'} />
            </View>
            <Text variant="caption" tone="faint" style={{ marginTop: 8 }}>
              Initial and Financing entries are edited on the web page; shown here read-only.
            </Text>
          </Card>

          <ForecastCard />

          <Card>
            <SectionHeader title="Clients · receivables" subtitle="Tap a client → invoices" right={<Text variant="h3" tone="positive">{curLine(data.receivablesByCur)}</Text>} />
            <CounterpartyList rows={data.receivableClients} accent={colors.positive} onSelect={(cp) => setDetail({ kind: 'client', cp })} />
          </Card>

          <Card>
            <SectionHeader title="Suppliers · payables" subtitle="Tap → mark purchase invoices paid" right={<Text variant="h3" tone="negative">{fmtAutoKM(data.payablesUsd)}</Text>} />
            <CounterpartyList rows={data.payableSuppliers} accent={colors.negative} onSelect={(cp) => setDetail({ kind: 'supplier', cp })} />
          </Card>

          <Card>
            <SectionHeader title="Expenses · unpaid" subtitle="Tap → mark expenses paid" right={<Text variant="h3" tone="warn">{fmtAutoKM(data.expensesUsd)}</Text>} />
            <CounterpartyList rows={data.expenseSuppliers} accent={colors.warn} onSelect={(cp) => setDetail({ kind: 'expense', cp })} />
          </Card>
        </View>
      ) : null}

      {/* Drill-down sheet */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setDetail(null)} />
        <View style={{ maxHeight: '70%', backgroundColor: colors.bgElevated, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], paddingBottom: insets.bottom + spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="h3" numberOfLines={1}>{detail?.cp.name}</Text>
              <Text variant="caption" tone="faint">{curLine(detail?.cp.byCur || {})} · {detail?.cp.items.length} item(s)</Text>
            </View>
            <Pressable onPress={() => setDetail(null)} hitSlop={8}><Ionicons name="close" size={22} color={colors.textMuted} /></Pressable>
          </View>
          <FlatList
            data={detail?.cp.items || []}
            keyExtractor={(it, i) => (it.id || it.poInvoiceId || i) + ''}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {item.kind === 'invoice'
                        ? `Invoice #${item.number}${item.marker ? item.marker : ''}`
                        : item.kind === 'poInvoice'
                          ? `Purchase inv ${item.inv ?? ''}`
                          : (item.expense || 'Expense')}
                    </Text>
                    {/* Final badge — web shows it on both ledgers. */}
                    {(item.isFinal || item.marker === 'FN') && (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
                        <Text variant="caption" tone="primary" style={{ fontSize: 10 }}>Final</Text>
                      </View>
                    )}
                  </View>

                  {/* Web's detail columns: PO#, value/amount, paid-to-date, ETD/ETA. */}
                  {!!item.order && (
                    <Text variant="caption" tone="muted" numberOfLines={1}>PO {item.order}</Text>
                  )}
                  <Text variant="caption" tone="faint" numberOfLines={1}>
                    {item.kind === 'expense'
                      ? `${curSymbol(item.cur)}${fmtMoney(item.amount ?? 0)}`
                      : [
                          `Value ${curSymbol(item.cur)}${fmtMoney(item.invValue ?? item.amount ?? 0)}`,
                          `Paid ${curSymbol(item.cur)}${fmtMoney(item.paid ?? 0)}`,
                          `Bal ${curSymbol(item.cur)}${fmtMoney(item.balance ?? 0)}`,
                        ].join(' · ')}
                  </Text>
                  {(item.etd || item.eta || item.date) && (
                    <Text variant="caption" tone="faint" numberOfLines={1}>
                      {[
                        item.etd ? `ETD ${dateLabel(item.etd)}` : '',
                        item.eta ? `ETA ${dateLabel(item.eta)}` : '',
                        !item.etd && !item.eta && item.date ? dateLabel(item.date) : '',
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <Button
                  title={item.kind === 'expense' ? 'Mark paid' : 'Pay'}
                  variant="secondary"
                  fullWidth={false}
                  loading={payExpense.isPending}
                  onPress={() => onAction(item)}
                />
              </View>
            )}
            ListFooterComponent={
              /* Footer TOTAL — web shows amount / payment / balance sums under both
                 the client and supplier detail tables. */
              detail?.cp.items?.length ? (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.borderStrong, paddingVertical: 12, gap: 3 }}>
                  {(() => {
                    const items = detail.cp.items;
                    const sum = (k: string) => items.reduce((t: number, x: any) => t + (Number(x[k]) || 0), 0);
                    const isExp = detail.kind === 'expense';
                    return (
                      <>
                        <TotalLine
                          label={isExp ? 'Total amount' : 'Total value'}
                          v={isExp ? sum('amount') : sum('invValue') + sum('amount')}
                        />
                        {!isExp && <TotalLine label="Total paid" v={sum('paid')} />}
                        {!isExp && <TotalLine label="Total balance" v={sum('balance')} strong />}
                      </>
                    );
                  })()}
                </View>
              ) : null
            }
          />
        </View>
      </Modal>

      {/* Partial-payment entry for a supplier purchase invoice */}
      <Modal visible={!!payItem} transparent animationType="slide" onRequestClose={() => setPayItem(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setPayItem(null)} />
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md }}>
          <Text variant="h2">Record payment</Text>
          {payItem && (
            <Text variant="caption" tone="muted">
              Purchase inv {payItem.inv ?? ''} · balance {curSymbol(payItem.cur)}{fmtMoney(payItem.balance)}
            </Text>
          )}
          {/* Quick % chips */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[25, 50, 75, 100].map((p) => (
              <Pressable
                key={p}
                onPress={() => payItem && setAmount(((payItem.balance * p) / 100).toFixed(2))}
                style={{ flex: 1, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text variant="caption" tone="primary" style={{ fontFamily: 'Inter_600SemiBold' }}>{p}%</Text>
              </Pressable>
            ))}
          </View>
          <TextField label={`Amount (${curSymbol(payItem?.cur || 'us').trim() || 'USD'})`} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" autoFocus />
          <DateField label="Payment date" value={payDate} onChange={setPayDate} />
          <Button title="Record payment" loading={partialPay.isPending} onPress={submitPartial} />
          <Button title="Pay full balance" variant="ghost" loading={paySupplier.isPending} onPress={payFull} />
        </View>
      </Modal>
    </Screen>
  );
}

// One warehouse row inside the Stocks paid/unpaid sections.
function WhRow({ name, total, count, first }: { name: string; total: number; count: number; first?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 6, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="body" numberOfLines={1}>{name}</Text>
        <Text variant="caption" tone="faint">{count} item{count === 1 ? '' : 's'}</Text>
      </View>
      <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>{fmtAutoKM(total)}</Text>
    </View>
  );
}

// One line of the bottom-line strip.
function Line({
  label, v, strong, muted, tone,
}: {
  label: string;
  v: number;
  strong?: boolean;
  muted?: boolean;
  tone?: 'positive' | 'negative';
}) {
  const { colors } = useTheme();
  const color = tone === 'positive' ? colors.positive : tone === 'negative' ? colors.negative : undefined;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
      <Text variant={strong ? 'bodyMedium' : 'caption'} tone={muted ? 'faint' : 'muted'}>{label}</Text>
      <Text
        variant={strong ? 'bodyMedium' : 'body'}
        style={{ fontVariant: ['tabular-nums'], ...(color ? { color } : {}) }}
      >
        {fmtAutoKM(v)}
      </Text>
    </View>
  );
}

// Footer total line inside a counterparty detail sheet.
function TotalLine({ label, v, strong }: { label: string; v: number; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg }}>
      <Text variant={strong ? 'bodyMedium' : 'caption'} tone="muted">{label}</Text>
      <Text variant={strong ? 'bodyMedium' : 'caption'} style={{ fontVariant: ['tabular-nums'] }}>
        {fmtAutoKM(v)}
      </Text>
    </View>
  );
}
