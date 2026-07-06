import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, Badge } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { Contract } from '@/data/types';
import { deriveContract } from './useContracts';
import { initials } from '@/lib/format';
import { radius } from '@/theme/tokens';

export function ContractCard({
  contract,
  settings,
  onPress,
}: {
  contract: Contract;
  settings: any;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const v = deriveContract(contract, settings);
  const accent = (contract as any).completed ? colors.positive : v.invoiceCount > 0 ? colors.info : colors.primary;

  return (
    <Card onPress={onPress} style={{ marginBottom: 12, overflow: 'hidden' }}>
      {/* Status accent — short rounded bar pinned to the left edge */}
      <View style={{ position: 'absolute', left: 0, top: 16, bottom: 16, width: 3.5, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: accent }} />

      {/* All content is padded clear of the accent so nothing hides under it */}
      <View style={{ paddingLeft: 10 }}>
        {/* Header: avatar + PO/supplier · value/tonnage */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1, minWidth: 0 }}>
            <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: accent + '1c', alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="label" color={accent} style={{ fontFamily: 'Inter_700Bold' }}>{initials(v.supplierName)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="h3" numberOfLines={1}>{contract.order || 'Untitled PO'}</Text>
              <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>{v.supplierName}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
            <Text variant="h3" tone="primary" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>{v.valueLabel}</Text>
            <Text variant="caption" tone="faint" style={{ marginTop: 1, fontVariant: ['tabular-nums'] }}>{v.mtLabel}</Text>
          </View>
        </View>

        {/* Materials */}
        {v.productNames.length > 0 && (
          <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 10 }}>
            {v.productNames.join(' · ')}
          </Text>
        )}

        {/* Footer: status · invoices · date */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          {v.status ? <Badge label={v.status} tone="info" /> : null}
          {v.invoiceCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="receipt-outline" size={13} color={colors.textFaint} />
              <Text variant="caption" tone="faint">
                {v.invoiceCount} invoice{v.invoiceCount === 1 ? '' : 's'}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {contract.date ? (
            <Text variant="caption" tone="faint">
              {contract.date.substring(0, 10)}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
