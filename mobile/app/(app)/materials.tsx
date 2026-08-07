import { useState } from 'react';
import { View, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useMaterials, cleanElement, cleanKgs } from '@/features/materials/useMaterials';
import { DEFAULT_ELEMENTS, UNIT_LABELS } from '@/features/materials/constants';
// The footer filter, the weighted averages, the cost maths and the cross-table
// total all live in ./tableMath so they can be diffed against web in
// __tests__/parity/margins-materials-formulas.test.ts. Each carries its web citation.
import {
  fmtCell as fmt,
  fmtWeight,
  fmtAvg,
  money,
  footerRows,
  totalWeight,
  weightedAvg,
  hasPrices as hasPricesOf,
  niMultiplier,
  costPmt as costPmtOf,
  costTotal as costTotalOf,
  footerCostPmt,
  footerCostTotal,
  grandTotals,
} from '@/features/materials/tableMath';

const COL = 56; // element column width
const COST_COL = 76;

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
          <GrandTotals tables={data} />
          {data.map((table: any, ti: number) => {
            const elements = (table.elements && table.elements.length ? table.elements : DEFAULT_ELEMENTS) as { key: string; label: string }[];
            const unitKey = table.unit || 'kgs';
            const unit = UNIT_LABELS[unitKey] || 'Kgs';
            const allRows = table.data || [];

            // Web's footer excludes a row whose material is blank AND whose every
            // element is empty or zero (newTable.js:200-209). Mobile summed those
            // placeholder rows, so a blank row carrying a weight shifted both the
            // total and every weighted average — and inflated the item count.
            const rows = footerRows(allRows, elements);
            const totalKgs = totalWeight(rows);
            const weighted = (key: string) => weightedAvg(rows, key, totalKgs);

            // Cost columns — shown only when the table has prices AND cost display is
            // on, exactly as web gates them (newTable.js:93-102). An Fe-only price does
            // NOT count, a price of "0" does, and the Ni price is scaled by the table's
            // payable percentage (which falls back to 100% when blank).
            const prices = table.prices || {};
            const niMult = niMultiplier(table.niPercent);
            const showCosts = !!table.showCosts && hasPricesOf(elements, prices);
            const costPmt = (r: any) => costPmtOf(r, elements, prices, niMult);
            const costTotal = (r: any) => costTotalOf(r, elements, prices, niMult, unitKey);
            const footCostPmt = footerCostPmt(rows, elements, prices, niMult, totalKgs);
            const footCostTotal = footerCostTotal(rows, elements, prices, niMult, unitKey);

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
                      {showCosts && (
                        <>
                          <Text variant="caption" tone="muted" style={{ width: COST_COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>Cost PMT</Text>
                          <Text variant="caption" tone="muted" style={{ width: COST_COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>Cost Total</Text>
                        </>
                      )}
                    </View>
                    {/* Rows */}
                    {/* The body shows every stored row — web only applies the
                        blank-row filter to its footer. */}
                    {allRows.map((r: any, ri: number) => (
                      <View key={r.id || ri} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        {editing ? (
                          <Cell w={130} value={r.material} onChange={(t) => setCell(table.id, r.id, 'material', t)} align="left" />
                        ) : (
                          <Text variant="caption" style={{ width: 130 }} numberOfLines={1}>{r.material || '—'}</Text>
                        )}
                        {editing ? (
                          <Cell w={COL} value={r.kgs} onChange={(t) => setCell(table.id, r.id, 'kgs', cleanKgs(t))} numeric />
                        ) : (
                          <Text variant="caption" style={{ width: COL, textAlign: 'right' }}>{fmtWeight(r.kgs, unitKey)}</Text>
                        )}
                        {elements.map((el) => editing ? (
                          <Cell key={el.key} w={COL} value={r[el.key]} numeric onChange={(t) => { const v = cleanElement(t); if (v !== null) setCell(table.id, r.id, el.key, v); }} />
                        ) : (
                          <Text key={el.key} variant="caption" style={{ width: COL, textAlign: 'right' }}>{fmt(r[el.key])}</Text>
                        ))}
                        {showCosts && (
                          <>
                            {/* Web renders an empty cell for a zero cost, not '$0.00'. */}
                            <Text variant="caption" tone="primary" style={{ width: COST_COL, textAlign: 'right' }}>
                              {costPmt(r) ? money(costPmt(r)) : ''}
                            </Text>
                            <Text variant="caption" tone="primary" style={{ width: COST_COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>
                              {costTotal(r) ? money(costTotal(r)) : ''}
                            </Text>
                          </>
                        )}
                        {editing && (
                          <Pressable onPress={() => removeRow(table.id, r.id)} hitSlop={8} style={{ paddingLeft: 8, justifyContent: 'center' }}>
                            <Ionicons name="close-circle-outline" size={16} color={colors.negative} />
                          </Pressable>
                        )}
                      </View>
                    ))}
                    {/* Weighted-average totals */}
                    {allRows.length > 0 && (
                      <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
                        <Text variant="caption" tone="primary" style={{ width: 130, fontFamily: 'Inter_600SemiBold' }}>{rows.length} items</Text>
                        <Text variant="caption" tone="primary" style={{ width: COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>{fmtWeight(totalKgs, unitKey)}</Text>
                        {elements.map((el) => (
                          <Text key={el.key} variant="caption" tone="primary" style={{ width: COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>
                            {/* Web leaves the cell EMPTY when the average is zero, so
                                an element with no data doesn't read as a measured 0. */}
                            {fmtAvg(weighted(el.key))}
                          </Text>
                        ))}
                        {showCosts && (
                          <>
                            <Text variant="caption" tone="primary" style={{ width: COST_COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>
                              {totalKgs === 0 ? '' : money(footCostPmt)}
                            </Text>
                            <Text variant="caption" tone="primary" style={{ width: COST_COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>
                              {money(footCostTotal)}
                            </Text>
                          </>
                        )}
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

// Portfolio composition across every table — web's bottom "Total" row
// (page.js:321-340), which mobile had no equivalent of.
//
// Two quirks are deliberate, because they are web's: the per-element figure is the
// UNWEIGHTED mean of each table's own weighted average (not a weight-weighted mean
// across tables), and only the nine DEFAULT_ELEMENTS appear — a custom element added
// to one table is never rolled up. The whole row is hidden if any value is NaN.
function GrandTotals({ tables }: { tables: any[] }) {
  const { colors } = useTheme();
  const result = grandTotals(tables);
  if (!result) return null;

  return (
    <Card padded={false}>
      <View style={{ padding: 14, paddingBottom: 8 }}>
        <Text variant="h3">Total</Text>
        <Text variant="caption" tone="faint">Across all {tables.length} table{tables.length === 1 ? '' : 's'}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}>
        <View>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderStrong, paddingBottom: 6 }}>
            <Text variant="caption" tone="muted" style={{ width: COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>Kgs</Text>
            {DEFAULT_ELEMENTS.map((el) => (
              <Text key={el.key} variant="caption" tone="muted" style={{ width: COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>{el.label}</Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
            <Text variant="caption" tone="primary" style={{ width: COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>{fmt(result.kgs)}</Text>
            {DEFAULT_ELEMENTS.map((el) => (
              <Text key={el.key} variant="caption" tone="primary" style={{ width: COL, textAlign: 'right', fontFamily: 'Inter_600SemiBold' }}>{fmt(result[el.key])}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </Card>
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
