import { useState } from 'react';
import { View, Pressable, Modal, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, TextField, DateField, SectionHeader, ProgressBar, SkeletonList, ErrorState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
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
  const { paySupplier, payExpense, partialPay } = useCashflowActions();
  const [detail, setDetail] = useState<{ kind: Kind; cp: Counterparty } | null>(null);
  // Partial-payment entry for a supplier purchase invoice.
  const [payItem, setPayItem] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  const net = data ? data.payablesUsd + data.expensesUsd : 0;

  const onAction = (item: any) => {
    if (item.kind === 'invoice') {
      setDetail(null);
      router.push(`/(app)/invoices/${item.id}`);
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
    const perc = payItem.balance > 0 ? Number(((amt / payItem.balance) * 100).toFixed(1)) : 0;
    try {
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
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {item.kind === 'invoice' ? `Invoice #${item.number}` : item.kind === 'poInvoice' ? `Purchase inv ${item.inv ?? ''}` : (item.expense || 'Expense')}
                  </Text>
                  <Text variant="caption" tone="faint">{curSymbol(item.cur)}{fmtMoney(item.balance ?? item.amount ?? 0)}{item.date ? ` · ${dateLabel(item.date)}` : ''}</Text>
                </View>
                <Button
                  title={item.kind === 'invoice' ? 'View' : item.kind === 'poInvoice' ? 'Pay' : 'Mark paid'}
                  variant="secondary"
                  fullWidth={false}
                  loading={payExpense.isPending}
                  onPress={() => onAction(item)}
                />
              </View>
            )}
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
