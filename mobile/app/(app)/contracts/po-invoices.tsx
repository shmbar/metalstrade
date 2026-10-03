import { useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, DateField, Button, SectionHeader, EmptyState, SkeletonList, StackHeader, IconButton, ErrorState, Sheet, Badge } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useContracts } from '@/features/contracts/useContracts';
import {
  PoInvoice, addInvoice, addInvoiceFromDoc, deleteInvoice, addPayment, deletePayment, linkedInvoiceBlock,
  setInvoiceField, setPaymentAmount, setPaymentPerc, setPaymentDate, toggleDraft,
} from '@/features/contracts/poInvoiceModel';
import { pickDocument, photographDocument, readSupplierInvoice, type PickedDocument } from '@/features/contracts/docImport';
import { attachmentName, defaultSelection, expenseOut, readWarnings, type InvoiceField, type Selection } from '@/features/contracts/invoiceRead';
import { updateContractField, newId } from '@/data/writes';
import { existingSalesInvoiceNumbers } from '@/data/firestore';
import { uploadFile } from '@/data/storage';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/toast';
import { apiConfigured } from '@/lib/api';
import { curSymbol, fmtMoney, dateLabel, moneyFull } from '@/lib/format';
import { layout } from '@/theme/tokens';

// The supplier invoice the reader has just read, waiting for the user's go-ahead.
interface InvoiceReview {
  doc: PickedDocument;
  source: 'pdf' | 'camera';
  result: any;
  selected: Selection;
}

// Purchase Invoices editor — the mobile twin of web's poInvModal. Mobile could
// previously only read poInvoices; there was no way to add one, set its value, or
// build a payment schedule.
export default function PoInvoices() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const uidCollection = useAuth((s) => s.uidCollection);
  const qc = useQueryClient();
  const { data: contracts, isLoading, isError, error, refetch } = useContracts();

  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);
  const [list, setList] = useState<PoInvoice[] | null>(null);
  const rows = list ?? ((contract?.poInvoices as any as PoInvoice[]) || []);
  const dirty = list !== null;

  const apply = (next: PoInvoice[] | null) => {
    if (!next) return; // rejected keystroke (>2 decimals)
    setList(next);
  };

  /* Web poInvModal deleteItems (66b06dd7): a purchase invoice linked to a sales invoice
     (invRef) can't be deleted while that sales invoice still EXISTS — anywhere in the
     workspace, since material imported from this PO can be sold on another. A link left
     behind by a deleted sales invoice no longer blocks. Mobile used to delete with no
     check at all. */
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const confirmDelete = async (inv: PoInvoice) => {
    const refs = [...new Set(((inv as any).invRef || []).map(String).filter(Boolean))] as string[];
    if (refs.length && uidCollection) {
      let live: Map<string, string>;
      setCheckingId(inv.id);
      try {
        live = await existingSalesInvoiceNumbers(uidCollection, refs);
      } catch (e: any) {
        Alert.alert('Could not check', `Could not check the linked sales invoices (${e?.code || e?.message || e}) — nothing was removed.`);
        return;
      } finally {
        setCheckingId(null);
      }
      const block = linkedInvoiceBlock(refs, live, String(contract?.order || ''));
      if (block) {
        Alert.alert('Linked to a sales invoice', block);
        return;
      }
    }
    Alert.alert('Delete invoice?', inv.inv || 'This purchase invoice', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => apply(deleteInvoice(rows, inv.id)) },
    ]);
  };

  const save = useMutation({
    meta: { success: 'Payments successfully saved!' },
    mutationFn: async () => {
      if (!uidCollection || !contract) throw new Error('Not authenticated');
      const date = (contract as any).dateRange?.startDate || (contract as any).date || '';
      await updateContractField(uidCollection, contract.id, date, { poInvoices: rows });
    },
    onSuccess: () => {
      setList(null);
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['cashflow'] });
      qc.invalidateQueries({ queryKey: ['contracts-review'] });
    },
    onError: (e: any) => Alert.alert('Save failed', e?.message || 'Could not save purchase invoices.'),
  });

  /* Read a supplier's invoice from a PDF or a photo — web poInvModal "Autofill from PDF"
     (the 'expense' reader: the supplier's invoice number and the amount). The phone could
     only take an invoice typed in by hand. The read lands in a review sheet first, with
     web's own default ticks (a low-confidence figure starts unticked); nothing is saved
     until "Save purchase invoices", exactly as on web. */
  const settings = useSettings((s) => s.settings);
  const [reading, setReading] = useState<null | 'pdf' | 'camera'>(null);
  const [review, setReview] = useState<InvoiceReview | null>(null);

  const readInvoice = async (source: 'pdf' | 'camera') => {
    try {
      const doc = source === 'camera'
        ? await photographDocument()
        : await pickDocument(['application/pdf', 'image/jpeg', 'image/png']);
      if (!doc) return;
      setReading(source);
      const result = await readSupplierInvoice(doc, settings);
      setReview({ doc, source, result, selected: defaultSelection(result) });
    } catch (e: any) {
      Alert.alert('Could not read the invoice', e?.message || 'Try again, or enter the invoice by hand.');
    } finally {
      setReading(null);
    }
  };

  /* The original document goes into this contract's attachments, as web does when it
     applies a read. Named for the invoice ("Invoice 147 - scan_0001.pdf") so the Cashflow
     invoice preview finds it again — web's own preview upload names files the same way. */
  const attach = async (doc: PickedDocument, invoiceNo: string) => {
    if (!contract) return;
    try {
      await uploadFile(contract.id, doc.uri, attachmentName(doc.name, invoiceNo), doc.mimeType);
      qc.invalidateQueries({ queryKey: ['files', contract.id] });
    } catch (e: any) {
      toast.error(`The invoice was read, but its file could not be attached: ${e?.message || 'upload failed'}.`);
    }
  };

  const confirmReview = () => {
    if (!review) return;
    const out = expenseOut(review.result, review.selected);
    const res = addInvoiceFromDoc(rows, out, newId(), newId());
    apply(res.list);
    const num = String(out.expense || '').trim();
    const from = review.source === 'camera' ? 'the photo' : 'the PDF';
    toast.success(res.existing
      ? `Invoice ${num} is already recorded — its value was refreshed from ${from}`
      : `Purchase invoice read from ${from} — review the values and Save`);
    attach(review.doc, num);
    setReview(null);
  };

  if (!contract && isLoading) {
    return (
      <Screen>
        <StackHeader title="Purchase invoices" />
        <SkeletonList count={4} />
      </Screen>
    );
  }
  if (!contract && isError) {
    return (
      <Screen>
        <StackHeader title="Purchase invoices" />
        <ErrorState message={(error as Error)?.message || 'Could not load this contract.'} onRetry={refetch} />
      </Screen>
    );
  }
  if (!contract) {
    return (
      <Screen>
        <StackHeader title="Purchase invoices" />
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
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader
        title="Purchase invoices"
        right={
          <IconButton
            icon="add"
            variant="primary"
            accessibilityLabel="Add purchase invoice"
            onPress={() => apply(addInvoice(rows, newId(), newId()))}
          />
        }
      />
      <Text variant="caption" tone="muted" style={{ marginBottom: 12 }}>
        {(contract as any).order || 'Contract'} · {rows.length} invoice(s)
      </Text>

      {apiConfigured() && (
        <View style={{ marginBottom: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Autofill from PDF"
                variant="secondary"
                loading={reading === 'pdf'}
                disabled={!!reading}
                leftIcon={<Ionicons name="sparkles" size={18} color={colors.primary} />}
                onPress={() => readInvoice('pdf')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Scan with camera"
                variant="secondary"
                loading={reading === 'camera'}
                disabled={!!reading}
                leftIcon={<Ionicons name="camera-outline" size={18} color={colors.primary} />}
                onPress={() => readInvoice('camera')}
              />
            </View>
          </View>
          {/* A spinner with nothing under it reads as a hang (client, 2026-09-04). */}
          {reading && (
            <Text variant="caption" tone="muted">Reading the invoice — this can take up to a minute.</Text>
          )}
        </View>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No purchase invoices"
          message={apiConfigured()
            ? "Read one from the supplier's PDF, or add it with + to record what was billed and how it is being paid."
            : 'Add one to record what the supplier billed and how it is being paid.'}
          icon={<Ionicons name="document-outline" size={24} color={colors.textFaint} />}
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
              <Text variant="body" tone="muted">Total paid</Text>
              <Text variant="bodyMedium" tone="positive" style={{ fontVariant: ['tabular-nums'] }}>
                {sym}{fmtMoney(parseFloat(inv.pmnt) || 0)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" tone="muted">Balance</Text>
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
                  <IconButton
                    icon="add"
                    size={34}
                    accessibilityLabel="Add payment"
                    onPress={() => apply(addPayment(rows, inv.id, newId()))}
                  />
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
                    <Pressable onPress={() => apply(deletePayment(rows, inv.id, p.pmntId))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete payment" style={{ paddingTop: 18 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.negative} />
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
                haptic="selection" onPress={() => { apply(toggleDraft(rows, inv.id, !inv.draft)); }}
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
              <Pressable onPress={() => confirmDelete(inv)} disabled={checkingId === inv.id} hitSlop={8}>
                <Text variant="caption" style={{ color: colors.negative }}>{checkingId === inv.id ? 'Checking…' : 'Delete'}</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      {rows.length > 0 && (
        <Card style={{ marginBottom: layout.stack }}>
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

      <InvoiceReviewSheet
        review={review}
        rows={rows}
        po={{
          supplierId: (contract as any).supplier,
          supplierName: settings?.Supplier?.Supplier?.find((s: any) => s.id === (contract as any).supplier)?.nname,
          currencyId: (contract as any).cur,
          currencyCode: settings?.Currency?.Currency?.find((c: any) => c.id === (contract as any).cur)?.cur,
        }}
        onToggle={(f) => setReview((r) => (r ? { ...r, selected: { ...r.selected, [f]: !r.selected[f] } } : r))}
        onCancel={() => setReview(null)}
        onConfirm={confirmReview}
      />
    </Screen>
  );
}

/* What the reader found, before it touches the list — web's DocumentImportOverlay
   preview, for a phone. Invoice # and Amount are the two fields a purchase invoice
   takes (web addInvoiceFromDoc), each with its tick and the reader's confidence; the
   supplier, date and currency are shown so a wrong PO is caught here, not after Save. */
function InvoiceReviewSheet({
  review, rows, po, onToggle, onCancel, onConfirm,
}: {
  review: InvoiceReview | null;
  rows: PoInvoice[];
  po: { supplierId?: string; supplierName?: string; currencyId?: string; currencyCode?: string };
  onToggle: (f: InvoiceField) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors } = useTheme();
  const result = review?.result;
  const selected = review?.selected || {};
  const out = expenseOut(result, selected);
  const num = String(out.expense || '').trim();
  // The same match addInvoiceFromDoc will make, so the button can say what will happen.
  const existing = review ? addInvoiceFromDoc(rows, out, '_', '_').existing : null;
  const nothing = !num && out.amount == null;
  const warnings = readWarnings(result, po);
  const amount = result?.amount != null && result.amount !== ''
    ? result.currencyId
      ? moneyFull(result.currencyId, result.amount)
      : `${fmtMoney(result.amount)}${result.currencyCode ? ` ${result.currencyCode}` : ''}`
    : null;
  const what = review?.source === 'camera' ? 'photo' : 'file';

  return (
    <Sheet
      visible={!!review}
      onClose={onCancel}
      title="Supplier invoice"
      subtitle={review?.doc.name}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="Cancel" variant="secondary" onPress={onCancel} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title={existing ? `Update ${num}` : 'Add invoice'}
              disabled={nothing}
              onPress={onConfirm}
            />
          </View>
        </View>
      }
    >
      {warnings.map((w) => (
        <View key={w} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
          <Ionicons name="alert-circle" size={16} color={colors.warn} style={{ marginTop: 1 }} />
          <Text variant="caption" style={{ flex: 1, color: colors.warn }}>{w}</Text>
        </View>
      ))}

      <ReviewField
        label="Invoice #"
        value={result?.vendorInvoiceNumber}
        confidence={result?.confidence?.vendorInvoiceNumber}
        selected={!!selected.vendorInvoiceNumber}
        onToggle={() => onToggle('vendorInvoiceNumber')}
      />
      <ReviewField
        label="Amount"
        value={amount}
        confidence={result?.confidence?.amount}
        selected={!!selected.amount}
        onToggle={() => onToggle('amount')}
      />
      <InfoRow
        label="Supplier"
        value={result?.supplierId ? result.supplierName : result?.supplierName ? `${result.supplierName} (not in your suppliers)` : null}
      />
      <InfoRow label="Invoice date" value={result?.date} />
      <InfoRow label="Currency" value={result?.currencyCode} />

      {nothing ? (
        <Text variant="caption" tone="muted" style={{ marginTop: 10 }}>
          Nothing to add — tick the invoice number or the amount, or enter the invoice by hand with +.
        </Text>
      ) : (
        <Text variant="caption" tone="muted" style={{ marginTop: 10 }}>
          {existing
            ? `Invoice ${num} is already on this PO — its value will be refreshed; its payments stay as they are.`
            : 'A new purchase invoice is added. Review it, then Save.'}
          {` The ${what} is saved to this contract's attachments as "${attachmentName(review?.doc.name || '', num)}".`}
        </Text>
      )}
    </Sheet>
  );
}

function ReviewField({
  label, value, confidence, selected, onToggle,
}: {
  label: string;
  value: any;
  confidence?: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  if (value == null || value === '') return null;
  return (
    <Pressable
      haptic="selection"
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label} ${value}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={20} color={selected ? colors.primary : colors.textFaint} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone="muted">{label}</Text>
        <Text variant="bodyMedium">{String(value)}</Text>
      </View>
      {confidence ? (
        <Badge label={confidence} tone={confidence === 'high' ? 'positive' : confidence === 'low' ? 'negative' : 'warn'} />
      ) : null}
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  const { colors } = useTheme();
  if (value == null || value === '') return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text variant="body" tone="muted">{label}</Text>
      <Text variant="body" style={{ flexShrink: 1, textAlign: 'right' }}>{String(value)}</Text>
    </View>
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

