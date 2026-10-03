import { useState } from 'react';
import { View, ScrollView, TextInput, Alert } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, SkeletonList, ErrorState, EmptyState, Chip } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useMaterials, cleanElement, cleanKgs, canDeleteTable } from '@/features/materials/useMaterials';
import { DEFAULT_ELEMENTS, UNIT_LABELS } from '@/features/materials/constants';
// The footer filter, the weighted averages, the cost maths and the cross-table
// total all live in ./tableMath so they can be diffed against web in
// __tests__/parity/margins-materials-formulas.test.ts. Each carries its web citation.
import {
  fmtCell as fmt,
  fmtWeight,
  fmtAvg,
  fmtPrice,
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
  hasSalesPrices as hasSalesPricesOf,
  salesPerMT,
  salesTotal,
  footerSalesPmt,
  footerSalesTotal,
  grandTotals,
  pricedElements,
} from '@/features/materials/tableMath';
import { StackHeader } from '@/components/StackHeader';
import { useRevealOnFocus } from '@/lib/keyboard';
import { toast } from '@/store/toast';
import { typography, layout } from '@/theme/tokens';

const COL = 56; // element column width
const COST_COL = 76;
const CONTAINER_COL = 96;

export default function Materials() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    tables: data, dirty, addTable, addRow, removeRow, setCell, setTableField, save, removeTable, discard,
    isLoading, isError, error, refetch,
  } = useMaterials();
  const [editing, setEditing] = useState(false);

  // A refresh shows what the server holds, so with unsaved edits it has to ask first —
  // the working copy is no longer replaced behind the user's back (useMaterials).
  const onRefresh = () => {
    if (!dirty) {
      refetch();
      return;
    }
    Alert.alert('Discard unsaved changes?', 'Your edits to the material tables have not been saved yet.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { discard(); refetch(); } },
    ]);
  };

  const onDeleteTable = (table: any) => {
    // Web refuses to delete a table that still has rows ("Table contains materials!").
    if (!canDeleteTable(table)) {
      toast.error('Remove its rows first, then delete the table.', 'Table contains materials');
      return;
    }
    Alert.alert('Delete table?', table.name || 'This table', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTable.mutate(table) },
    ]);
  };

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false} refreshing={isLoading} onRefresh={onRefresh}>
      <StackHeader
        title="Material Tables"
        subtitle="Element composition (Ni, Cr, Mo…)"
        right={<Chip label={editing ? 'Done' : 'Edit'} icon={editing ? 'checkmark' : 'create-outline'} active={editing} onPress={() => setEditing((e) => !e)} />}
      />

      {/* Stays up while anything is unsaved, edit mode or not: "Done" only leaves edit
          mode, and the edits it leaves behind were otherwise invisible until lost. */}
      {(editing || dirty) && (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <Button title="Add table" variant="secondary" onPress={() => { setEditing(true); addTable(); }} style={{ flex: 1 }} />
          <Button title={dirty ? 'Save changes' : 'Saved'} disabled={!dirty} loading={save.isPending} onPress={() => save.mutate()} style={{ flex: 1 }} />
        </View>
      )}

      {isLoading ? (
        <SkeletonList count={5} />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load materials.'} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No material tables"
          message="A table holds a packing list's bundles with their weights and analysis."
          icon={<Ionicons name="grid-outline" size={24} color={colors.textFaint} />}
          actionLabel="Add table"
          onAction={() => { setEditing(true); addTable(); }}
        />
      ) : (
        <View style={{ gap: layout.stack }}>
          <GrandTotals tables={data} />
          {data.map((table: any, ti: number) => {
            const elements = (table.elements && table.elements.length ? table.elements : DEFAULT_ELEMENTS) as { key: string; label: string }[];
            const unitKey = table.unit || 'kgs';
            const unit = UNIT_LABELS[unitKey] || 'Kgs';
            const allRows = table.data || [];
            // The per-row container column (web buildColumns puts it first when the
            // table's Container button is on) and the table's shipment reference.
            const showContainer = !!table.showContainer;
            const containerLabel = table.containerLabel || 'Container';

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

            // Sales columns — the same gate as the cost pair, against the table's
            // SECOND price map (newTable.js:161-196). Both pairs can show at once,
            // and the order is Cost PMT, Cost Total, Sales MT, Sales Total.
            const salesPrices = table.salesPrices || {};
            const salesNiMult = niMultiplier(table.salesNiPercent);
            const showSales = !!table.showSales && hasSalesPricesOf(elements, salesPrices);
            const salesMt = (r: any) => salesPerMT(r, elements, salesPrices, salesNiMult);
            const salesTot = (r: any) => salesTotal(r, elements, salesPrices, salesNiMult, unitKey);
            // The footer pair is the cost pair's maths on the sales prices: per-MT
            // averaged by weight, the total SUMMED (web newTable.js footerVal).
            const footSalesMt = footerSalesPmt(rows, elements, salesPrices, salesNiMult, totalKgs);
            const footSalesTotal = footerSalesTotal(rows, elements, salesPrices, salesNiMult, unitKey);

            return (
              <Card key={table.id || ti} padded={false}>
                <View style={{ padding: layout.cardInset, paddingBottom: 6, gap: 2 }}>
                  {/* A table made on the phone could not be named — it saved as "" and
                      read "Table 3" on both apps. */}
                  {editing ? (
                    <NameInput value={table.name || ''} onChange={(t) => setTableField(table.id, 'name', t)} />
                  ) : (
                    <Text variant="h3">{table.name || table.nname || `Table ${ti + 1}`}</Text>
                  )}
                  <Text variant="caption" tone="faint">
                    {rows.length} material{rows.length === 1 ? '' : 's'} · {unit}
                    {table.containerNo ? ` · Shipment # ${table.containerNo}` : ''}
                  </Text>
                  {!!table.showCosts && <PriceLine label="Cost" elements={elements} prices={prices} niPercent={table.niPercent} />}
                  {!!table.showSales && <PriceLine label="Sales" elements={elements} prices={salesPrices} niPercent={table.salesNiPercent} />}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.cardInset, paddingBottom: layout.cardInset }}>
                  <View>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderStrong, paddingBottom: 6 }}>
                      {showContainer && (
                        <Text variant="tableStrong" tone="muted" style={{ width: CONTAINER_COL }} numberOfLines={1}>{containerLabel}</Text>
                      )}
                      <Text variant="tableStrong" tone="muted" style={{ width: 130 }}>Material</Text>
                      <Text variant="tableStrong" tone="muted" style={{ width: COL, textAlign: 'right' }}>{unit}</Text>
                      {elements.map((el) => (
                        <Text key={el.key} variant="tableStrong" tone="muted" style={{ width: COL, textAlign: 'right' }}>{el.label}</Text>
                      ))}
                      {showCosts && (
                        <>
                          <Text variant="tableStrong" tone="muted" style={{ width: COST_COL, textAlign: 'right' }}>Cost PMT</Text>
                          <Text variant="tableStrong" tone="muted" style={{ width: COST_COL, textAlign: 'right' }}>Cost Total</Text>
                        </>
                      )}
                      {/* The sales pair was drawn in every row and in the footer but
                          never named up here, so its two figures sat under no heading. */}
                      {showSales && (
                        <>
                          <Text variant="tableStrong" tone="muted" style={{ width: COST_COL, textAlign: 'right' }}>Sales MT</Text>
                          <Text variant="tableStrong" tone="muted" style={{ width: COST_COL, textAlign: 'right' }}>Sales Total</Text>
                        </>
                      )}
                    </View>
                    {/* Rows */}
                    {/* The body shows every stored row — web only applies the
                        blank-row filter to its footer. */}
                    {allRows.map((r: any, ri: number) => (
                      <View key={r.id || ri} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        {showContainer && (editing ? (
                          <Cell w={CONTAINER_COL} value={r.container} onChange={(t) => setCell(table.id, r.id, 'container', t)} align="left" />
                        ) : (
                          <Text variant="table" style={{ width: CONTAINER_COL }} numberOfLines={1}>{r.container || '—'}</Text>
                        ))}
                        {editing ? (
                          <Cell w={130} value={r.material} onChange={(t) => setCell(table.id, r.id, 'material', t)} align="left" />
                        ) : (
                          <Text variant="table" style={{ width: 130 }} numberOfLines={1}>{r.material || '—'}</Text>
                        )}
                        {editing ? (
                          <Cell w={COL} value={r.kgs} onChange={(t) => setCell(table.id, r.id, 'kgs', cleanKgs(t))} numeric />
                        ) : (
                          <Text variant="table" style={{ width: COL, textAlign: 'right' }}>{fmtWeight(r.kgs, unitKey)}</Text>
                        )}
                        {/* Typing any element recomputes Fe as the balance, and a typed
                            Fe sticks — setCell runs web's editCell rules (editRow). */}
                        {elements.map((el) => editing ? (
                          <Cell key={el.key} w={COL} value={r[el.key]} numeric onChange={(t) => { const v = cleanElement(t); if (v !== null) setCell(table.id, r.id, el.key, v); }} />
                        ) : (
                          <Text key={el.key} variant="table" style={{ width: COL, textAlign: 'right' }}>{fmt(r[el.key])}</Text>
                        ))}
                        {showCosts && (
                          <>
                            {/* Web renders an empty cell for a zero cost, not '$0.00'. */}
                            <Text variant="table" tone="primary" style={{ width: COST_COL, textAlign: 'right' }}>
                              {costPmt(r) ? money(costPmt(r)) : ''}
                            </Text>
                            <Text variant="tableStrong" tone="primary" style={{ width: COST_COL, textAlign: 'right' }}>
                              {costTotal(r) ? money(costTotal(r)) : ''}
                            </Text>
                          </>
                        )}
                        {showSales && (
                          <>
                            <Text variant="table" tone="primary" style={{ width: COST_COL, textAlign: 'right' }}>
                              {salesMt(r) ? money(salesMt(r)) : ''}
                            </Text>
                            <Text variant="tableStrong" tone="primary" style={{ width: COST_COL, textAlign: 'right' }}>
                              {salesTot(r) ? money(salesTot(r)) : ''}
                            </Text>
                          </>
                        )}
                        {editing && (
                          <Pressable onPress={() => removeRow(table.id, r.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove row" style={{ paddingLeft: 8, justifyContent: 'center' }}>
                            <Ionicons name="close-circle-outline" size={16} color={colors.negative} />
                          </Pressable>
                        )}
                      </View>
                    ))}
                    {/* Weighted-average totals */}
                    {allRows.length > 0 && (
                      <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
                        {showContainer && <View style={{ width: CONTAINER_COL }} />}
                        <Text variant="tableStrong" tone="primary" style={{ width: 130 }}>{rows.length} items</Text>
                        <Text variant="tableStrong" tone="primary" style={{ width: COL, textAlign: 'right' }}>{fmtWeight(totalKgs, unitKey)}</Text>
                        {elements.map((el) => (
                          <Text key={el.key} variant="tableStrong" tone="primary" style={{ width: COL, textAlign: 'right' }}>
                            {/* Web leaves the cell EMPTY when the average is zero, so
                                an element with no data doesn't read as a measured 0. */}
                            {fmtAvg(weighted(el.key))}
                          </Text>
                        ))}
                        {showCosts && (
                          <>
                            <Text variant="tableStrong" tone="primary" style={{ width: COST_COL, textAlign: 'right' }}>
                              {totalKgs === 0 ? '' : money(footCostPmt)}
                            </Text>
                            <Text variant="tableStrong" tone="primary" style={{ width: COST_COL, textAlign: 'right' }}>
                              {money(footCostTotal)}
                            </Text>
                          </>
                        )}
                        {showSales && (
                          <>
                            {/* Money, like the cost pair beside them — web gave these
                                two their own footer branches on 2026-10-02. */}
                            <Text variant="tableStrong" tone="primary" style={{ width: COST_COL, textAlign: 'right' }}>
                              {totalKgs === 0 ? '' : money(footSalesMt)}
                            </Text>
                            <Text variant="tableStrong" tone="primary" style={{ width: COST_COL, textAlign: 'right' }}>
                              {money(footSalesTotal)}
                            </Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                </ScrollView>
                {editing && (
                  <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: layout.cardInset, paddingBottom: layout.cardInset }}>
                    <Pressable onPress={() => addRow(table.id)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                      <Text variant="caption" tone="primary">Add row</Text>
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    <Pressable onPress={() => onDeleteTable(table)} hitSlop={8} disabled={removeTable.isPending}>
                      <Text variant="caption" style={{ color: colors.negative }}>{removeTable.isPending ? 'Deleting…' : 'Delete table'}</Text>
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
// (materialtables/page.js, the totals effect).
//
// In kgs whatever unit each table is kept in, each element averaged by weight across
// the rows that carry it, blank placeholder rows skipped — the footer's own rules,
// applied across tables. Only the nine DEFAULT_ELEMENTS appear: a custom element
// added to one table is never rolled up.
function GrandTotals({ tables }: { tables: any[] }) {
  const { colors } = useTheme();
  const result = grandTotals(tables);
  if (!result) return null;

  return (
    <Card padded={false}>
      <View style={{ padding: layout.cardInset, paddingBottom: 6 }}>
        <Text variant="h3">Total</Text>
        <Text variant="caption" tone="faint">Across all {tables.length} table{tables.length === 1 ? '' : 's'}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.cardInset, paddingBottom: layout.cardInset }}>
        <View>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderStrong, paddingBottom: 6 }}>
            <Text variant="tableStrong" tone="muted" style={{ width: COL, textAlign: 'right' }}>Kgs</Text>
            {DEFAULT_ELEMENTS.map((el) => (
              <Text key={el.key} variant="tableStrong" tone="muted" style={{ width: COL, textAlign: 'right' }}>{el.label}</Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
            <Text variant="tableStrong" tone="primary" style={{ width: COL, textAlign: 'right' }}>{fmt(result.kgs)}</Text>
            {DEFAULT_ELEMENTS.map((el) => (
              <Text key={el.key} variant="tableStrong" tone="primary" style={{ width: COL, textAlign: 'right' }}>{fmt(result[el.key])}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </Card>
  );
}

// The prices a table's Cost / Sales figures are built from — web's price bars, read
// only. The phone printed Cost PMT and Sales Total with nothing saying which prices
// made them. Only the prices the maths uses (pricedElements); the Ni payable % is
// named when it is not 100.
function PriceLine({
  label, elements, prices, niPercent,
}: {
  label: string;
  elements: { key: string; label: string }[];
  prices: Record<string, any>;
  niPercent: any;
}) {
  const priced = pricedElements(elements, prices);
  if (!priced.length) return null;
  const pct = Number(niPercent);
  const parts = priced.map((el) =>
    `${el.label} ${fmtPrice(prices[el.key])}${el.key === 'ni' && pct && pct !== 100 ? ` × ${pct}%` : ''}`
  );
  return (
    <Text variant="caption" tone="muted">
      <Text variant="captionStrong" tone="muted">{label} $/MT</Text>
      {'  '}
      {parts.join(' · ')}
    </Text>
  );
}

// The table's name, editable in edit mode — web's "Table name..." field.
function NameInput({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const { colors } = useTheme();
  const { ref: revealRef, onFocus } = useRevealOnFocus();
  return (
    <TextInput
      ref={revealRef}
      onFocus={onFocus}
      value={value}
      onChangeText={onChange}
      placeholder="Table name…"
      placeholderTextColor={colors.textFaint}
      accessibilityLabel="Table name"
      style={{
        fontSize: typography.h3.fontSize,
        fontFamily: typography.h3.fontFamily,
        color: colors.text,
        paddingVertical: 2,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    />
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
  // A cell in a wide table sits in the page's ScrollView: ask it to bring the cell
  // above the keyboard, the way TextField does on its own.
  const { ref: revealRef, onFocus } = useRevealOnFocus();
  return (
    <TextInput
      ref={revealRef}
      onFocus={onFocus}
      value={value == null ? '' : String(value)}
      onChangeText={onChange}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      style={{
        width: w,
        textAlign: align,
        fontSize: typography.caption.fontSize,
        fontFamily: typography.caption.fontFamily,
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
