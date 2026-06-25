import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, Badge, SegmentedControl, SectionHeader } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { apiConfigured } from '@/lib/api';
import { fmtAutoKM, fmtCurKM } from '@/lib/format';
import { useCashForecast } from './useCashForecast';

const curLine = (byCur: Record<string, number>) => {
  const ents = Object.entries(byCur || {}).filter(([, v]) => Math.abs(v) > 0.005);
  return ents.length ? ents.map(([c, v]) => fmtCurKM(c, v)).join('  ') : '$0';
};

const tone = (c?: string) => (c === 'high' ? 'positive' : c === 'low' ? 'negative' : 'warn') as 'positive' | 'negative' | 'warn';

// AI cash-flow forecast panel for the Cashflow screen.
export function ForecastCard() {
  const { colors } = useTheme();
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);
  const { data, isLoading, isError, error } = useCashForecast(horizon, true);

  if (!apiConfigured()) return null;

  const net = data?.baseTotals?.net;

  return (
    <Card>
      <SectionHeader
        title="AI Cash Forecast"
        subtitle="Projected inflow vs outflow"
        right={<Ionicons name="sparkles" size={18} color={colors.primary} />}
      />
      <View style={{ marginBottom: 12 }}>
        <SegmentedControl
          value={String(horizon) as any}
          onChange={(v) => setHorizon(Number(v) as 30 | 60 | 90)}
          options={[
            { value: '30', label: '30 days' },
            { value: '60', label: '60 days' },
            { value: '90', label: '90 days' },
          ]}
        />
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>
      ) : isError ? (
        <Text variant="caption" tone="negative">{(error as Error)?.message || 'Forecast unavailable.'}</Text>
      ) : data ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: colors.positive + '14', borderRadius: 12, padding: 10 }}>
              <Text variant="caption" tone="muted">Inflow</Text>
              <Text variant="h3" tone="positive">{curLine(data.inflow)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.negative + '14', borderRadius: 12, padding: 10 }}>
              <Text variant="caption" tone="muted">Outflow</Text>
              <Text variant="h3" tone="negative">{curLine(data.outflow)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label" tone="muted">Net (USD basis)</Text>
            <Text variant="h2" tone={net != null && net < 0 ? 'negative' : 'positive'}>
              {net != null ? fmtAutoKM(net) : curLine(data.net)}
            </Text>
          </View>

          {data.confidence && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="caption" tone="muted">Confidence</Text>
              <Badge label={data.confidence} tone={tone(data.confidence)} />
            </View>
          )}

          {(data.assumptions?.length || 0) > 0 && (
            <View style={{ gap: 4 }}>
              <Text variant="label" tone="muted">Assumptions</Text>
              {data.assumptions!.map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
                  <Text variant="caption" tone="faint">•</Text>
                  <Text variant="caption" tone="muted" style={{ flex: 1 }}>{a}</Text>
                </View>
              ))}
            </View>
          )}
          {(data.risks?.length || 0) > 0 && (
            <View style={{ gap: 4 }}>
              <Text variant="label" tone="warn">Risks</Text>
              {data.risks!.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
                  <Ionicons name="alert-circle" size={13} color={colors.warn} style={{ marginTop: 2 }} />
                  <Text variant="caption" tone="muted" style={{ flex: 1 }}>{r}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </Card>
  );
}
