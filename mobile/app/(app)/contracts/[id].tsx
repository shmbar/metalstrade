import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { BackButton } from '@/components/ui/BackButton';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Text, Badge, Button, ProgressBar, SectionHeader, EmptyState, SkeletonList, Sheet, IconButton, Avatar, ActionGrid, ErrorState, Chip } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/store/settings';
import { useContracts, deriveContract, ownProducts } from '@/features/contracts/useContracts';
import { useDuplicateContract } from '@/features/contracts/useDuplicateContract';
import { Invoice } from '@/data/types';
import { groupInvoices, invoiceBalance, num, resolveCur, isFinalized } from '@shared/finance';
import { curSymbol, fmtMoney, fmtCurKM } from '@/lib/format';
import { exportPdf } from '@/lib/export';
import { contractPoHtml } from '@/lib/pdfTemplates';
import { annexViiHtml, isfHtml } from '@/lib/customsDocs';
import { CommentsSheet } from '@/components/CommentsSheet';
import { HistorySheet } from '@/components/HistorySheet';
import { useShallow } from 'zustand/react/shallow';

export default function ContractDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, compData } = useSettings(useShallow((s) => ({ settings: s.settings, compData: s.compData })));
  const { data: contracts, isLoading: contractsLoading, isError, error, refetch } = useContracts();

  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);

  // Customs document export with optional saved-template merge (web Documents tab).
  const [docPicker, setDocPicker] = useState<'annex' | 'isf' | null>(null);
  // Web's contract modal has a comment thread and a per-record history; mobile had neither.
  const [sheet, setSheet] = useState<'comments' | 'history' | 'note' | null>(null);
  const [noteType, setNoteType] = useState<'2222' | '3333'>('2222');
  const annexTemplates = (settings as any)?.['Annex VII']?.['Annex VII']?.filter((t: any) => !t.deleted) || [];
  const isfTemplates = (settings as any)?.ISF?.ISF?.filter((t: any) => !t.deleted) || [];

  const exportDoc = (kind: 'annex' | 'isf', template?: any) => {
    setDocPicker(null);
    if (!contract) return;
    const key = kind === 'annex' ? 'annexVII' : 'isf';
    const merged = { ...contract, [key]: { ...((contract as any)[key] || {}), ...(template || {}) } };
    if (kind === 'annex') exportPdf(annexViiHtml(merged, compData, settings), `AnnexVII-${contract.order || contract.id}`);
    else exportPdf(isfHtml(merged, compData, settings), `ISF-${contract.order || contract.id}`);
  };

  const onDocPress = (kind: 'annex' | 'isf') => {
    const templates = kind === 'annex' ? annexTemplates : isfTemplates;
    if (templates.length === 0) exportDoc(kind);
    else setDocPicker(kind);
  };

  // Duplicate — shared with the contracts-list swipe action (web parity).
  const { duplicate, isPending: duplicating } = useDuplicateContract();
  const onDuplicate = () => contract && duplicate(contract);

  // Deep links (push notifications) land here before the contracts list is cached —
  // show a loading skeleton instead of flashing "not found" while the query runs.
  if (!contract && contractsLoading) {
    return (
      <Screen>
        <BackBar />
        <SkeletonList count={4} />
      </Screen>
    );
  }

  // A failed load is not a missing contract: say which it is, and offer the retry.
  if (!contract && isError) {
    return (
      <Screen>
        <BackBar />
        <ErrorState message={(error as Error)?.message || 'Could not load this contract.'} onRetry={refetch} />
      </Screen>
    );
  }

  if (!contract) {
    return (
      <Screen>
        <BackBar />
        <EmptyState
          title="Contract not found"
          message="Open it from the contracts list."
          icon={<Ionicons name="document-text-outline" size={40} color={colors.textFaint} />}
        />
      </Screen>
    );
  }

  const v = deriveContract(contract, settings);

  // import-flagged rows are breakdown/merge helpers, not PO lines — web hides them
  // from the products list and every quantity roll-up.
  const productsData = ownProducts(contract);
  const poInvoices = Array.isArray(contract.poInvoices) ? contract.poInvoices : [];

  // Payments recorded against the PO (purchase side).
  const poPaid = poInvoices.reduce((s, p) => s + num(p.pmnt), 0);
  const poCount = poInvoices.length;

  // Linked sales invoices, deduped to canonical entries (finance.groupInvoices)
  // so an invoice + its credit/final note count once, with combined payments.
  const invoiceRows = (Array.isArray(contract.invoicesData) ? (contract.invoicesData as Invoice[][]) : [])
    .flatMap((group) => groupInvoices(Array.isArray(group) ? group : []))
    .map((inv) => ({
      number: inv.invoice,
      cur: resolveCur(inv),
      total: num(inv.totalAmount),
      balance: invoiceBalance(inv),
      finalized: isFinalized(inv),
    }));
  // Invoices a Credit/Final note can be issued against — web locks every non-1111 row.
  const noteOriginals = ((contract.invoices || []) as any[]).filter((x) => x?.id && x?.invType === '1111');

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBar />
        <IconButton
          icon="create-outline"
          accessibilityLabel="Edit contract"
          onPress={() => router.push(`/(app)/contracts/edit?id=${contract.id}`)}
        />
      </View>

      {/* Title block */}
      <View style={{ marginTop: 12, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={v.supplierName} size={48} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="display" numberOfLines={1}>{contract.order || 'Untitled PO'}</Text>
            <Text variant="body" tone="muted" numberOfLines={1}>
              {v.supplierName}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {v.status ? <Badge label={v.status} tone="info" /> : null}
          <Badge label={curSymbol(v.currency).trim() === '€' ? 'EUR' : 'USD'} tone="neutral" />
          {contract.date ? <Badge label={contract.date.substring(0, 10)} tone="neutral" /> : null}
        </View>
      </View>

      {/* Headline figures */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text variant="label" tone="muted">
            Purchase Value
          </Text>
          <Text variant="stat" tone="primary" style={{ marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>
            {fmtCurKM(v.currency, v.totalValue)}
          </Text>
          <Text variant="caption" tone="faint" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
            {v.valueLabel}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="label" tone="muted">
            Tonnage
          </Text>
          <Text variant="stat" style={{ marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>
            {v.mtLabel}
          </Text>
        </Card>
      </View>

      {/* Products */}
      <Card style={{ marginBottom: 12 }}>
        <SectionHeader title="Products" subtitle={`${productsData.length} line item(s)`} />
        {productsData.length === 0 ? (
          <Text variant="body" tone="muted">
            No products on this contract.
          </Text>
        ) : (
          productsData.map((p, i) => (
            <View
              key={p.id || i}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {p.description || '—'}
                </Text>
                <Text variant="caption" tone="faint">
                  {fmtMoney(num(p.qnty), 3)} × {curSymbol(v.currency)}
                  {fmtMoney(num(p.unitPrc))}
                </Text>
              </View>
              <Text variant="bodyMedium" tone="primary">
                {curSymbol(v.currency)}
                {fmtMoney(num(p.qnty) * num(p.unitPrc))}
              </Text>
            </View>
          ))
        )}
      </Card>

      {/* P&L / Shipments tab entry (web tab 3) */}
      <Card style={{ marginBottom: 12 }} onPress={() => router.push(`/(app)/contracts/pnl?id=${contract.id}`)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="analytics-outline" size={17} color={colors.primary} />
            <Text variant="bodyMedium">P&amp;L · Shipments tracking</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </View>
      </Card>

      {/* Purchase payments + health bar */}
      <Card style={{ marginBottom: 12 }}>
        <SectionHeader
          title="Purchase Payments"
          subtitle={`${poCount} payment record(s)`}
          right={
            <Pressable onPress={() => router.push(`/(app)/contracts/po-invoices?id=${contract.id}`)} hitSlop={8}>
              <Text variant="caption" tone="primary">Edit invoices</Text>
            </Pressable>
          }
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text variant="body" tone="muted">Total paid to supplier</Text>
          <Text variant="figure" tone="positive">
            {curSymbol(v.currency)}{fmtMoney(poPaid)}
          </Text>
        </View>
        {(() => {
          // Progress = paid (Σ poInvoices.pmnt) against BILLED (Σ poInvoices.invValue,
          // falling back to the contract line value). Comparing paid against
          // v.totalValue was comparing Σpmnt with itself, so the bar was always
          // 0% or 100% and always read "Settled".
          const billed = v.invoicedValue;
          const outstanding = billed - poPaid;
          const pct = billed > 0 ? Math.min(100, (poPaid / billed) * 100) : 0;
          return (
            <>
              <ProgressBar pct={pct} color={pct >= 99.9 ? colors.positive : colors.primary} height={8} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text variant="caption" tone="faint">
                  {pct.toFixed(0)}% paid of {curSymbol(v.currency)}{fmtMoney(billed)}
                </Text>
                <Text variant="caption" tone={outstanding > 0.01 ? 'warn' : 'positive'}>
                  {outstanding > 0.01 ? `${curSymbol(v.currency)}${fmtMoney(outstanding)} left` : 'Settled'}
                </Text>
              </View>
            </>
          );
        })()}
      </Card>

      {/* Linked sales invoices */}
      <Card>
        <SectionHeader title="Sales Invoices" subtitle={`${invoiceRows.length} linked invoice(s)`} />
        {invoiceRows.length === 0 ? (
          <Text variant="body" tone="muted">
            No sales invoices linked yet.
          </Text>
        ) : (
          invoiceRows.map((r, i) => (
            <View
              key={`${r.number}-${i}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <View>
                <Text variant="bodyMedium">Invoice #{r.number}</Text>
                <Badge label={r.finalized ? 'Finalized' : 'Provisional'} tone={r.finalized ? 'positive' : 'warn'} />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="bodyMedium">
                  {curSymbol(r.cur)}
                  {fmtMoney(r.total)}
                </Text>
                <Text variant="caption" tone={r.balance > 0.01 ? 'negative' : 'positive'}>
                  {r.balance > 0.01 ? `${curSymbol(r.cur)}${fmtMoney(r.balance)} due` : 'Paid'}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <Button
        title="New invoice"
        style={{ marginTop: 14 }}
        leftIcon={<Ionicons name="add" size={18} color={colors.primaryText} />}
        onPress={() => router.push(`/(app)/contracts/new-invoice?id=${contract.id}`)}
      />
      {noteOriginals.length > 0 && (
        <Button
          title="Credit or final note"
          variant="secondary"
          style={{ marginTop: 10 }}
          leftIcon={<Ionicons name="return-down-back-outline" size={18} color={colors.primary} />}
          onPress={() => setSheet('note')}
        />
      )}

      {/* Everything else the contract can do — web's tab strip, as tiles. */}
      <SectionHeader title="Actions" style={{ marginTop: 18 }} />
      <ActionGrid
        actions={[
          { key: 'stock', label: 'Warehouse stock', icon: 'cube-outline', emphasis: true, onPress: () => router.push(`/(app)/contracts/stock-in?id=${contract.id}`) },
          { key: 'settle', label: 'Final settlement', icon: 'git-merge-outline', emphasis: true, hidden: !(contract.stock?.length || 0), onPress: () => router.push(`/(app)/contracts/final-settlement?id=${contract.id}`) },
          { key: 'files', label: 'Attachments', icon: 'folder-outline', onPress: () => router.push(`/(app)/contracts/files?id=${contract.id}`) },
          { key: 'cert', label: 'Cert checker', icon: 'shield-checkmark-outline', onPress: () => router.push(`/(app)/contracts/cert-checker?id=${contract.id}`) },
          { key: 'po', label: 'Export PO (PDF)', icon: 'document-outline', onPress: () => exportPdf(contractPoHtml(contract, v, compData, settings), `PO-${contract.order || contract.id}`) },
          { key: 'dup', label: 'Duplicate', icon: 'copy-outline', loading: duplicating, onPress: onDuplicate },
          { key: 'comments', label: 'Comments', icon: 'chatbubbles-outline', onPress: () => setSheet('comments') },
          { key: 'history', label: 'History', icon: 'time-outline', onPress: () => setSheet('history') },
          { key: 'annex', label: 'Annex VII', icon: 'document-text-outline', onPress: () => onDocPress('annex') },
          { key: 'isf', label: 'ISF', icon: 'document-text-outline', onPress: () => onDocPress('isf') },
        ]}
      />

      {/* Web contract invoice tab: choose Credit Note / Final Note, then the original. */}
      <Sheet
        visible={sheet === 'note'}
        onClose={() => setSheet(null)}
        title="Credit or final note"
        subtitle="Issued under the original invoice's number"
      >
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
          <Chip label="Credit note" active={noteType === '2222'} onPress={() => setNoteType('2222')} />
          <Chip label="Final note" active={noteType === '3333'} onPress={() => setNoteType('3333')} />
        </View>
        {noteOriginals.map((x, i) => (
          <Pressable
            key={x.id}
            onPress={() => {
              setSheet(null);
              router.push(
                `/(app)/contracts/new-invoice?id=${contract.id}&type=${noteType}&from=${x.id}&fromDate=${encodeURIComponent(String(x.date || ''))}`
              );
            }}
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 13,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
            }}
          >
            <Text variant="bodyMedium">Invoice #{x.invoice}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="caption" tone="muted">{String(x.date || '').substring(0, 10)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </View>
          </Pressable>
        ))}
      </Sheet>

      <CommentsSheet
        visible={sheet === 'comments'}
        onClose={() => setSheet(null)}
        entityType="contract"
        entityId={contract.id}
        entityLabel={`PO ${contract.order || ''}`}
      />
      <HistorySheet
        visible={sheet === 'history'}
        onClose={() => setSheet(null)}
        entityType="contract"
        entityId={contract.id}
        title={`PO ${contract.order || ''}`}
      />

      {/* Template picker for customs doc export */}
      <Sheet
        visible={!!docPicker}
        onClose={() => setDocPicker(null)}
        title={`${docPicker === 'annex' ? 'Annex VII' : 'ISF'} template`}
        subtitle="Pick a saved template to fill the document, or use the contract data as-is."
      >
        <Pressable onPress={() => docPicker && exportDoc(docPicker)} accessibilityRole="button" style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="document-outline" size={18} color={colors.textMuted} />
          <Text variant="bodyMedium">No template (contract data)</Text>
        </Pressable>
        {(docPicker === 'annex' ? annexTemplates : isfTemplates).map((t: any) => (
          <Pressable key={t.id} onPress={() => docPicker && exportDoc(docPicker, t)} accessibilityRole="button" style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
            <Text variant="bodyMedium" tone="primary">{t.name || '(unnamed)'}</Text>
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  );
}

function BackBar() {
  return <BackButton label="Back to contracts" />;
}
