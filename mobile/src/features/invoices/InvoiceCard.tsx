import React from 'react';
import { View } from 'react-native';
import { Card, Text, Badge } from '@/components/ui';
import { InvoiceView } from './useInvoices';

const STATUS_TONE = { Paid: 'positive', Partial: 'warn', Unpaid: 'negative' } as const;

export function InvoiceCard({ inv, onPress }: { inv: InvoiceView; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="h3" numberOfLines={1}>
            Invoice #{inv.number ?? '—'}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
            {inv.clientName}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="h3">{inv.totalLabel}</Text>
          {inv.balance > 0.01 ? (
            <Text variant="caption" tone="negative">
              {inv.balanceLabel} due
            </Text>
          ) : (
            <Text variant="caption" tone="positive">
              Paid
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Badge label={inv.status} tone={STATUS_TONE[inv.status]} />
        <Badge label={inv.finalized ? 'Finalized' : 'Provisional'} tone={inv.finalized ? 'positive' : 'warn'} />
        <View style={{ flex: 1 }} />
        {inv.dateIso ? (
          <Text variant="caption" tone="faint">
            {inv.dateIso}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
