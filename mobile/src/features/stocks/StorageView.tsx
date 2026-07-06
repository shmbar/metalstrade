import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Modal, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Text, Select, DateField, Button, SegmentedControl, LoadingState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useStorage, useTagStorage, suggestWh, defaultMonth } from './useStorage';
import { UNIT } from '@shared/storageUtils';
import { fmtMoney, dateLabel } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';

const fmtUsd = (v: number) => `$${fmtMoney(v || 0)}`;
const fmtMt = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v || 0);
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthLabel = (ym: string) => {
  if (!ym) return 'Pick month';
  const [y, m] = ym.split('-').map(Number);
  return m ? `${MONTHS_FULL[m - 1]} ${y}` : ym;
};

export function StorageView() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { derived, isLoading, isError, error, refetch } = useStorage();
  const tag = useTagStorage();
  const [unit, setUnit] = useState<'week' | 'month' | 'year'>('month');

  const warehouses = settings?.Stocks?.Stocks || [];
  const whOptions = useMemo(
    () => warehouses.map((w: any) => ({ value: w.id, label: w.stock || w.nname || '' })).filter((o: any) => o.label),
    [warehouses]
  );

  const [tagging, setTagging] = useState<any | null>(null);
  const [tagWh, setTagWh] = useState('');
  const [tagMonth, setTagMonth] = useState(''); // YYYY-MM

  if (isLoading) return <LoadingState label="Loading storage costs…" />;
  if (isError) return <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />;
  if (!derived) return null;

  const { metric, actuals, untagged } = derived;
  const unitMeta = UNIT.find((u) => u.key === unit)!;
  const rateStr = (monthly: number | null) => (monthly == null ? '—' : `${fmtUsd(monthly * unitMeta.factor)}/MT`);

  const openTag = (e: any) => {
    setTagging(e);
    setTagWh(e.storageWh || suggestWh(e, untagged));
    setTagMonth(defaultMonth(e));
  };

  const saveTag = async () => {
    if (!tagWh || !tagMonth) {
      Alert.alert('Incomplete', 'Pick a warehouse and a month.');
      return;
    }
    try {
      await tag.mutateAsync({ expense: tagging, storageWh: tagWh, storageMonth: tagMonth });
      setTagging(null);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Failed to tag invoice.');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* Unit toggle */}
      <View style={{ marginBottom: 12 }}>
        <SegmentedControl
          value={unit}
          onChange={(v) => setUnit(v as any)}
          options={UNIT.map((u) => ({ value: u.key as any, label: u.label.replace('per ', '') }))}
        />
      </View>

      {/* Overall rate hero */}
      <Card style={{ marginBottom: 12, backgroundColor: colors.primary }}>
        <Text variant="label" color="#ffffffcc">
          Avg storage cost {unitMeta.label}
        </Text>
        <Text variant="display" color="#fff" style={{ marginTop: 4 }}>
          {rateStr(metric.overall)}
        </Text>
        <Text variant="caption" color="#ffffffaa" style={{ marginTop: 2 }}>
          {fmtUsd(metric.totalCost)} tagged · {fmtMt(metric.totalMt)} MT-months
        </Text>
      </Card>

      {/* Actuals */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text variant="label" tone="muted">Storage spend</Text>
          <Text variant="h2" style={{ marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>
            {fmtUsd(actuals.totalSpend)}
          </Text>
          <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
            {actuals.count} inv · {actuals.count - actuals.taggedCount} to tag
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="label" tone="muted">In storage now</Text>
          <Text variant="h2" style={{ marginTop: 6 }} adjustsFontSizeToFit numberOfLines={1}>
            {fmtMt(actuals.totalMt)} MT
          </Text>
          <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
            {actuals.whMt.length} warehouse{actuals.whMt.length === 1 ? '' : 's'}
          </Text>
        </Card>
      </View>

      {/* Per-warehouse rates */}
      {metric.rows.length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>
            By warehouse ({unitMeta.label})
          </Text>
          {metric.rows.map((r, i) => (
            <View
              key={r.wh}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 8,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" numberOfLines={1}>{r.name}</Text>
                <Text variant="caption" tone="faint">
                  {fmtUsd(r.cost)} · {fmtMt(r.mt)} MT-months
                </Text>
              </View>
              <Text variant="h3" tone="primary">{rateStr(r.rate)}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Untagged triage */}
      <Card>
        <Text variant="label" tone="muted" style={{ marginBottom: 4 }}>
          To tag ({untagged.length})
        </Text>
        {untagged.length === 0 ? (
          <Text variant="body" tone="muted" style={{ paddingVertical: 8 }}>
            All storage invoices are tagged. 🎉
          </Text>
        ) : (
          untagged.map((e: any, i: number) => (
            <Pressable
              key={e.id}
              onPress={() => openTag(e)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 11,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {settings?.Supplier?.Supplier?.find((s: any) => s.id === e.supplier)?.nname || 'Expense'}
                </Text>
                <Text variant="caption" tone="faint">
                  {dateLabel(e.date)} · {fmtUsd(parseFloat(e.amount) || 0)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text variant="caption" tone="primary">Tag</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            </Pressable>
          ))
        )}
      </Card>

      {/* Tag modal */}
      <Modal visible={!!tagging} transparent animationType="slide" onRequestClose={() => setTagging(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setTagging(null)} />
        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            gap: spacing.lg,
          }}
        >
          <Text variant="h2">Tag storage invoice</Text>
          <Select label="Warehouse" value={tagWh} options={whOptions} onChange={setTagWh} required />
          <DateField
            label={`Month — ${monthLabel(tagMonth)}`}
            value={tagMonth ? `${tagMonth}-01` : null}
            onChange={(iso) => setTagMonth(iso.slice(0, 7))}
          />
          <Button title="Save tag" loading={tag.isPending} onPress={saveTag} />
        </View>
      </Modal>
    </ScrollView>
  );
}
