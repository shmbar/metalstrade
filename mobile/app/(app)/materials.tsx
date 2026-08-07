import { useState } from 'react';
import { View, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useMaterials, cleanElement, cleanKgs } from '@/features/materials/useMaterials';
import { DEFAULT_ELEMENTS, UNIT_LABELS, UNIT_TO_MT } from '@/features/materials/constants';

// Web blanks a cell it cannot parse (page.js:47-50); mobile echoed the raw text,
// so legacy junk in an element field showed up as text on one platform only.
const fmt = (v: any) => {
  if (v == null || v === '') return '';
  const n = parseFloat(v);
  return isNaN(n) ? '' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

// Weights follow the TABLE's unit: MT keeps 3 decimals, kgs/lbs round to whole
// units (newTable.js:212-215). Mobile forced 2 decimals on every unit, dropping
// the third decimal from MT tables and inventing '.00' on kgs ones.
const fmtWeight = (v: any, unit: string) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '';
  return unit === 'mt'
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n)
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));
};

const money = (n: number) =>
  '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

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
            const rows = allRows.filter((r: any) => {
              if (r.material && String(r.material).trim() !== '') return true;
              return elements.some((el) => {
                const v = parseFloat(r[el.key]);
                return !isNaN(v) && v !== 0;
              });
            });

            const totalKgs = rows.reduce((s: number, r: any) => s + (parseFloat(r.kgs) || 0), 0);
            const weighted = (key: string) =>
              totalKgs > 0 ? rows.reduce((s: number, r: any) => s + (parseFloat(r[key]) || 0) * (parseFloat(r.kgs) || 0), 0) / totalKgs : 0;

            // Cost columns — shown only when the table has prices AND cost display is
            // on, exactly as web gates them (newTable.js:100-102). The Ni price is
            // scaled by the table's payable percentage.
            const prices = table.prices || {};
            const niMult = (table.niPercent != null ? table.niPercent : 100) / 100;
            const hasPrices = elements.some((el) => parseFloat(prices[el.key]) > 0);
            const showCosts = !!table.showCosts && hasPrices;
            const costPmt = (r: any) =>
              elements.reduce((sum, el) => {
                const price = parseFloat(prices[el.key]) || 0;
                if (!price) return sum;
                const mult = el.key === 'ni' ? niMult : 1;
                return sum + ((parseFloat(r[el.key]) || 0) / 100) * price * mult;
              }, 0);
            const toMT = UNIT_TO_MT[unitKey] || 0.001;
            const costTotal = (r: any) => costPmt(r) * (parseFloat(r.kgs) || 0) * toMT;
            const footCostPmt =
              totalKgs > 0 ? rows.reduce((s: number, r: any) => s + costPmt(r) * (parseFloat(r.kgs) || 0), 0) / totalKgs : 0;
            const footCostTotal = rows.reduce((s: number, r: any) => s + costTotal(r), 0);

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
                            {weighted(el.key) === 0 ? '' : fmt(weighted(el.key))}
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
  if (!tables || tables.length === 0) return null;

  const per = tables.map((table: any) => {
    const elems = table.elements && table.elements.length ? table.elements : DEFAULT_ELEMENTS;
    const rows = table.data || [];
    const totalKgs = rows.reduce((s: number, r: any) => s + Number(r.kgs), 0);
    const obj: any = { kgs: totalKgs };
    elems.forEach((el: any) => {
      const ws = rows.reduce((s: number, r: any) => s + (parseFloat(r[el.key] || 0) * Number(r.kgs)), 0);
      obj[el.key] = totalKgs > 0 ? (ws / totalKgs).toFixed(2) : '0.00';
    });
    return obj;
  });

  const totalKgs = per.reduce((s: number, t: any) => s + Number(t.kgs), 0);
  const result: any = { kgs: totalKgs.toFixed(2) };
  DEFAULT_ELEMENTS.forEach((el) => {
    const valid = per.filter((t: any) => !isNaN(parseFloat(t[el.key])));
    const sum = valid.reduce((acc: number, t: any) => acc + parseFloat(t[el.key] || 0), 0);
    result[el.key] = valid.length > 0 ? (sum / valid.length).toFixed(2) : '0.00';
  });

  if (Object.values(result).some((v: any) => isNaN(parseFloat(v)))) return null;

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
