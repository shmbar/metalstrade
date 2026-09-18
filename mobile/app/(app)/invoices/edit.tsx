import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Alert } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Select, DateField, Button, SectionHeader, EmptyState, StackHeader, IconButton, SkeletonList, KeyboardFooter } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useInvoices, deriveInvoice } from '@/features/invoices/useInvoices';
import { useEditInvoice } from '@/features/invoices/useEditInvoice';
import { InvoiceHeaderFields, InvoiceHeaderValue, pickInvoiceHeader } from '@/features/invoices/InvoiceHeaderFields';
import { useInvoiceSalesContracts } from '@/features/invoices/useInvoiceSalesContracts';
import { newId } from '@/data/writes';
import { num } from '@shared/finance';
import { curSymbol, fmtMoney } from '@/lib/format';
import { layout, spacing } from '@/theme/tokens';

export default function InvoiceEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings((s) => s.settings);
  const { data: invoices, isLoading } = useInvoices();
  const edit = useEditInvoice();

  const view = useMemo(() => {
    const inv = invoices?.find((i) => i.id === id);
    return inv ? deriveInvoice(inv, settings) : null;
  }, [invoices, id, settings]);

  const [client, setClient] = useState<string>(() => {
    const c = view?.raw.client;
    return (c && typeof c === 'object' ? c.id : c) || '';
  });
  const [shpType, setShpType] = useState<string>(view?.raw.shpType || '');
  const [delDate, setDelDate] = useState<string | null>((view?.raw.delDate as any)?.startDate || null);
  const [lines, setLines] = useState<any[]>(() => (view?.raw.productsDataInvoice || []).map((p: any) => ({ ...p })));
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [header, setHeader] = useState<InvoiceHeaderValue>(() => pickInvoiceHeader(view?.raw));
  const sc = useInvoiceSalesContracts(view ? { ...view.raw, ...header, client, productsDataInvoice: lines } : null);

  /* Seed once, when the invoice arrives (see the note at the top of this file).
     Before this, a deep link into an unloaded cache produced a form with no client
     and NO LINES, and "Save changes" would have written that over the invoice. */
  const seededId = useRef<string | null>(null);
  useEffect(() => {
    if (!view || seededId.current === view.id) return;
    seededId.current = view.id;
    const c = view.raw.client;
    setClient((c && typeof c === 'object' ? (c as any).id : c) || '');
    setShpType(view.raw.shpType || '');
    setDelDate((view.raw.delDate as any)?.startDate || null);
    setLines((view.raw.productsDataInvoice || []).map((p: any) => ({ ...p })));
    setHeader(pickInvoiceHeader(view.raw));
  }, [view]);

  if (!view && isLoading) {
    return (
      <Screen>
        <StackHeader title="Edit invoice" backLabel="Cancel" />
        <SkeletonList count={4} />
      </Screen>
    );
  }

  if (!view) {
    return (
      <Screen>
        <StackHeader title="Edit invoice" backLabel="Cancel" />
        <EmptyState title="Invoice not found" message="Open it from the invoices list." />
      </Screen>
    );
  }

  const sym = curSymbol(view.cur);
  // An untagged line counts against the invoice's own link — say so instead of "none".
  const inheritedSc = sc.lineOptions.find((o) => o.value === header.salesContractId)?.label;
  const clientOptions = (settings?.Client?.Client || []).filter((c: any) => !c.deleted).map((c: any) => ({ value: c.id, label: c.nname || '—' }));
  const shipOptions = (settings?.Shipment?.Shipment || []).filter((s: any) => !s.deleted).map((s: any) => ({ value: s.id, label: s.shpType || '' }));

  const setLine = (i: number, patch: any) =>
    setLines((prev) => {
      const arr = [...prev];
      const row = { ...arr[i], ...patch };
      if ('qnty' in patch || 'unitPrc' in patch) row.total = row.qnty === 's' ? num(row.unitPrc) : Math.round(num(row.qnty) * num(row.unitPrc) * 100) / 100;
      arr[i] = row;
      return arr;
    });
  const addLine = () => setLines((p) => [...p, { id: newId(), description: '', descriptionId: '', qnty: '', unitPrc: '', total: 0 }]);
  // Removing a line must also delete its stock doc on save (web delStock), so track
  // the ids that were present when the form opened and have since gone.
  const removeLine = (i: number) =>
    setLines((p) => {
      const gone = p[i];
      if (gone?.id) setRemovedIds((r) => (r.includes(gone.id) ? r : [...r, gone.id]));
      return p.filter((_, k) => k !== i);
    });
  const total = lines.reduce((s, p) => s + num(p.total), 0);

  const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

  const onSave = async () => {
    // Web blocks editing a finalized invoice outright (invoiceDetails renders
    // read-only when valueInv.final, and onCellUpdate returns early on row.final).
    // Mobile used to let a user overwrite a legally issued document.
    if ((view.raw as any).final) {
      Alert.alert('Finalized invoice', 'This invoice has been finalized and can no longer be edited.');
      return;
    }
    if (!client || !shpType) {
      Alert.alert('Missing fields', 'Client and shipment are required.');
      return;
    }
    try {
      // Recompute the stored prepayment fields exactly as web's productsTableInvoice
      // does whenever a line changes. The web Balance column and the Cashflow page
      // read these STORED values, so patching totalAmount alone left them stale.
      const raw = view.raw as any;
      const invType = raw.invType;
      const pct = raw.percentage;
      const totalPrepayment =
        invType === '1111'
          ? pct !== '' && pct != null
            ? round2((Number(pct) / 100) * total)
            : ''
          : raw.totalPrepayment;
      const balanceDue =
        invType === '2222' || invType === '3333'
          ? round2(round2(total) - round2(Number(raw.totalPrepayment) || 0))
          : round2(round2(total) - round2(Number(totalPrepayment) || 0));

      await edit.mutateAsync({
        id: view.id,
        year: view.year,
        patch: {
          client,
          shpType,
          delDate: delDate ? { startDate: delDate, endDate: delDate } : { startDate: null, endDate: null },
          productsDataInvoice: lines,
          totalAmount: round2(total),
          totalPrepayment,
          balanceDue,
          ...header,
        },
        raw,
        removedLineIds: removedIds,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save the invoice.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <StackHeader title={`Edit invoice #${view.number}`} subtitle={view.clientName} backLabel="Cancel" />

        <View style={{ gap: layout.stack }}>
          <Card style={{ gap: spacing.md }}>
            <Select label="Client" value={client} options={clientOptions} onChange={setClient} required />
            <Select label="Shipment" value={shpType} options={shipOptions} onChange={setShpType} required />
            <DateField label="Delivery date" value={delDate} onChange={setDelDate} />
          </Card>

          <InvoiceHeaderFields
            value={header}
            settings={settings}
            onChange={(p) =>
              setHeader((h) => ({
                ...h,
                ...('clientContractNo' in p ? { ...p, salesContractId: sc.autoMatch(String(p.clientContractNo || '')) } : p),
              }))
            }
            salesContract={{
              options: sc.headerOptions,
              onPick: (scId) => setHeader((h) => ({ ...h, salesContractId: scId, clientContractNo: sc.contractNoOf(scId) ?? h.clientContractNo })),
            }}
          />

          <Card>
            <SectionHeader title="Materials" subtitle={`${lines.length} line(s)`} right={<Text variant="h3" tone="primary">{sym}{fmtMoney(total)}</Text>} />
            {lines.map((l, i) => (
              <View key={l.id || i} style={{ gap: 8, paddingVertical: layout.rowPad, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <TextField value={String(l.description ?? '')} onChangeText={(t) => setLine(i, { description: t })} placeholder="Description" />
                  </View>
                  <IconButton icon="trash-outline" tone="danger" size={36} accessibilityLabel="Remove line" onPress={() => removeLine(i)} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><TextField value={String(l.qnty ?? '')} onChangeText={(t) => setLine(i, { qnty: t })} placeholder="Qty" keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1 }}><TextField value={String(l.unitPrc ?? '')} onChangeText={(t) => setLine(i, { unitPrc: t })} placeholder="Unit price" keyboardType="decimal-pad" /></View>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}><Text variant="bodyMedium" tone="muted">{sym}{fmtMoney(num(l.total))}</Text></View>
                </View>
                <Select
                  label="Sales contract"
                  value={String(l.salesContractId || '')}
                  options={sc.lineOptions}
                  placeholder={inheritedSc ? `Invoice link: ${inheritedSc}` : 'Uses the invoice link'}
                  onChange={(v) => setLine(i, { salesContractId: v || '' })}
                />
              </View>
            ))}
            <Pressable onPress={addLine} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong }}>
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text variant="bodyMedium" tone="primary">Add material</Text>
            </Pressable>
          </Card>

          <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>Invoice date & number are unchanged.</Text>
        </View>
      </Screen>

      {/* Sticky save bar */}
      <KeyboardFooter
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.bgElevated,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        <Button title="Save changes" loading={edit.isPending} onPress={onSave} />
      </KeyboardFooter>
    </View>
  );
}
