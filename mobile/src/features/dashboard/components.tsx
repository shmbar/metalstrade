import React from 'react';
import { View } from 'react-native';
import { Card, Text, SectionHeader, ProgressBar } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { fmtCurKM, fmtAutoKM, initials } from '@/lib/format';
import { ReceivablesSlot, AgingBucket } from '@shared/finance';

// Outstanding receivables split finalized vs provisional — per currency.
export function ReceivablesCard({ byCur }: { byCur: Record<string, ReceivablesSlot> }) {
  const { colors } = useTheme();
  const curs = Object.keys(byCur).filter((c) => {
    const d = byCur[c];
    return d.finalized + d.provisional > 0.005 || d.finalizedCount + d.provisionalCount > 0;
  });
  const finCount = curs.reduce((s, c) => s + byCur[c].finalizedCount, 0);
  const provCount = curs.reduce((s, c) => s + byCur[c].provisionalCount, 0);
  const total = finCount + provCount;
  const pctFinal = total > 0 ? (finCount / total) * 100 : 0;

  const amountsFor = (key: 'finalized' | 'provisional') => {
    const list = curs.filter((c) => byCur[c][key] > 0.005).map((c) => fmtCurKM(c, byCur[c][key]));
    return list.length ? list : ['$0.00'];
  };
  const totalsLine = curs.length
    ? curs.map((c) => fmtCurKM(c, byCur[c].finalized + byCur[c].provisional))
    : ['$0.00'];

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="label" tone="muted" style={{ flex: 1 }}>
          Outstanding Receivables
        </Text>
        <View style={{ alignItems: 'flex-end' }}>
          {totalsLine.map((t, i) => (
            <Text key={i} variant="h2">
              {t}
            </Text>
          ))}
        </View>
      </View>

      <View style={{ marginVertical: 12 }}>
        <ProgressBar pct={pctFinal} color={colors.positive} trackColor="#fde68a" />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: '#ecfdf522', borderRadius: radius.md, borderWidth: 1, borderColor: '#a7f3d055', padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.positive }} />
            <Text variant="caption" color={colors.positive} style={{ fontFamily: 'Poppins_600SemiBold' }}>
              FINALIZED
            </Text>
          </View>
          {amountsFor('finalized').map((a, i) => (
            <Text key={i} variant="h3" color={colors.positive} style={{ marginTop: 4 }}>
              {a}
            </Text>
          ))}
          <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
            {finCount} invoice{finCount === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={{ flex: 1, backgroundColor: '#fffbeb22', borderRadius: radius.md, borderWidth: 1, borderColor: '#fde68a55', padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warn }} />
            <Text variant="caption" color={colors.warn} style={{ fontFamily: 'Poppins_600SemiBold' }}>
              PROVISIONAL
            </Text>
          </View>
          {amountsFor('provisional').map((a, i) => (
            <Text key={i} variant="h3" color={colors.warn} style={{ marginTop: 4 }}>
              {a}
            </Text>
          ))}
          <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
            {provCount} invoice{provCount === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// Receivables aging buckets (0–30 / 31–60 / 61–90 / 90+), colored green→red.
export function AgingCard({ buckets }: { buckets: AgingBucket[] }) {
  const colorsArr = ['#16a34a', '#f59e0b', '#ea580c', '#dc2626'];
  const bTot = (b: AgingBucket) => Object.values(b.byCur || {}).reduce((s, v) => s + v, 0);
  const max = Math.max(...buckets.map(bTot), 1);
  const anyData = buckets.some((b) => b.count > 0);

  return (
    <Card>
      <SectionHeader title="Receivables Aging" subtitle="Outstanding by invoice age — older = more overdue" />
      {!anyData ? (
        <Text variant="body" tone="muted" style={{ textAlign: 'center', paddingVertical: 8 }}>
          No outstanding receivables
        </Text>
      ) : (
        buckets.map((b, i) => {
          const curs = Object.keys(b.byCur || {}).filter((c) => b.byCur[c] > 0.005);
          const tot = bTot(b);
          return (
            <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: 64 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorsArr[i] }} />
                <Text variant="caption">{b.label}d</Text>
              </View>
              <View style={{ flex: 1 }}>
                <ProgressBar pct={(tot / max) * 100} color={colorsArr[i]} height={14} />
              </View>
              <View style={{ width: 84, alignItems: 'flex-end' }}>
                {curs.length ? (
                  curs.map((c) => (
                    <Text key={c} variant="caption" style={{ fontFamily: 'Poppins_500Medium' }}>
                      {fmtCurKM(c, b.byCur[c])}
                    </Text>
                  ))
                ) : (
                  <Text variant="caption" tone="faint">
                    —
                  </Text>
                )}
                <Text variant="caption" tone="faint">
                  {b.count} inv
                </Text>
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}

// Top suppliers by purchase value — avatar + proportion bar ranking.
export function RankingCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: { name: string; value: number }[];
}) {
  const palette = ['#38BDF8', '#4F46E5', '#1477C0', '#7C6FE0', '#0A5EA8', '#6366F1'];
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <Card>
      <SectionHeader title={title} subtitle={subtitle} />
      {rows.length === 0 ? (
        <Text variant="body" tone="muted" style={{ textAlign: 'center', paddingVertical: 8 }}>
          No data for this period
        </Text>
      ) : (
        rows.map((r, i) => {
          const color = palette[i % palette.length];
          return (
            <View key={r.name + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: color,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="caption" color="#fff" style={{ fontFamily: 'Poppins_600SemiBold' }}>
                  {initials(r.name)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" numberOfLines={1} style={{ marginBottom: 3 }}>
                  {r.name}
                </Text>
                <ProgressBar pct={(r.value / max) * 100} color={color} height={12} />
              </View>
              <Text variant="caption" style={{ fontFamily: 'Poppins_600SemiBold', width: 64, textAlign: 'right' }}>
                {fmtAutoKM(r.value)}
              </Text>
            </View>
          );
        })
      )}
    </Card>
  );
}
