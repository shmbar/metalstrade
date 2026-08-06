import { useMemo, useState } from 'react';
import { View, Pressable, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, SegmentedControl, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { saveStockIn, newId } from '@/data/writes';
import { buildAudit, buildWriteOffRows, leftoverKey, LeftoverGroup } from '@/features/stocks/audit';
import { useAllStockLots, STOCK_LOTS_KEY } from '@/features/stocks/useAllStockLots';
import { curSymbol, fmtMoney } from '@/lib/format';
import { hapticSuccess } from '@/lib/haptics';

const fmtQ = (v: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v || 0);
type Tab = 'left' | 'dupes' | 'over' | 'orphan' | 'zeroIn';

export default function StockAudit() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uidCollection } = useAuth();
  const { settings } = useSettings();
  const qc = useQueryClient();
  // Web opens on Leftovers — it's the only actionable tab.
  const [tab, setTab] = useState<Tab>('left');
  const [sel, setSel] = useState<string[]>([]);

  const { data: raw, isLoading, isError, error, refetch } = useAllStockLots();

  const audit = useMemo(() => buildAudit(raw || [], settings), [raw, settings]);
  const counts = {
    left: audit.left.length, dupes: audit.dupes.length, over: audit.over.length,
    orphan: audit.orphan.length, zeroIn: audit.zeroIn.length,
  };

  const selGroups = useMemo(
    () => audit.left.filter((g) => sel.includes(leftoverKey(g))),
    [audit.left, sel]
  );

  const writeOff = useMutation({
    mutationFn: async (groups: LeftoverGroup[]) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await saveStockIn(uidCollection, buildWriteOffRows(groups, newId));
    },
    onSuccess: () => {
      hapticSuccess();
      setSel([]);
      qc.invalidateQueries({ queryKey: [STOCK_LOTS_KEY] });
    },
    onError: (e: any) => Alert.alert('Write-off failed', e?.message || 'Could not write off leftovers.'),
  });

  // Two-step confirm, matching the web "armed" button.
  const confirmWriteOff = () => {
    if (!selGroups.length || writeOff.isPending) return;
    const n = selGroups.length;
    Alert.alert(
      `Write off ${n} leftover${n > 1 ? 's' : ''}?`,
      'Records one OUT movement per selection for the remaining quantity, dated today. History stays intact — deleting the OUT row restores the balance.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Write off', style: 'destructive', onPress: () => writeOff.mutate(selGroups) },
      ]
    );
  };

  const toggleSel = (k: string) =>
    setSel((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const list: any[] = audit[tab];

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2" style={{ flex: 1 }}>Stock Audit</Text>
      </View>
      <Text variant="caption" tone="muted" style={{ marginBottom: 12 }}>
        Scanned {audit.total} records. <Text variant="caption" tone="primary">Leftovers</Text> lists every remaining
        balance and lets you write off the ones that are not factual; the other tabs are read-only reports.
      </Text>

      <View style={{ marginBottom: 12 }}>
        <SegmentedControl
          value={tab}
          onChange={(v) => { setTab(v as Tab); setSel([]); }}
          options={[
            { value: 'left', label: `Left (${counts.left})` },
            { value: 'dupes', label: `Dupes (${counts.dupes})` },
            { value: 'over', label: `Over (${counts.over})` },
            { value: 'orphan', label: `Orphan (${counts.orphan})` },
            { value: 'zeroIn', label: `Zero (${counts.zeroIn})` },
          ]}
        />
      </View>

      {tab === 'left' && sel.length > 0 && (
        <Button
          title={`Write off ${sel.length} selected`}
          variant="primary"
          loading={writeOff.isPending}
          onPress={confirmWriteOff}
          style={{ marginBottom: 12 }}
        />
      )}

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          title={tab === 'left' ? 'No leftovers' : 'All clear'}
          message={tab === 'left' ? 'Every group nets to zero.' : 'No issues in this category.'}
          icon={<Ionicons name="checkmark-done-outline" size={40} color={colors.positive} />}
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(r, i) => r.id || `${r.stockId}|${r.descId}` || String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item: r }) => {
            const k = tab === 'left' ? leftoverKey(r) : '';
            const isSel = tab === 'left' && sel.includes(k);
            return (
              <Card
                style={{
                  marginBottom: 10,
                  borderColor: isSel ? colors.primary : undefined,
                  borderWidth: isSel ? 1.5 : undefined,
                }}
                onPress={tab === 'left' ? () => toggleSel(k) : undefined}
              >
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {tab === 'left' && (
                    <Ionicons
                      name={isSel ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSel ? colors.primary : colors.textFaint}
                      style={{ marginTop: 1 }}
                    />
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="bodyMedium" numberOfLines={2}>{r.descNm || r.names || '(no name)'}</Text>
                    <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{r.stockNm}</Text>

                    {tab === 'left' && (
                      <Row1
                        label={`Net ${fmtQ(r.net)} · ${curSymbol(r.rep?.cur)}${fmtMoney(r.value)}`}
                        sub={`IN ${fmtQ(r.inQty)} − OUT ${fmtQ(r.outQty)}${
                          r.rep?.supplierNm ? ` · ${r.rep.supplierNm}` : ''
                        }${r.rep?.order ? ` · ${r.rep.order}` : ''}${
                          r.lastDate ? ` · ${String(r.lastDate).substring(0, 10)}` : ''
                        }`}
                      />
                    )}
                    {tab === 'dupes' && (
                      <Row1
                        label={`Qty ${fmtQ(r.qnty)} · ${curSymbol(r.cur)}${fmtMoney(r.unitPrc)}`}
                        sub={`${r.invoice ? `Inv ${r.invoice} · ` : ''}${(r.date || '').substring(0, 10)} · #${(r.id || '').slice(0, 8)}`}
                      />
                    )}
                    {tab === 'over' && (
                      <Row1
                        label={`IN ${fmtQ(r.inQty)} · OUT ${fmtQ(r.outQty)}`}
                        sub={`Over by ${fmtQ(r.outQty - r.inQty)} · ${r.inRows} in / ${r.outRows} out`}
                        danger
                      />
                    )}
                    {tab === 'orphan' && (
                      <Row1
                        label={`OUT ${fmtQ(r.outQty)} with no IN`}
                        sub={`${r.outRows} out row(s) · #${(r.descId || '').slice(0, 8)}`}
                        danger
                      />
                    )}
                    {tab === 'zeroIn' && (
                      <Row1
                        label={`Zero qty, price ${curSymbol(r.cur)}${fmtMoney(r.unitPrc)}`}
                        sub={`${[r.supplier, r.order, (r.date || '').substring(0, 10)].filter(Boolean).join(' · ')} · #${(r.id || '').slice(0, 8)}`}
                        danger
                      />
                    )}
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

function Row1({ label, sub, danger }: { label: string; sub: string; danger?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 8 }}>
      <Text variant="bodyMedium" style={{ color: danger ? colors.negative : colors.text }}>{label}</Text>
      <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>{sub}</Text>
    </View>
  );
}
