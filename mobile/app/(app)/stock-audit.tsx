import { useMemo, useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, SegmentedControl, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadAllStockData } from '@/data/firestore';
import { buildAudit } from '@/features/stocks/audit';
import { curSymbol, fmtMoney } from '@/lib/format';

const fmtQ = (v: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v || 0);
type Tab = 'dupes' | 'over' | 'orphan' | 'zeroIn';

export default function StockAudit() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uidCollection } = useAuth();
  const { settings, loaded } = useSettings();
  const [tab, setTab] = useState<Tab>('dupes');

  const { data: raw, isLoading, isError, error, refetch } = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['stock-audit', uidCollection],
    queryFn: () => loadAllStockData(uidCollection as string),
  });

  const audit = useMemo(() => buildAudit(raw || [], settings), [raw, settings]);
  const counts = { dupes: audit.dupes.length, over: audit.over.length, orphan: audit.orphan.length, zeroIn: audit.zeroIn.length };

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
        Read-only report · scanned {audit.total} records. Use IDs / PO# / dates to fix entries in the contract or invoice.
      </Text>

      <View style={{ marginBottom: 12 }}>
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          options={[
            { value: 'dupes', label: `Dupes (${counts.dupes})` },
            { value: 'over', label: `Over (${counts.over})` },
            { value: 'orphan', label: `Orphan (${counts.orphan})` },
            { value: 'zeroIn', label: `Zero (${counts.zeroIn})` },
          ]}
        />
      </View>

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState title="All clear" message="No issues in this category." icon={<Ionicons name="checkmark-done-outline" size={40} color={colors.positive} />} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(r, i) => r.id || `${r.descId}-${i}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          renderItem={({ item: r }) => (
            <Card style={{ marginBottom: 10 }}>
              <Text variant="bodyMedium" numberOfLines={2}>{r.descNm || r.names || '(no name)'}</Text>
              <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{r.stockNm}</Text>
              {tab === 'dupes' && (
                <Row1 label={`Qty ${fmtQ(r.qnty)} · ${curSymbol(r.cur)}${fmtMoney(r.unitPrc)}`} sub={`${r.invoice ? `Inv ${r.invoice} · ` : ''}${(r.date || '').substring(0, 10)} · #${(r.id || '').slice(0, 8)}`} />
              )}
              {tab === 'over' && (
                <Row1 label={`IN ${fmtQ(r.inQty)} · OUT ${fmtQ(r.outQty)}`} sub={`Over by ${fmtQ(r.outQty - r.inQty)} · ${r.inRows} in / ${r.outRows} out`} danger />
              )}
              {tab === 'orphan' && (
                <Row1 label={`OUT ${fmtQ(r.outQty)} with no IN`} sub={`${r.outRows} out row(s) · #${(r.descId || '').slice(0, 8)}`} danger />
              )}
              {tab === 'zeroIn' && (
                <Row1 label={`Zero qty, price ${curSymbol(r.cur)}${fmtMoney(r.unitPrc)}`} sub={`${[r.supplier, r.order, (r.date || '').substring(0, 10)].filter(Boolean).join(' · ')} · #${(r.id || '').slice(0, 8)}`} danger />
              )}
            </Card>
          )}
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
