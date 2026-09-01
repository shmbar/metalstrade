import { useMemo, useState } from 'react';
import { View, Pressable, FlatList, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, TextField, Button, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useAccounting, AccountingGroup } from '@/features/accounting/useAccounting';
import { useAccountingEdit } from '@/features/accounting/useAccountingEdit';
import { curSymbol, fmtMoney, dateLabel } from '@/lib/format';
import { exportCsv } from '@/lib/export';
import { useSettings } from '@/store/settings';

export default function Accounting() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useAccounting();
  const [search, setSearch] = useState('');
  const { dateSelect } = useSettings();
  const { editExpense } = useAccountingEdit();
  const [editLine, setEditLine] = useState<any | null>(null);
  const [draft, setDraft] = useState<{ expInvoice: string; amountExp: string }>({ expInvoice: '', amountExp: '' });

  const groups: AccountingGroup[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = data || [];
    if (!q) return all;
    return all.filter(
      (g) => g.saleInvoice.toLowerCase().includes(q) || g.clientInvName.toLowerCase().includes(q) || g.invoice.includes(q)
    );
  }, [data, search]);

  // Excel export — web parity. One row per merged line (invoice row, then each of
  // its expense/purchase lines), matching how web flattens the table.
  const onExport = () => {
    const rows: (string | number)[][] = [];
    (data || []).forEach((g) => {
      rows.push([
        g.saleInvoice ?? g.invoice ?? '',
        dateLabel(g.dateInv),
        g.clientInvName || '',
        g.curINV || '',
        (g.amountInv || 0).toFixed(2),
        '', '', '', '',
      ]);
      (g.lines || []).forEach((l) => {
        rows.push([
          g.saleInvoice ?? g.invoice ?? '',
          '', '', '', '',
          l.expInvoice || '',
          dateLabel(l.dateExp),
          l.supplierName || '',
          (l.amountExp || 0).toFixed(2),
        ]);
      });
    });
    exportCsv(
      `Accounting ${dateSelect.start.substring(0, 4)}`,
      ['Sales Invoice', 'Date', 'Client', 'Currency', 'Amount', 'Expense/Purchase #', 'Exp date', 'Supplier', 'Exp amount'],
      rows
    );
  };
  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Accounting</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={onExport} hitSlop={8}>
            <Ionicons name="download-outline" size={20} color={colors.primary} />
          </Pressable>
          <PeriodSelector />
        </View>
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search invoice # or client…"
        autoCapitalize="none"
        rightElement={<Ionicons name="search" size={18} color={colors.textFaint} />}
      />
      <View style={{ height: 12 }} />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : groups.length === 0 ? (
        <EmptyState title="No entries" message="No invoices in the selected period." icon={<Ionicons name="reader-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.invoice}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => {
            const symS = curSymbol(item.curINV);
            const costs = item.lines.reduce((s, l) => s + l.amountExp, 0);
            return (
              <Card style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="h3" numberOfLines={1}>#{item.saleInvoice || item.invoice}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>{item.clientInvName}{item.dateInv ? ` · ${item.dateInv}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="h3" tone="primary">{symS}{fmtMoney(item.amountInv)}</Text>
                    {item.invType ? <Badge label={item.invType} tone="info" /> : null}
                  </View>
                </View>

                {/* Web renders one Amount row per invoice DOCUMENT — "12345", then
                    "12345CN", then "12345FN", each with its own figure and date
                    (page.js:175-191 + the amountInv column at :408). Mobile's headline
                    is the netted group, which never appears on web, so the documents
                    are listed underneath whenever a note exists. */}
                {item.invDocs.length > 1 && (
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 4 }}>
                    {item.invDocs.map((d, i) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="caption" tone="faint" numberOfLines={1}>
                          #{d.saleInvoice}{d.dateInv ? ` · ${d.dateInv}` : ''}
                        </Text>
                        <Text variant="caption" tone={d.amountInv < 0 ? 'negative' : 'muted'}>
                          {symS}{fmtMoney(d.amountInv)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {item.lines.length > 0 && (
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 6 }}>
                    {item.lines.map((l, i) => (
                      <Pressable
                        key={i}
                        onPress={() => {
                          if (l.expType === 'Purchase') return;
                          setDraft({ expInvoice: String(l.expInvoice ?? ''), amountExp: String(l.amountExp ?? '') });
                          setEditLine(l);
                        }}
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text variant="caption" numberOfLines={1}>{l.supplierName}</Text>
                          <Text variant="caption" tone="faint" numberOfLines={1}>
                            {[l.expType, l.expInvoice, l.dateExp].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <Text variant="caption" tone="negative">−{curSymbol(l.curEX)}{fmtMoney(l.amountExp)}</Text>
                        {l.expType !== 'Purchase' && (
                          <Ionicons name="create-outline" size={13} color={colors.textFaint} style={{ marginLeft: 6 }} />
                        )}
                      </Pressable>
                    ))}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text variant="caption" tone="muted">Costs</Text>
                      <Text variant="caption" tone="negative">{symS}{fmtMoney(costs)}</Text>
                    </View>
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}

      {/* Inline edit — web's edit mode, restricted to non-Purchase rows. */}
      <Modal visible={!!editLine} transparent animationType="slide" onRequestClose={() => setEditLine(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setEditLine(null)} />
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
          <Text variant="h2">Edit expense</Text>
          <Text variant="caption" tone="muted">{editLine?.supplierName}</Text>
          <TextField label="Expense invoice #" value={draft.expInvoice} onChangeText={(t) => setDraft((d) => ({ ...d, expInvoice: t }))} />
          <TextField label="Amount" value={draft.amountExp} keyboardType="decimal-pad" onChangeText={(t) => setDraft((d) => ({ ...d, amountExp: t.replace(/[^0-9.-]/g, '') }))} />
          <Button
            title="Save"
            loading={editExpense.isPending}
            onPress={async () => {
              if (!editLine) return;
              try {
                if (draft.expInvoice !== String(editLine.expInvoice ?? ''))
                  await editExpense.mutateAsync({ line: editLine, field: 'expInvoice', value: draft.expInvoice });
                if (draft.amountExp !== String(editLine.amountExp ?? ''))
                  await editExpense.mutateAsync({ line: editLine, field: 'amountExp', value: draft.amountExp });
                setEditLine(null);
              } catch (e: any) {
                Alert.alert('Save failed', e?.message || 'Could not save.');
              }
            }}
          />
          <Button title="Cancel" variant="secondary" onPress={() => setEditLine(null)} />
        </View>
      </Modal>
    </Screen>
  );
}
