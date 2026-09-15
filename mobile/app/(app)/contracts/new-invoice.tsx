import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Screen, Card, Text, TextField, Select, DateField, Button, SectionHeader, EmptyState, StackHeader, SkeletonList } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useAuth } from '@/store/auth';
import { useContracts } from '@/features/contracts/useContracts';
import { useCreateInvoice, blankInvoiceForContract } from '@/features/invoices/useCreateInvoice';
import { InvoiceHeaderFields } from '@/features/invoices/InvoiceHeaderFields';
import { useInvoiceSalesContracts } from '@/features/invoices/useInvoiceSalesContracts';
import { loadDocByIdDate } from '@/data/firestore';
import { newId } from '@/data/writes';
import { num } from '@shared/finance';
import { curSymbol, fmtMoney } from '@/lib/format';

const NOTE_LABEL: Record<string, string> = { '2222': 'Credit note', '3333': 'Final note' };

export default function NewInvoice() {
  // type + from + fromDate: a Credit Note (2222) / Final Note (3333) against the
  // contract invoice `from` — web's isInvCreationCNFL flow.
  const { id, type, from, fromDate } = useLocalSearchParams<{ id: string; type?: string; from?: string; fromDate?: string }>();
  const isNote = type === '2222' || type === '3333';
  const noteLabel = isNote ? NOTE_LABEL[type as string] : '';
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { uidCollection } = useAuth();
  const { data: contracts, isLoading: contractsLoading } = useContracts();
  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);
  const create = useCreateInvoice();

  const originalQuery = useQuery({
    enabled: isNote && !!uidCollection && !!from && !!fromDate,
    queryKey: ['invoice-doc', uidCollection, from, fromDate],
    queryFn: () => loadDocByIdDate<any>(uidCollection as string, 'invoices', { id: from as string, date: fromDate }),
  });
  const original: any = originalQuery.data;

  /* Seed once, when what the form is built from has arrived (mobile-form-seeding):
     a useState initialiser ran before the contracts query resolved, so a deep link
     stayed on "Contract not found" for good. */
  const [inv, setInv] = useState<any>(null);
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !contract) return;
    if (!isNote) {
      seeded.current = true;
      setInv(blankInvoiceForContract(contract));
      return;
    }
    if (!original || !original.invoice) return;
    seeded.current = true;
    // web invoiceDetails.selectRow with isInvCreationCNFL: the original, re-typed, with
    // its own number, no expenses/payments/prepayment, fresh line ids, and a pointer
    // back. cnORfl is not carried: it describes the original, not the note.
    const { cnORfl: _cnORfl, ...rest } = original;
    setInv({
      ...rest,
      invType: type,
      expenses: [],
      completed: false,
      payments: [],
      id: '',
      invoice: original.invoice,
      cur: original.cur,
      totalPrepayment: '',
      originalInvoice: { id: original.id || from, date: original.dateRange?.endDate },
      productsDataInvoice: (original.productsDataInvoice || []).map((x: any) => ({ ...x, id: newId() })),
    });
  }, [contract, isNote, original, type, from]);

  const sc = useInvoiceSalesContracts(inv);

  const sym = curSymbol(contract?.cur);
  const clientOptions = useMemo(
    () => (settings?.Client?.Client || []).filter((c: any) => !c.deleted).map((c: any) => ({ value: c.id, label: c.nname || '—' })),
    [settings]
  );
  const shipOptions = useMemo(
    () => (settings?.Shipment?.Shipment || []).filter((s: any) => !s.deleted).map((s: any) => ({ value: s.id, label: s.shpType || '' })),
    [settings]
  );
  const productOptions = useMemo(
    () => (contract?.productsData || []).map((p: any) => ({ value: p.id, label: p.description || '—' })),
    [contract]
  );
  const whOptions = useMemo(
    () => (settings?.Stocks?.Stocks || []).filter((w: any) => !w.deleted).map((w: any) => ({ value: w.id, label: w.stock || w.nname || '' })),
    [settings]
  );

  const title = isNote ? `New ${noteLabel.toLowerCase()}` : 'New invoice';
  // Still loading: the contract, the original (for a note), or the one render before the seed effect runs.
  const waiting =
    (!contract && contractsLoading) ||
    (isNote && originalQuery.isLoading) ||
    (!!contract && !inv && (!isNote || !!original?.invoice));
  if (waiting) {
    return (
      <Screen>
        <StackHeader title={title} backLabel="Cancel" />
        <SkeletonList count={4} />
      </Screen>
    );
  }
  if (!contract || !inv) {
    return (
      <Screen>
        <StackHeader title={title} backLabel="Cancel" />
        <EmptyState
          title={!contract ? 'Contract not found' : 'Original invoice not found'}
          message={!contract ? 'Open it from the contracts list.' : 'Open the contract again and pick the invoice.'}
        />
      </Screen>
    );
  }

  const lines = inv.productsDataInvoice || [];
  const set = (patch: any) => setInv((v: any) => ({ ...v, ...patch }));
  // Typing the client's contract # links the matching sales contract (web handleClientContractNo).
  const onHeader = (patch: any) =>
    set('clientContractNo' in patch ? { ...patch, salesContractId: sc.autoMatch(String(patch.clientContractNo || '')) } : patch);
  const setLine = (i: number, patch: any) =>
    setInv((v: any) => {
      const arr = [...(v.productsDataInvoice || [])];
      const row = { ...arr[i], ...patch };
      if (patch.descriptionId !== undefined) {
        const p = contract.productsData?.find((q: any) => q.id === patch.descriptionId);
        row.description = p?.description || '';
        if (p?.unitPrc != null && !row.unitPrc) row.unitPrc = p.unitPrc;
      }
      if ('qnty' in patch || 'unitPrc' in patch || patch.descriptionId !== undefined) {
        row.total = row.qnty === 's' ? num(row.unitPrc) : Math.round(num(row.qnty) * num(row.unitPrc) * 100) / 100;
      }
      arr[i] = row;
      return { ...v, productsDataInvoice: arr };
    });
  const addLine = () =>
    set({ productsDataInvoice: [...lines, { id: newId(), po: '', descriptionId: '', container: '', qnty: '', unitPrc: '', total: 0, description: '', mtrlStatus: 'select', stock: '', stockValue: '' }] });
  const removeLine = (i: number) => set({ productsDataInvoice: lines.filter((_: any, k: number) => k !== i) });

  const total = lines.reduce((s: number, p: any) => s + num(p.total), 0);
  // An untagged line counts against the invoice's own link — say so instead of "none".
  const inheritedSc = sc.lineOptions.find((o) => o.value === inv.salesContractId)?.label;

  const onSave = async () => {
    if (!inv.client || !inv.cur || !inv.shpType || !inv.dateRange?.startDate) {
      Alert.alert('Missing fields', 'Client, currency, shipment and date are required.');
      return;
    }
    for (const l of lines as any[]) {
      if (!l.descriptionId || !l.qnty || !l.unitPrc || (l.stock === '' && l.qnty !== 's')) {
        Alert.alert('Materials incomplete', 'Each line needs material, quantity, unit price and warehouse.');
        return;
      }
    }
    const clientName = settings?.Client?.Client?.find((c: any) => c.id === inv.client)?.nname || '';
    try {
      const saved = await create.mutateAsync({ contract, invoice: { ...inv, date: inv.dateRange.startDate }, clientName });
      router.replace(`/(app)/invoices/${saved.id}`);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || `Could not create the ${isNote ? noteLabel.toLowerCase() : 'invoice'}.`);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <StackHeader
          title={title}
          subtitle={isNote ? `${noteLabel} for invoice #${inv.invoice} · ${contract.order}` : `From ${contract.order} · # assigned on save`}
          backLabel="Cancel"
        />

        <View style={{ gap: 14 }}>
          <Card style={{ gap: 14 }}>
            <Select label="Client" value={String(inv.client || '')} options={clientOptions} onChange={(v) => set({ client: v })} required />
            <Select label="Shipment" value={String(inv.shpType || '')} options={shipOptions} onChange={(v) => set({ shpType: v })} required />
            <DateField label={isNote ? `${noteLabel} date` : 'Invoice date'} required value={inv.dateRange?.startDate} onChange={(iso) => set({ dateRange: { startDate: iso, endDate: iso } })} />
            <DateField label="Delivery date" value={(inv.delDate as any)?.startDate} onChange={(iso) => set({ delDate: { startDate: iso, endDate: iso } })} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" tone="muted">Currency</Text>
              <Text variant="bodyMedium">{sym.trim() === '€' ? 'EUR' : 'USD'} (from contract)</Text>
            </View>
          </Card>

          <InvoiceHeaderFields
            value={inv}
            settings={settings}
            onChange={onHeader}
            salesContract={{
              options: sc.headerOptions,
              onPick: (scId) => set({ salesContractId: scId, clientContractNo: sc.contractNoOf(scId) ?? inv.clientContractNo }),
            }}
          />

          <Card>
            <SectionHeader
              title="Materials"
              subtitle={`${lines.length} line(s)`}
              right={<Text variant="h3" tone="primary">{sym}{fmtMoney(total)}</Text>}
            />
            {lines.map((l: any, i: number) => (
              <View key={l.id} style={{ gap: 10, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text variant="label" tone="faint" style={{ width: 18 }}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Select label="Material" value={l.descriptionId} options={productOptions} onChange={(v) => setLine(i, { descriptionId: v })} required />
                  </View>
                  <Pressable onPress={() => removeLine(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove line" style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={20} color={colors.negative} />
                  </Pressable>
                </View>
                <Select label="Warehouse" value={l.stock} options={whOptions} onChange={(v) => setLine(i, { stock: v })} required />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><TextField label="Qty" value={String(l.qnty ?? '')} onChangeText={(t) => setLine(i, { qnty: t })} keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1 }}><TextField label="Unit price" value={String(l.unitPrc ?? '')} onChangeText={(t) => setLine(i, { unitPrc: t })} keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 12, alignItems: 'flex-end' }}>
                    <Text variant="bodyMedium" tone="muted">{sym}{fmtMoney(num(l.total))}</Text>
                  </View>
                </View>
                {/* Web per-line Sales PO (5ebacdb7): an invoice can cover several client POs. */}
                <Select
                  label="Sales contract"
                  value={String(l.salesContractId || '')}
                  options={sc.lineOptions}
                  placeholder={inheritedSc ? `Invoice link: ${inheritedSc}` : 'Uses the invoice link'}
                  onChange={(v) => setLine(i, { salesContractId: v || '' })}
                />
              </View>
            ))}
            <Pressable
              onPress={addLine}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong }}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text variant="bodyMedium" tone="primary">Add material</Text>
            </Pressable>
          </Card>

          <Button title={isNote ? `Create ${noteLabel.toLowerCase()}` : 'Create invoice'} loading={create.isPending} onPress={onSave} />
          <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
            {isNote
              ? `Issued under invoice #${inv.invoice} and linked to ${contract.order}; the original is marked as having a ${noteLabel.toLowerCase()}.`
              : `Assigns the next invoice #, links it to ${contract.order}, and ${inv.draft ? 'saves it as a draft — no stock moves until it is issued.' : 'records a stock-out per line.'}`}
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
