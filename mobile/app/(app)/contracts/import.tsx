import { useMemo, useState } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, StackHeader, ActionGrid, SearchField, EntityRow, LoadingState, EmptyState, SectionHeader } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useContracts } from '@/features/contracts/useContracts';
import { documentFromUri, readSupplierInvoice, type PickedDocument } from '@/features/contracts/docImport';
import { suggestPurchaseOrders } from '@/features/contracts/invoiceRead';
import { setPendingRead } from '@/features/contracts/pendingRead';
import { useSettings } from '@/store/settings';
import { apiConfigured } from '@/lib/api';
import { fileNameOf } from '@/lib/mime';
import { fmtMoney, moneyFull } from '@/lib/format';
import { matchesAllWords, searchWords } from '@shared/search';
import { layout } from '@/theme/tokens';

// The full list shows the latest POs until a search narrows it — a year is a few
// hundred, and the one wanted is nearly always recent.
const LIST_LIMIT = 40;

const supplierNameOf = (settings: any, id: string): string =>
  settings?.Supplier?.Supplier?.find((s: any) => s.id === id)?.nname || '';
const dateOf = (c: any): string => String(c?.date || c?.dateRange?.startDate || '').slice(0, 10);
const poSubtitle = (settings: any, c: any, extra?: string) =>
  [supplierNameOf(settings, c.supplier), dateOf(c), extra].filter(Boolean).join(' · ');

/* A file shared into IMS ("Open in IMS" from Mail, WhatsApp or Files). It used to go
   straight to a new purchase contract, so a supplier's invoice for a PO already in the
   system had nowhere to go on the phone. Now the first question is what the document
   is. An invoice is read once (the 'expense' reader), its PO is picked — the one whose
   number is printed on it first, then that supplier's latest — and that PO's Purchase
   invoices screen opens on its review sheet with this read (features/contracts/
   pendingRead). A proforma still starts a new contract, as before. */
export default function ImportSharedDocument() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const fileUri = String(uri || '');
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings((s) => s.settings);
  const { data: contracts, isLoading } = useContracts();
  const [stage, setStage] = useState<'choose' | 'reading' | 'pick'>('choose');
  const [read, setRead] = useState<{ doc: PickedDocument; result: any } | null>(null);
  const [query, setQuery] = useState('');

  const asContract = () =>
    router.replace({ pathname: '/(app)/contracts/edit', params: { importUri: fileUri } } as any);

  const asInvoice = async () => {
    setStage('reading');
    try {
      const doc = await documentFromUri(fileUri);
      const result = await readSupplierInvoice(doc, settings);
      setRead({ doc, result });
      setStage('pick');
    } catch (e: any) {
      setStage('choose');
      Alert.alert('Could not read the invoice', e?.message || 'Try again, or add the invoice by hand.');
    }
  };

  const pick = (contract: any) => {
    if (!read) return;
    setPendingRead({ contractId: contract.id, doc: read.doc, result: read.result });
    router.replace({ pathname: '/(app)/contracts/po-invoices', params: { id: contract.id } } as any);
  };

  const suggestions = useMemo(
    () => (read ? suggestPurchaseOrders(read.result, contracts || []) : []),
    [read, contracts]
  );
  const all = useMemo(() => {
    const words = searchWords(query);
    return (contracts || [])
      .filter((c: any) => c && !c.deleted && c.order)
      .filter((c: any) => matchesAllWords([c.order, supplierNameOf(settings, c.supplier), dateOf(c)], words))
      .sort((a: any, b: any) => dateOf(b).localeCompare(dateOf(a)));
  }, [contracts, query, settings]);

  const result = read?.result;
  const amount = result?.amount != null && result.amount !== ''
    ? result.currencyId
      ? moneyFull(result.currencyId, result.amount)
      : `${fmtMoney(result.amount)}${result.currencyCode ? ` ${result.currencyCode}` : ''}`
    : null;

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Shared document" subtitle={fileNameOf(fileUri)} backLabel="Cancel" />

      {stage === 'choose' && (
        <View style={{ gap: layout.stack }}>
          <Text variant="body" tone="muted">What is this document?</Text>
          <ActionGrid
            actions={[
              { key: 'invoice', label: 'Supplier invoice', icon: 'receipt-outline', emphasis: true, onPress: asInvoice, hidden: !apiConfigured() },
              { key: 'contract', label: 'New contract', icon: 'document-text-outline', onPress: asContract },
            ]}
          />
          <Text variant="caption" tone="muted">
            {apiConfigured()
              ? "A supplier invoice is added to the purchase invoices of the PO you pick. A new contract starts a purchase order from a supplier's proforma."
              : "A new contract starts a purchase order from a supplier's proforma."}
          </Text>
        </View>
      )}

      {stage === 'reading' && (
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
          <ActivityIndicator color={colors.primary} />
          <Text variant="bodyMedium">Reading the invoice…</Text>
          {/* A spinner with nothing under it reads as a hang (client, 2026-09-04). */}
          <Text variant="caption" tone="muted">This can take up to a minute.</Text>
        </Card>
      )}

      {stage === 'pick' && read && (
        <View style={{ gap: layout.stack }}>
          <Card style={{ gap: 4 }}>
            <Text variant="overline" tone="muted">Read from the invoice</Text>
            <Text variant="h3">
              {result?.vendorInvoiceNumber ? `Invoice ${result.vendorInvoiceNumber}` : 'No invoice number found'}
            </Text>
            <Text variant="body" tone="muted">
              {[amount, result?.supplierName, result?.date].filter(Boolean).join(' · ') || 'No amount or supplier found'}
            </Text>
          </Card>

          <Text variant="body" tone="muted">Which PO is this invoice for?</Text>

          {suggestions.length > 0 && (
            <View>
              <SectionHeader title="Suggested" />
              <Card padded={false}>
                {suggestions.map((s, i) => (
                  <EntityRow
                    key={s.contract.id}
                    first={i === 0}
                    name={`PO ${s.contract.order}`}
                    subtitle={poSubtitle(settings, s.contract, s.why === 'po' ? 'PO number on the invoice' : 'same supplier')}
                    onPress={() => pick(s.contract)}
                  />
                ))}
              </Card>
            </View>
          )}

          <View style={{ gap: 8 }}>
            <SectionHeader title="All purchase orders" subtitle={isLoading ? undefined : `${all.length}`} />
            <SearchField value={query} onChangeText={setQuery} placeholder="Search PO, supplier or date" />
            {isLoading ? (
              <LoadingState />
            ) : all.length === 0 ? (
              <EmptyState
                title="No purchase orders found"
                message="Only POs in the current date range are listed."
              />
            ) : (
              <Card padded={false}>
                {all.slice(0, LIST_LIMIT).map((c: any, i: number) => (
                  <EntityRow
                    key={c.id}
                    first={i === 0}
                    name={`PO ${c.order}`}
                    subtitle={poSubtitle(settings, c)}
                    onPress={() => pick(c)}
                  />
                ))}
              </Card>
            )}
            {all.length > LIST_LIMIT && (
              <Text variant="caption" tone="muted">Showing the latest {LIST_LIMIT} — search to find older ones.</Text>
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
