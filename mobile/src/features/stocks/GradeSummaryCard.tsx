import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { computeGradeSummary } from './gradeSummary';
import { layout } from '@/theme/tokens';
import { moneyFull } from '@/lib/format';

const fmtQ = (v: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(v || 0);
// Any currency other than EUR used to print "$" — the wrong symbol. Shared format now.
const fmtM = (v: number, iso: string) => moneyFull(iso, v);

// "Avg Cost Price per Grade" — web parity (stocks/sumtables/gradeTable.js).
// Rows are folded by the material's own name, biggest position first, and each opens
// onto the lots behind it: description + supplier. The separate grade list that used to
// override the name is retired on both apps (2026-10-02) — nothing reads it here.
export function GradeSummaryCard({ dataTable, title = 'Avg cost price per grade' }: { dataTable: any[]; title?: string }) {
  const { colors } = useTheme();
  const settings = useSettings((s) => s.settings);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => computeGradeSummary(dataTable, settings), [dataTable, settings]);
  if (!rows.length) return null;

  return (
    <Card style={{ marginBottom: layout.stack }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <Text variant="label" tone="muted">
          {title}
        </Text>
        <Text variant="caption" tone="faint">
          {rows.length} grade{rows.length === 1 ? '' : 's'}
        </Text>
      </View>
      {rows.map((r, i) => {
        const key = `${r.descriptionName}|${r.curId}`;
        const open = !!expanded[key];
        const canExpand = r.lots.length > 0;
        return (
          <View key={key}>
            <Pressable
              onPress={() => canExpand && setExpanded((p) => ({ ...p, [key]: !p[key] }))}
              accessibilityRole={canExpand ? 'button' : undefined}
              accessibilityState={{ expanded: open }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 9,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              {canExpand ? (
                <Ionicons
                  name={open ? 'chevron-down' : 'chevron-forward'}
                  size={14}
                  color={colors.textFaint}
                />
              ) : (
                <View style={{ width: 14 }} />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" numberOfLines={2}>{r.descriptionName}</Text>
                {/* The "· 3 spellings" count that trailed this line read as jargon
                    (client, 2026-10-02); the lots behind the row are one tap away. */}
                <Text variant="caption" tone="faint">
                  {fmtQ(r.totalQnty)} MT · {fmtM(r.totalValue, r.isoCode)}
                </Text>
              </View>
              <Text variant="bodyMedium" tone="primary" style={{ fontVariant: ['tabular-nums'] }}>
                {fmtM(r.avgPrice, r.isoCode)}/MT
              </Text>
            </Pressable>
            {open &&
              r.lots.map((l, li) => (
                <View
                  key={`${key}|${l.description}|${l.supplier}|${li}`}
                  style={{ paddingLeft: 22, paddingVertical: 4 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                      {l.description}
                    </Text>
                    <Text variant="caption" tone="faint" style={{ fontVariant: ['tabular-nums'] }}>
                      {fmtQ(l.qnty)} MT · {fmtM(l.value, r.isoCode)}
                    </Text>
                  </View>
                  <Text variant="caption" tone="faint" numberOfLines={1}>
                    {l.supplier}
                  </Text>
                </View>
              ))}
          </View>
        );
      })}
    </Card>
  );
}
