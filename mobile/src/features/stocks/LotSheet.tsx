import React, { useMemo, useState } from 'react';
import { View, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Select, TextField, Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { useSettings } from '@/store/settings';
import { useMoveStock } from './useMoveStock';
import { curSymbol, fmtMoney } from '@/lib/format';

const fmtQ = (n: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Number(n) || 0);

// Materials Breakdown sheet — the mobile twin of web's whModal, opened by tapping
// an inventory row. Web opens this on a double-click; mobile's rows had no tap
// target at all, so moving stock between warehouses was impossible on the phone.
export function LotSheet({ item, onClose }: { item: any | null; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const move = useMoveStock();

  const [qnty, setQnty] = useState('');
  const [toStock, setToStock] = useState('');

  const whOptions = useMemo(
    () =>
      (settings?.Stocks?.Stocks || [])
        .map((w: any) => ({ value: w.id, label: w.stock || w.nname || '' }))
        .filter((o: any) => o.label && o.value !== item?.stock),
    [settings, item]
  );

  if (!item) return null;

  const sym = curSymbol(item.cur);
  const contractId = item.data?.find((d: any) => d.contractData)?.contractData?.id;

  const doMove = async () => {
    try {
      await move.mutateAsync({ item, qnty: parseFloat(qnty), toStock });
      setQnty('');
      setToStock('');
      onClose();
    } catch (e: any) {
      Alert.alert('Could not move stock', e?.message || 'Failed.');
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.bgElevated,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          paddingBottom: insets.bottom + spacing.lg,
          maxHeight: '85%',
        }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <Text variant="h2" numberOfLines={2}>{item.descriptionName || '—'}</Text>

          {/* Read-only summary, matching web's top block. */}
          <View style={{ gap: 4 }}>
            <Row label="Weight" v={`${fmtQ(item.qnty)} ${item.qTypeLabel || 'MT'}`} />
            <Row label="Unit price" v={`${sym}${fmtMoney(item.unitPrc)}`} />
            <Row label="Total" v={item.total === '-' ? '—' : `${sym}${fmtMoney(item.total)}`} />
            <Row label="Warehouse" v={item.warehouseName || '—'} />
            {!!item.supplierName && <Row label="Supplier" v={item.supplierName} />}
            {!!item.order && <Row label="PO" v={item.order} />}
          </View>

          {/* Change Stock — moves part of the lot to another warehouse. */}
          <View
            style={{
              backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.border, padding: 12, gap: 10,
            }}
          >
            <Text variant="label" tone="muted">Move to another warehouse</Text>
            <TextField
              label={`Quantity (max ${fmtQ(item.qnty)})`}
              value={qnty}
              onChangeText={(t) => setQnty(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
            />
            <Select label="Target warehouse" value={toStock} options={whOptions} onChange={setToStock} required />
            <Button
              title="Move stock"
              loading={move.isPending}
              disabled={!qnty || !toStock}
              onPress={doMove}
            />
            <Text variant="caption" tone="faint">
              Recorded as an out + in pair, so the move is reversible and never counts as a sale.
            </Text>
          </View>

          {!!contractId && (
            <Button
              title="Open contract"
              variant="secondary"
              onPress={() => {
                onClose();
                router.push(`/(app)/contracts/${contractId}`);
              }}
            />
          )}
          <Button title="Close" variant="secondary" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text variant="body" tone="muted">{label}</Text>
      <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>{v}</Text>
    </View>
  );
}
