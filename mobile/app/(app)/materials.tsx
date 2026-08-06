import { useState } from 'react';
import { View, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useMaterials, cleanElement, cleanKgs } from '@/features/materials/useMaterials';
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
  const {
    tables: data, dirty, addTable, addRow, removeRow, setCell, save, removeTable,
    isLoading, isError, error, refetch,
  } = useMaterials();
  const [editing, setEditing] = useState(false);

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
        <Pressable onPress={() => setEditing((e) => !e)} hitSlop={8}>
          <Text variant="bodyMedium" tone="primary">{editing ? 'Done' : 'Edit'}</Text>
        </Pressable>
      </View>

      {editing && (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <Button title="Add table" variant="secondary" onPress={addTable} style={{ flex: 1 }} />
          <Button title={dirty ? 'Save changes' : 'Saved'} disabled={!dirty} loading={save.isPending} onPress={() => save.mutate()} style={{ flex: 1 }} />
        </View>
      )}

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
                        {editing ? (
                          <Cell w={130} value={r.material} onChange={(t) => setCell(table.id, r.id, 'material', t)} align="left" />
                        ) : (
                          <Text variant="caption" style={{ width: 130 }} numberOfLines={1}>{r.material || '—'}</Text>
                        )}
                        {editing ? (
                          <Cell w={COL} value={r.kgs} onChange={(t) => setCell(table.id, r.id, 'kgs', cleanKgs(t))} numeric />
                        ) : (
                          <Text variant="caption" style={{ width: COL, textAlign: 'right' }}>{fmt(r.kgs)}</Text>
                        )}
                        {elements.map((el) => editing ? (
                          <Cell key={el.key} w={COL} value={r[el.key]} numeric onChange={(t) => { const v = cleanElement(t); if (v !== null) setCell(table.id, r.id, el.key, v); }} />
                        ) : (
                          <Text key={el.key} variant="caption" style={{ width: COL, textAlign: 'right' }}>{fmt(r[el.key])}</Text>
                        ))}
                        {editing && (
                          <Pressable onPress={() => removeRow(table.id, r.id)} hitSlop={8} style={{ paddingLeft: 8, justifyContent: 'center' }}>
                            <Ionicons name="close-circle-outline" size={16} color={colors.negative} />
                          </Pressable>
                        )}
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
                {editing && (
                  <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingBottom: 14 }}>
                    <Pressable onPress={() => addRow(table.id)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                      <Text variant="caption" tone="primary">Add row</Text>
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    <Pressable
                      onPress={() => Alert.alert('Delete table?', table.name || 'This table', [ { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeTable.mutate(table.id) } ])}
                      hitSlop={8}
                    >
                      <Text variant="caption" style={{ color: colors.negative }}>Delete table</Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

// Inline editable cell — raw text while focused, matching web's edit behaviour.
function Cell({
  w, value, onChange, numeric, align = 'right',
}: {
  w: number;
  value: any;
  onChange: (t: string) => void;
  numeric?: boolean;
  align?: 'left' | 'right';
}) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value == null ? '' : String(value)}
      onChangeText={onChange}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      style={{
        width: w,
        textAlign: align,
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: colors.text,
        paddingVertical: 2,
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        backgroundColor: colors.surfaceAlt,
      }}
    />
  );
}
