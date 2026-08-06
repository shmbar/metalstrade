import { useMemo, useState } from 'react';
import { View, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, DateField, Button, SectionHeader, EmptyState, SkeletonList } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useContracts } from '@/features/contracts/useContracts';
import {
  PoInvoice, addInvoice, deleteInvoice, addPayment, deletePayment,
  setInvoiceField, setPaymentAmount, setPaymentPerc, setPaymentDate, toggleDraft,
} from '@/features/contracts/poInvoiceModel';
import { updateContractField, newId } from '@/data/writes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { curSymbol, fmtMoney, dateLabel } from '@/lib/format';
import { hapticSuccess } from '@/lib/haptics';

// Purchase Invoices editor — the mobile twin of web's poInvModal. Mobile could
// previously only read poInvoices; there was no way to add one, set its value, or
// build a payment schedule.
export default function PoInvoices() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  const { data: contracts, isLoading } = useContracts();

  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);
  const [list, setList] = useState<PoInvoice[] | null>(null);
  const rows = list ?? ((contract?.poInvoices as any as PoInvoice[]) || []);
  const dirty = list !== null;

  const apply = (next: PoInvoice[] | null) => {
    if (!next) return; // rejected keystroke (>2 decimals)
    setList(next);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!uidCollection || !contract) throw new Error('Not authenticated');
      const date = (contract as any).dateRange?.startDate || (contract as any).date || '';
      await updateContractField(uidCollection, contract.id, date, { poInvoices: rows });
    },
    onSuccess: () => {
      hapticSuccess();
      setList(null);
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['cashflow'] });
      qc.invalidateQueries({ queryKey: ['contracts-review'] });
    },
    onError: (e: any) => Alert.alert('Save failed', e?.message || 'Could not save purchase invoices.'),
  });

  if (!contract && isLoading) {
    return (
      <Screen>
        <Back />
        <SkeletonList count={4} />
      </Screen>
    );
  }
  if (!contract) {
    return (
      <Screen>
        <Back />
        <EmptyState title="Contract not found" message="Open it from the contracts list." />
      </Screen>
    );
  }

  const sym = curSymbol((contract as any).cur);
  const grand = rows.reduce(
    (a, r) => ({
      value: a.value + (parseFloat(r.invValue) || 0),
      paid: a.paid + (parseFloat(r.pmnt) || 0),
      blnc: a.blnc + (parseFloat(r.blnc) || 0),
    }),
    { value: 0, paid: 0, blnc: 0 }
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Back />
          <Text variant="h3">Purchase Invoices</Text>
          <Pressable onPress={() => apply(addInvoice(rows, newId(), newId()))} hitSlop={8}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <Text variant="caption" tone="muted" style={{ marginBottom: 12 }}>
          {(contract as any).order || 'Contract'} · {rows.length} invoice(s)
        </Text>

        {rows.length === 0 ? (
          <EmptyState
            title="No purchase invoices"
            message="Add one to record what the supplier billed and how it is being paid."
            icon={<Ionicons name="document-outline" size={40} color={colors.textFaint} />}
          />
        ) : (
          rows.map((inv) => (
            <Card key={inv.id} style={{ marginBottom: 12, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Invoice #"
                    value={String(inv.inv ?? '')}
                    onChangeText={(t) => apply(setInvoiceField(rows, inv.id, 'inv', t))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Invoice value"
                    value={String(inv.invValue ?? '')}
                    onChangeText={(t) => apply(setInvoiceField(rows, inv.id, 'invValue', t))}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" tone="muted">Total paid</Text>
                <Text variant="bodyMedium" tone="positive" style={{ fontVariant: ['tabular-nums'] }}>
                  {sym}{fmtMoney(parseFloat(inv.pmnt) || 0)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" tone="muted">Balance</Text>
                <Text
                  variant="bodyMedium"
                  style={{ fontVariant: ['tabular-nums'], color: (parseFloat(inv.blnc) || 0) > 0.01 ? colors.negative : colors.positive }}
                >
                  {sym}{fmtMoney(parseFloat(inv.blnc) || 0)}
                </Text>
              </View>

              {/* Payment schedule */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                <SectionHeader
                  title="Payments"
                  subtitle={`${inv.payments?.length || 0} scheduled`}
                  right={
                    <Pressable onPress={() => apply(addPayment(rows, inv.id, newId()))} hitSlop={8}>
                      <Ionicons name="add-circle-outline" size={19} color={colors.primary} />
                    </Pressable>
                  }
                />
                {(inv.payments || []).map((p) => (
                  <View key={p.pmntId} style={{ gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <DateField
                          label={`Date — ${dateLabel(p.pmntDate)}`}
                          value={(p.pmntDate as any)?.startDate || null}
                          onChange={(iso) => apply(setPaymentDate(rows, inv.id, p.pmntId, iso))}
                        />
                      </View>
                      <Pressable onPress={() => apply(deletePayment(rows, inv.id, p.pmntId))} hitSlop={8} style={{ paddingTop: 18 }}>
                        <Ionicons name="trash-outline" size={17} color={colors.negative} />
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <TextField
                          label="%"
                          value={String(p.pmntPerc ?? '')}
                          onChangeText={(t) => apply(setPaymentPerc(rows, inv.id, p.pmntId, t))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextField
                          label="Amount"
                          value={String(p.pmnt ?? '')}
                          onChangeText={(t) => apply(setPaymentAmount(rows, inv.id, p.pmntId, t))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                {/* Draft hides this invoice from Cashflow (web parity). */}
                <Pressable
                  onPress={() => apply(toggleDraft(rows, inv.id, !inv.draft))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Ionicons
                    name={inv.draft ? 'checkbox' : 'square-outline'}
                    size={16}
                    color={inv.draft ? colors.primary : colors.textFaint}
                  />
                  <Text variant="caption" tone="muted">Draft (hide from Cashflow)</Text>
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() =>
                    Alert.alert('Delete invoice?', inv.inv || 'This purchase invoice', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => apply(deleteInvoice(rows, inv.id)) },
                    ])
                  }
                  hitSlop={8}
                >
                  <Text variant="caption" style={{ color: colors.negative }}>Delete</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}

        {rows.length > 0 && (
          <Card style={{ marginBottom: 12 }}>
            <Text variant="label" tone="muted" style={{ marginBottom: 6 }}>Totals</Text>
            <Row label="Invoiced" v={`${sym}${fmtMoney(grand.value)}`} />
            <Row label="Paid" v={`${sym}${fmtMoney(grand.paid)}`} />
            <Row label="Balance" v={`${sym}${fmtMoney(grand.blnc)}`} strong />
          </Card>
        )}

        <Button
          title={dirty ? 'Save purchase invoices' : 'Saved'}
          disabled={!dirty}
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Row({ label, v, strong }: { label: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text variant={strong ? 'bodyMedium' : 'body'} tone="muted">{label}</Text>
      <Text variant={strong ? 'bodyMedium' : 'body'} style={{ fontVariant: ['tabular-nums'] }}>{v}</Text>
    </View>
  );
}

function Back() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">Back</Text>
    </Pressable>
  );
}
