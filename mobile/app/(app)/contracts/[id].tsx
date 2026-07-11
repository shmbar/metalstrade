import { useMemo, useState } from 'react';
import { View, Pressable, Alert, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Text, Badge, Button, ProgressBar, SectionHeader, EmptyState, SkeletonList } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/store/settings';
import { useContracts, deriveContract } from '@/features/contracts/useContracts';
import { useDuplicateContract } from '@/features/contracts/useDuplicateContract';
import { Invoice } from '@/data/types';
import { groupInvoices, invoiceBalance, num, resolveCur, isFinalized } from '@shared/finance';
import { curSymbol, fmtMoney, fmtCurKM } from '@/lib/format';
import { exportPdf } from '@/lib/export';
import { contractPoHtml } from '@/lib/pdfTemplates';
import { annexViiHtml, isfHtml } from '@/lib/customsDocs';

export default function ContractDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, compData } = useSettings();
  const { data: contracts, isLoading: contractsLoading } = useContracts();

  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);

  // Customs document export with optional saved-template merge (web Documents tab).
  const [docPicker, setDocPicker] = useState<'annex' | 'isf' | null>(null);
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

  const productsData = Array.isArray(contract.productsData) ? contract.productsData : [];
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

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBar />
        <Pressable
          onPress={() => router.push(`/(app)/contracts/edit?id=${contract.id}`)}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">
            Edit
          </Text>
        </Pressable>
      </View>

      {/* Title block */}
      <View style={{ marginTop: 8, marginBottom: 16 }}>
        <Text variant="display">{contract.order || 'Untitled PO'}</Text>
        <Text variant="body" tone="muted" style={{ marginTop: 2 }}>
          {v.supplierName}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {v.status ? <Badge label={v.status} tone="info" /> : null}
          <Badge label={curSymbol(v.currency).trim() === '€' ? 'EUR' : 'USD'} tone="neutral" />
          {contract.date ? <Badge label={contract.date.substring(0, 10)} tone="neutral" /> : null}
        </View>
      </View>

      {/* Headline figures */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        <Card style={{ flex: 1 }}>
          <Text variant="label" tone="muted">
            Purchase Value
          </Text>
          <Text variant="h1" tone="primary" style={{ marginTop: 6, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
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
          <Text variant="h1" style={{ marginTop: 6, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
            {v.mtLabel}
          </Text>
        </Card>
      </View>

      {/* Products */}
      <Card style={{ marginBottom: 14 }}>
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
                  {fmtMoney(num(p.qnty), 0)} × {curSymbol(v.currency)}
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

      {/* Purchase payments + health bar */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHeader title="Purchase Payments" subtitle={`${poCount} payment record(s)`} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text variant="body" tone="muted">Total paid to supplier</Text>
          <Text variant="h3" tone="positive">
            {curSymbol(v.currency)}{fmtMoney(poPaid)}
          </Text>
        </View>
        {(() => {
          const pct = v.totalValue > 0 ? Math.min(100, (poPaid / v.totalValue) * 100) : 0;
          return (
            <>
              <ProgressBar pct={pct} color={pct >= 99.9 ? colors.positive : colors.primary} height={8} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text variant="caption" tone="faint">{pct.toFixed(0)}% paid of {v.valueLabel}</Text>
                <Text variant="caption" tone={v.totalValue - poPaid > 0.01 ? 'warn' : 'positive'}>
                  {v.totalValue - poPaid > 0.01 ? `${curSymbol(v.currency)}${fmtMoney(v.totalValue - poPaid)} left` : 'Settled'}
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
        title="+ New Invoice"
        style={{ marginTop: 14 }}
        leftIcon={<Ionicons name="add" size={18} color={colors.primaryText} />}
        onPress={() => router.push(`/(app)/contracts/new-invoice?id=${contract.id}`)}
      />
      <Button
        title="Warehouse Stock"
        variant="secondary"
        style={{ marginTop: 10 }}
        leftIcon={<Ionicons name="cube-outline" size={18} color={colors.primary} />}
        onPress={() => router.push(`/(app)/contracts/stock-in?id=${contract.id}`)}
      />
      <Button
        title="Duplicate contract"
        variant="ghost"
        loading={duplicating}
        style={{ marginTop: 10 }}
        leftIcon={<Ionicons name="copy-outline" size={18} color={colors.primary} />}
        onPress={onDuplicate}
      />
      <Button
        title="Export PO (PDF)"
        variant="ghost"
        style={{ marginTop: 10 }}
        leftIcon={<Ionicons name="document-outline" size={18} color={colors.primary} />}
        onPress={() => exportPdf(contractPoHtml(contract, v, compData), `PO-${contract.order || contract.id}`)}
      />
      <Button
        title="Attachments"
        variant="ghost"
        style={{ marginTop: 10 }}
        leftIcon={<Ionicons name="folder-outline" size={18} color={colors.primary} />}
        onPress={() => router.push(`/(app)/contracts/files?id=${contract.id}`)}
      />
      <Button
        title="Cert Checker"
        variant="ghost"
        style={{ marginTop: 10 }}
        leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />}
        onPress={() => router.push(`/(app)/contracts/cert-checker?id=${contract.id}`)}
      />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            title="Annex VII"
            variant="ghost"
            leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.primary} />}
            onPress={() => onDocPress('annex')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="ISF"
            variant="ghost"
            leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.primary} />}
            onPress={() => onDocPress('isf')}
          />
        </View>
      </View>

      {/* Template picker for customs doc export */}
      <Modal visible={!!docPicker} transparent animationType="slide" onRequestClose={() => setDocPicker(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setDocPicker(null)} />
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20, gap: 6, maxHeight: '70%' }}>
          <Text variant="h2" style={{ marginBottom: 4 }}>{docPicker === 'annex' ? 'Annex VII' : 'ISF'} template</Text>
          <Text variant="caption" tone="muted" style={{ marginBottom: 8 }}>Pick a saved template to fill the document, or use the contract data as-is.</Text>
          <Pressable onPress={() => docPicker && exportDoc(docPicker)} style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="document-outline" size={18} color={colors.textMuted} />
            <Text variant="bodyMedium">No template (contract data)</Text>
          </Pressable>
          {(docPicker === 'annex' ? annexTemplates : isfTemplates).map((t: any) => (
            <Pressable key={t.id} onPress={() => docPicker && exportDoc(docPicker, t)} style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              <Text variant="bodyMedium" tone="primary">{t.name || '(unnamed)'}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
      {(contract.stock?.length || 0) > 0 && (
        <Button
          title="Final Settlement"
          variant="secondary"
          style={{ marginTop: 10 }}
          leftIcon={<Ionicons name="git-merge-outline" size={18} color={colors.primary} />}
          onPress={() => router.push(`/(app)/contracts/final-settlement?id=${contract.id}`)}
        />
      )}
    </Screen>
  );
}

function BackBar() {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
    >
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">
        Contracts
      </Text>
    </Pressable>
  );
}
