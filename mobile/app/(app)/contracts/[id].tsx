import { useMemo } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Text, Badge, Button, ProgressBar, SectionHeader, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/store/settings';
import { useContracts, deriveContract } from '@/features/contracts/useContracts';
import { useSaveContract } from '@/features/contracts/useSaveContract';
import { buildAutoOrder } from '@/features/contracts/form';
import { newId } from '@/data/writes';
import { Invoice, Contract } from '@/data/types';
import { groupInvoices, invoiceBalance, num, resolveCur, isFinalized } from '@shared/finance';
import { curSymbol, fmtMoney } from '@/lib/format';
import { exportPdf } from '@/lib/export';
import { contractPoHtml } from '@/lib/pdfTemplates';

export default function ContractDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, compData } = useSettings();
  const { data: contracts } = useContracts();
  const save = useSaveContract();

  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);

  // Duplicate — clones core fields with fresh ids; clears invoices/stock/payments
  // and assigns a new auto PO number (parity with the web duplicate()).
  const onDuplicate = () => {
    if (!contract) return;
    Alert.alert('Duplicate contract?', 'Creates a new draft with the same products and terms.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          const supName = settings?.Supplier?.Supplier?.find((s: any) => s.id === contract.supplier)?.supplier || null;
          const dup: Contract = {
            ...contract,
            id: '',
            invoices: [],
            poInvoices: [],
            stock: [],
            expenses: [],
            order: buildAutoOrder(contracts || [], supName),
            productsData: (contract.productsData || []).map((p) => ({ ...p, id: newId() })),
          };
          try {
            const res = await save.mutateAsync({ value: dup, existing: undefined });
            router.replace(`/(app)/contracts/${res.contract.id}`);
          } catch (e: any) {
            Alert.alert('Failed', e?.message || 'Could not duplicate.');
          }
        },
      },
    ]);
  };

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

  // Payments recorded against the PO (purchase side).
  const poPaid = (contract.poInvoices || []).reduce((s, p) => s + num(p.pmnt), 0);
  const poCount = (contract.poInvoices || []).length;

  // Linked sales invoices, deduped to canonical entries (finance.groupInvoices)
  // so an invoice + its credit/final note count once, with combined payments.
  const invoiceRows = ((contract.invoicesData as Invoice[][]) || [])
    .flatMap((group) => groupInvoices(group))
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
          <Text variant="h1" tone="primary" style={{ marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>
            {v.valueLabel}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="label" tone="muted">
            Tonnage
          </Text>
          <Text variant="h1" style={{ marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>
            {v.mtLabel}
          </Text>
        </Card>
      </View>

      {/* Products */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHeader title="Products" subtitle={`${(contract.productsData || []).length} line item(s)`} />
        {(contract.productsData || []).length === 0 ? (
          <Text variant="body" tone="muted">
            No products on this contract.
          </Text>
        ) : (
          (contract.productsData || []).map((p, i) => (
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
        loading={save.isPending}
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
