import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, SegmentedControl, ProgressBar, SectionHeader, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useAnalysis } from '@/features/analysis/useAnalysis';
import { fmtMoney } from '@/lib/format';

const mt = (n: number) => `${fmtMoney(n, 1)} MT`;

export default function Analysis() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { byMaterial, byClient, isLoading, isError, error, refetch } = useAnalysis();
  const [tab, setTab] = useState<'material' | 'client'>('material');

  const rows = tab === 'material' ? byMaterial : byClient;
  const total = rows.reduce((s, r) => s + r.weight, 0);
  const max = Math.max(...rows.map((r) => r.weight), 1);

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false} refreshing={isLoading} onRefresh={refetch}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Analysis</Text>
        <PeriodSelector />
      </View>

      <View style={{ marginBottom: 14 }}>
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as any)}
          options={[{ value: 'material', label: 'By Material' }, { value: 'client', label: 'By Client' }]}
        />
      </View>

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No data" message="No shipped invoices in the selected period." icon={<Ionicons name="bar-chart-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <Card>
          <SectionHeader title={tab === 'material' ? 'Shipped weight by material' : 'Shipped weight by client'} subtitle={`Total ${mt(total)}`} />
          <View style={{ gap: 10 }}>
            {rows.map((r, i) => (
              <View key={r.name + i} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" numberOfLines={1} style={{ flex: 1, paddingRight: 10 }}>{r.name}</Text>
                  <Text variant="caption" tone="muted">{mt(r.weight)}</Text>
                </View>
                <ProgressBar pct={(r.weight / max) * 100} color={colors.primary} height={10} />
              </View>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}
