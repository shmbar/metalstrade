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
      {/* Status accent stripe */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: accent }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingLeft: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: accent + '1c', alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="label" color={accent} style={{ fontFamily: 'Poppins_700Bold' }}>{initials(v.supplierName)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="h3" numberOfLines={1}>{contract.order || 'Untitled PO'}</Text>
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>{v.supplierName}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="h3" tone="primary">{v.valueLabel}</Text>
          <Text variant="caption" tone="faint">{v.mtLabel}</Text>
        </View>
      </View>

      {v.productNames.length > 0 && (
        <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 8 }}>
          {v.productNames.join(' · ')}
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
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
    </Card>
  );
}
