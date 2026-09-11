import { useMemo, useState } from 'react';
import { View, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { BackButton } from '@/components/ui/BackButton';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Select, TextField, DateField, Button, EmptyState , Sheet } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import {
  useExpenses, useSaveExpense, useDeleteExpense, useCopyExpenseToMisc, useMoveExpenseToShipment,
  missingExpenseFields,
} from '@/features/expenses/useExpenses';
import { useAuth } from '@/store/auth';
import { getInvoicesByNumbers } from '@/data/firestore';
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
  const moveShip = useMoveExpenseToShipment();
  const { uidCollection } = useAuth();
  const [findOpen, setFindOpen] = useState(false);
  const [findInv, setFindInv] = useState('');
  const [findYr, setFindYr] = useState(String(new Date().getFullYear()));
  const [finding, setFinding] = useState(false);

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
        {isCompany && !isNew && (
          <Button
            title="Move to shipment"
            variant="secondary"
            style={{ marginTop: 10 }}
            onPress={() => setFindOpen(true)}
          />
        )}
        {!isNew && (
          <Pressable onPress={onDelete} style={{ alignSelf: 'center', paddingVertical: 14 }}>
            <Text variant="bodyMedium" style={{ color: colors.negative }}>Delete expense</Text>
          </Pressable>
        )}

        {/* Invoice finder — web's findInvoiceModal. Look the sales invoice up by
            number + year, then migrate this expense onto it and its contract. */}
        <Sheet
          visible={findOpen}
          onClose={() => setFindOpen(false)}
          title="Move to shipment"
          subtitle="Appends this expense to the sales invoice and its contract, then removes the company-expense copy."
          footer={
            <Button
              title="Find and move"
              loading={finding || moveShip.isPending}
              disabled={!findInv || findYr.length !== 4}
              onPress={async () => {
                setFinding(true);
                try {
                  const found = await getInvoicesByNumbers<any>(uidCollection as string, 'invoices', [
                    { yr: findYr, arrInv: [Number(findInv)] },
                  ]);
                  // Prefer the ORIGINAL when a credit/final note shares the number.
                  const inv = found.find((x: any) => x.invType === '1111') || found[0];
                  if (!inv) {
                    Alert.alert('Not found', `No invoice #${findInv} in ${findYr}.`);
                    return;
                  }
                  await moveShip.mutateAsync({ expense: v, invoice: { ...inv, __yr: findYr } });
                  hapticSuccess();
                  setFindOpen(false);
                  router.back();
                } catch (e: any) {
                  Alert.alert('Move failed', e?.message || 'Could not move the expense.');
                } finally {
                  setFinding(false);
                }
              }}
            />
          }
        >
          <View style={{ gap: 12 }}>
            <TextField
              label="Invoice #"
              value={findInv}
              keyboardType="number-pad"
              onChangeText={(t) => setFindInv(t.replace(/[^0-9]/g, ''))}
            />
            <TextField
              label="Year"
              value={findYr}
              keyboardType="number-pad"
              onChangeText={(t) => setFindYr(t.replace(/[^0-9]/g, ''))}
            />
            <Text variant="caption" tone="faint">
              The company copy is deleted last, so a failure part-way leaves it intact.
            </Text>
          </View>
        </Sheet>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function BackBar() {
  return <BackButton />;
}
