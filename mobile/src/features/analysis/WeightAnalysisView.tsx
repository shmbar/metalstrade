import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Card, Text, Select, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useWeightAnalysis } from './useWeightAnalysis';
import { WeightRow } from './weightAnalysis';

// Weight Analysis — contracted assay/weight vs returned ("Back") assay/weight per
// PO material line, with a per-PO Average row. Web's report is a 15-column grid
// with PO-merged rowspans; RN has no rowspan, so rows are grouped under a PO header.
export function WeightAnalysisView() {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const [supplier, setSupplier] = useState('');

  const supplierOptions = useMemo(
    () =>
      (settings?.Supplier?.Supplier || [])
        .filter((s: any) => !s.deleted)
        .map((s: any) => ({ value: s.id, label: s.nname || s.supplier || '—' }))
        .sort((a: any, b: any) => a.label.localeCompare(b.label)),
    [settings]
  );

  const { rows, isLoading, isError, error, refetch, enabled } = useWeightAnalysis(supplier);

  // Group by PO — the mobile stand-in for web's merged PO# cell.
  const groups = useMemo(() => {
    const m: Record<string, WeightRow[]> = {};
    rows.forEach((r) => {
      (m[r.order || '—'] ||= []).push(r);
    });
    return Object.entries(m);
  }, [rows]);

  return (
    <View style={{ flex: 1 }}>
      <Card style={{ marginBottom: 12 }}>
        {/* Supplier is REQUIRED — web loads nothing until one is chosen. */}
        <Select label="Supplier" value={supplier} options={supplierOptions} onChange={setSupplier} required />
      </Card>

      {!enabled ? (
        <EmptyState
          title="Pick a supplier"
          message="The weight analysis is scoped to one supplier at a time."
          icon={<Ionicons name="funnel-outline" size={40} color={colors.textFaint} />}
        />
      ) : isLoading ? (
        <SkeletonList count={5} />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No data" message="No contracted-vs-returned pairs for this supplier in the period." />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {groups.map(([order, list]) => (
            <Card key={order} padded={false} style={{ marginBottom: 12 }}>
              <View style={{ padding: 14, paddingBottom: 8 }}>
                <Text variant="h3">{order}</Text>
                <Text variant="caption" tone="faint">
                  {list.filter((r) => !r.isAverage).length} line(s)
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                <View>
                  {/* Header — web groups these under "Contracted" / "Back" bands. */}
                  <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderStrong, paddingBottom: 6 }}>
                    <H w={90}>Cert</H>
                    <H w={52}>Ni</H><H w={52}>Cr</H><H w={52}>Mo</H><H w={70}>Weight</H>
                    <H w={70}>IMS ref</H>
                    <H w={52}>Ni</H><H w={52}>Cr</H><H w={52}>Mo</H><H w={70}>Weight</H>
                    <H w={52}>ΔNi</H><H w={52}>ΔCr</H><H w={52}>ΔMo</H><H w={70}>ΔWeight</H>
                  </View>
                  {list.map((r, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: 'row',
                        paddingVertical: 6,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        backgroundColor: r.isAverage ? colors.surfaceAlt : undefined,
                      }}
                    >
                      <C w={90} strong={r.isAverage}>{r.cert}</C>
                      <C w={52}>{r.ToNi}</C><C w={52}>{r.ToCr}</C><C w={52}>{r.ToMo}</C><C w={70}>{r.Toqnty}</C>
                      <C w={70}>{r.invoice}</C>
                      <C w={52}>{r.BackNi}</C><C w={52}>{r.BackCr}</C><C w={52}>{r.BackMo}</C><C w={70}>{r.Backqnty}</C>
                      <C w={52} diff>{r.diffNi}</C><C w={52} diff>{r.diffCr}</C>
                      <C w={52} diff>{r.diffMo}</C><C w={70} diff>{r.diffqnty}</C>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function H({ w, children }: { w: number; children: React.ReactNode }) {
  return (
    <Text variant="caption" tone="muted" style={{ width: w, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
      {children}
    </Text>
  );
}

function C({ w, children, strong, diff }: { w: number; children: any; strong?: boolean; diff?: boolean }) {
  const { colors } = useTheme();
  const n = parseFloat(children);
  const color = diff && Number.isFinite(n) && n !== 0 ? (n < 0 ? colors.negative : colors.positive) : undefined;
  return (
    <Text
      variant="caption"
      numberOfLines={1}
      style={{
        width: w,
        ...(strong ? { fontFamily: 'Inter_600SemiBold' } : {}),
        ...(color ? { color } : {}),
      }}
    >
      {children === '' || children == null ? '—' : String(children)}
    </Text>
  );
}
