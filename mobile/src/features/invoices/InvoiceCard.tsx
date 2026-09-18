import React from 'react';
import { View } from 'react-native';
import { Card, Text, Badge, Avatar } from '@/components/ui';
import { InvoiceView } from './useInvoices';
import { layout } from '@/theme/tokens';

const STATUS_TONE = { Paid: 'positive', Partial: 'warn', Unpaid: 'negative' } as const;

export function InvoiceCard({ inv, onPress }: { inv: InvoiceView; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ marginBottom: layout.stack }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        {/* Client avatar — the same entity chip web puts on every client name,
            so a list of invoices scans by who owes, not only by number. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1, minWidth: 0 }}>
          <Avatar name={inv.clientName} size={layout.leading} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="h3" numberOfLines={1}>
              Invoice #{inv.number ?? '—'}
            </Text>
            {/* Client, date and provisional/final on one line instead of a second row. */}
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
              {[inv.clientName, inv.dateIso, inv.finalized ? 'Finalized' : 'Provisional'].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text variant="figure">{inv.totalLabel}</Text>
          {inv.balance > 0.01 ? (
            <Text variant="caption" tone="negative" style={{ fontVariant: ['tabular-nums'] }}>
              {inv.balanceLabel} due
            </Text>
          ) : (
            <Text variant="caption" tone="positive">
              Paid
            </Text>
          )}
          <Badge label={inv.status} tone={STATUS_TONE[inv.status]} />
        </View>
      </View>
    </Card>
  );
}
