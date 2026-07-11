import { View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { loadMaterials } from '@/data/firestore';
import { DEFAULT_ELEMENTS, UNIT_LABELS } from '@/features/materials/constants';

const fmt = (v: any) => {
  if (v == null || v === '') return '';
  const n = Number(v);
  return isNaN(n) ? String(v) : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const COL = 56; // element column width

export default function Materials() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uidCollection } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    enabled: !!uidCollection,
    queryKey: ['materials', uidCollection],
    queryFn: () => loadMaterials(uidCollection as string),
  });

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false} refreshing={isLoading} onRefresh={refetch}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Material Tables</Text>
          <Text variant="caption" tone="faint">Element composition (Ni, Cr, Mo…)</Text>
        </View>
      </View>

      {isLoading ? (
        <SkeletonList count={5} />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load materials.'} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No material tables" icon={<Ionicons name="grid-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <View style={{ gap: 14 }}>
          {data.map((table: any, ti: number) => {
            const elements = (table.elements && table.elements.length ? table.elements : DEFAULT_ELEMENTS) as { key: string; label: string }[];
            const unit = UNIT_LABELS[table.unit] || 'Kgs';
            const rows = table.data || [];
            const totalKgs = rows.reduce((s: number, r: any) => s + (Number(r.kgs) || 0), 0);
            const weighted = (key: string) =>
              totalKgs > 0 ? rows.reduce((s: number, r: any) => s + (parseFloat(r[key]) || 0) * (Number(r.kgs) || 0), 0) / totalKgs : 0;

            return (
              <Card key={table.id || ti} padded={false}>
                <View style={{ padding: 14, paddingBottom: 8 }}>
                  <Text variant="h3">{table.name || table.nname || `Table ${ti + 1}`}</Text>
                  <Text variant="caption" tone="faint">
                    {rows.length} material{rows.length === 1 ? '' : 's'} · {unit}
                  </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                  <View>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderStrong, paddingBottom: 6 }}>
                      <Text variant="caption" tone="muted" style={{ width: 130, fontFamily: 'Inter_600SemiBold' }}>Material</Text>
                      <Text variant="caption" tone="muted" style={{ width: COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>{unit}</Text>
                      {elements.map((el) => (
                        <Text key={el.key} variant="caption" tone="muted" style={{ width: COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>{el.label}</Text>
                      ))}
                    </View>
                    {/* Rows */}
                    {rows.map((r: any, ri: number) => (
                      <View key={r.id || ri} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Text variant="caption" style={{ width: 130 }} numberOfLines={1}>{r.material || '—'}</Text>
                        <Text variant="caption" style={{ width: COL, textAlign: 'right' }}>{fmt(r.kgs)}</Text>
                        {elements.map((el) => (
                          <Text key={el.key} variant="caption" style={{ width: COL, textAlign: 'right' }}>{fmt(r[el.key])}</Text>
                        ))}
                      </View>
                    ))}
                    {/* Weighted-average totals */}
                    {rows.length > 0 && (
                      <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
                        <Text variant="caption" tone="primary" style={{ width: 130, fontFamily: 'Inter_600SemiBold' }}>Weighted avg</Text>
                        <Text variant="caption" tone="primary" style={{ width: COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>{fmt(totalKgs)}</Text>
                        {elements.map((el) => (
                          <Text key={el.key} variant="caption" tone="primary" style={{ width: COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>
                            {fmt(weighted(el.key))}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </ScrollView>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
