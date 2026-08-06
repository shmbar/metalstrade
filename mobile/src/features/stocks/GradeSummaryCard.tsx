import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { computeGradeSummary } from './gradeSummary';

const fmtQ = (v: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(v || 0);
const fmtM = (v: number, iso: string) =>
  `${iso === 'EUR' ? '€' : '$'}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v || 0)}`;

// "Avg Cost Price per Grade" — web parity (stocks/sumtables/gradeTable.js).
// Rows expand to the per-supplier split, exactly like the web table.
export function GradeSummaryCard({ dataTable, title = 'Avg cost price per grade' }: { dataTable: any[]; title?: string }) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => computeGradeSummary(dataTable, settings), [dataTable, settings]);
  if (!rows.length) return null;

  return (
    <Card style={{ marginBottom: 12 }}>
      <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>
        {title}
      </Text>
      {rows.map((r, i) => {
        const key = `${r.descriptionName}|${r.curId}`;
        const open = !!expanded[key];
        const canExpand = r.suppliers.length > 0;
        return (
          <View key={key}>
            <Pressable
              onPress={() => canExpand && setExpanded((p) => ({ ...p, [key]: !p[key] }))}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 8,
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
                <Text variant="caption" tone="faint">
                  {fmtQ(r.totalQnty)} MT · {fmtM(r.totalValue, r.isoCode)}
                </Text>
              </View>
              <Text variant="bodyMedium" tone="primary">
                {fmtM(r.avgPrice, r.isoCode)}/MT
              </Text>
            </Pressable>
            {open &&
              r.suppliers.map((s) => (
                <View
                  key={`${key}|${s.supplier}`}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                    paddingLeft: 22,
                  }}
                >
                  <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                    {s.supplier}
                  </Text>
                  <Text variant="caption" tone="faint">
                    {fmtQ(s.qnty)} MT · {fmtM(s.value, r.isoCode)}
                  </Text>
                </View>
              ))}
          </View>
        );
      })}
    </Card>
  );
}
