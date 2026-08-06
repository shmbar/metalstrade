import { useMemo, useState } from 'react';
import { View, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Select, TextField, DateField, Button, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import {
  useExpenses, useSaveExpense, useDeleteExpense, useCopyExpenseToMisc, missingExpenseFields,
} from '@/features/expenses/useExpenses';
import { newId } from '@/data/writes';
import { hapticSuccess } from '@/lib/haptics';

// Existing-expense editor — the mobile twin of web's expenses modal
// (app/(root)/expenses/modals/expenses.js). Web required all of
// expense / cur / supplier / expType / amount / date before saving, and kept the
// linked invoice + contract entries in step; both are enforced here.
export default function ExpenseEdit() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { data } = useExpenses();
  const save = useSaveExpense();
  const del = useDeleteExpense();
  const copyMisc = useCopyExpenseToMisc();

  const isCompany = kind === 'company';
  const row = useMemo(() => {
    const list = isCompany ? data?.company : data?.supplier;
    return list?.find((r) => r.id === id);
  }, [data, id, isCompany]);

  const isNew = id === 'new';
  const [v, setV] = useState<any>(() =>
    isNew
      ? { id: newId(), expense: '', cur: 'us', supplier: '', expType: '', amount: '', paid: '222', comments: '', dateRange: { startDate: null, endDate: null } }
      : { ...(row?.raw || {}) }
  );
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));
  const setDate = (iso: string) => setV((p: any) => ({ ...p, dateRange: { startDate: iso, endDate: iso }, date: iso }));

  const supplierOptions = useMemo(
    () => (settings?.Supplier?.Supplier || []).filter((s: any) => !s.deleted).map((s: any) => ({ value: s.id, label: s.nname || '—' })),
    [settings]
  );
  const typeOptions = useMemo(
    () => (settings?.Expenses?.Expenses || []).filter((e: any) => !e.deleted).map((e: any) => ({ value: e.id, label: e.expType || '—' })),
    [settings]
  );
  const curOptions = useMemo(
    () => (settings?.Currency?.Currency || []).map((c: any) => ({ value: c.id, label: c.cur || c.id })),
    [settings]
  );
  const paidOptions = useMemo(
    () =>
      (settings?.ExpPmnt?.ExpPmnt || []).length
        ? (settings.ExpPmnt.ExpPmnt as any[]).map((p) => ({ value: p.id, label: p.paid || p.id }))
        : [
            { value: '111', label: 'Paid' },
            { value: '222', label: 'Unpaid' },
          ],
    [settings]
  );

  const missing = missingExpenseFields(v);
  const err = (k: string) => (submitted && missing.includes(k) ? 'Required' : undefined);

  if (!isNew && !row) {
    return (
      <Screen>
        <BackBar />
        <EmptyState title="Expense not found" message="Open it from the expenses list." />
      </Screen>
    );
  }

  const onSave = async () => {
    setSubmitted(true);
    if (missing.length) {
      Alert.alert('Missing fields', `Required: ${missing.join(', ')}`);
      return;
    }
    try {
      await save.mutateAsync({
        expense: v,
        kind: isCompany ? 'companyexpense' : 'expense',
        previousDate: row?.raw?.dateRange?.startDate || row?.raw?.date,
      });
      hapticSuccess();
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save the expense.');
    }
  };

  const onDelete = () => {
    Alert.alert('Delete expense?', 'This also removes it from the linked invoice and contract.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync({ expense: v, kind: isCompany ? 'companyexpense' : 'expense' });
            router.back();
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message || 'Could not delete the expense.');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <BackBar />
          <Text variant="h3">{isNew ? 'New expense' : 'Edit expense'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <Card style={{ gap: 12 }}>
          <TextField
            label="Expense invoice # *"
            value={String(v.expense ?? '')}
            onChangeText={(t) => set('expense', t)}
            error={err('expense')}
          />
          <DateField
            label="Date"
            value={v.dateRange?.startDate || v.date || null}
            onChange={setDate}
            error={err('date')}
            required
          />
          <TextField
            label="Amount *"
            value={String(v.amount ?? '')}
            onChangeText={(t) => set('amount', t.replace(/[^0-9.\-]/g, ''))}
            keyboardType="decimal-pad"
            error={err('amount')}
          />
          <Select label="Currency" value={v.cur} options={curOptions} onChange={(x) => set('cur', x)} error={err('cur')} required />
          <Select label="Vendor" value={v.supplier} options={supplierOptions} onChange={(x) => set('supplier', x)} error={err('supplier')} required />
          <Select label="Expense type" value={v.expType} options={typeOptions} onChange={(x) => set('expType', x)} error={err('expType')} required />
          <Select label="Payment" value={v.paid} options={paidOptions} onChange={(x) => set('paid', x)} />
          <TextField label="Comments" value={String(v.comments ?? '')} onChangeText={(t) => set('comments', t)} multiline />
        </Card>

        <Button title="Save" loading={save.isPending} onPress={onSave} style={{ marginTop: 14 }} />
        {isCompany && !isNew && (
          <Button
            title="Copy to misc invoices"
            variant="secondary"
            loading={copyMisc.isPending}
            style={{ marginTop: 10 }}
            onPress={() =>
              copyMisc.mutate(v, {
                onSuccess: () => Alert.alert('Copied', 'This expense now appears under Misc Invoices.'),
                onError: (e: any) => Alert.alert('Copy failed', e?.message || 'Could not copy.'),
              })
            }
          />
        )}
        {!isNew && (
          <Pressable onPress={onDelete} style={{ alignSelf: 'center', paddingVertical: 14 }}>
            <Text variant="bodyMedium" style={{ color: colors.negative }}>Delete expense</Text>
          </Pressable>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function BackBar() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">Back</Text>
    </Pressable>
  );
}
