import React, { useState } from 'react';
import { View, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useMarginsEditor } from './useMargins';
import { fmtMoney } from '@/lib/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthName = (m: any) => {
  const n = parseInt(String(m), 10);
  return n >= 1 && n <= 12 ? MONTHS[n - 1] : String(m);
};
const n2 = (v: any) => fmtMoney(Number(v) || 0);

// Editable per-month item table — the mobile twin of web's Disclosure + 13-column
// margins grid. Mobile previously showed month aggregates only, with no way to see
// or edit the underlying rows and no save path.
//
// GIS rows are the subtle part: the row contributes HALF its totalMargin and
// remaining to the month total, and the cell displays the halved figure with the
// full amount beneath — exactly like the web tooltip.
export function MonthEditor() {
  const { colors } = useTheme();
  const { compData } = useSettings();
  const {
    months, year, dirty, setField, toggleGis, addItem, deleteItem, addMonth, deleteMonth, save,
  } = useMarginsEditor();

  const [open, setOpen] = useState<Record<string, boolean>>({});
  // Web flips the column header between GIS and IMS from the company name.
  const gisLabel = String((compData as any)?.name || 'GIS').slice(0, 3).toUpperCase();

  const W = { qty: 78, desc: 130, margin: 78, total: 92, shipped: 78, openShip: 78, remaining: 92 };

  return (
    <Card style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text variant="label" tone="muted">Months · {year}</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={addMonth} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
            <Text variant="caption" tone="primary">Add month</Text>
          </Pressable>
        </View>
      </View>

      {months.length === 0 ? (
        <Text variant="body" tone="muted">No margin months for this year.</Text>
      ) : (
        months.map((m) => {
          const isOpen = !!open[m.month];
          return (
            <View key={m.month} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 8 }}>
              <Pressable
                onPress={() => setOpen((p) => ({ ...p, [m.month]: !p[m.month] }))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={15} color={colors.textFaint} />
                <Text variant="bodyMedium" style={{ width: 44 }}>{monthName(m.month)}</Text>
                <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                  {m.items.length} row{m.items.length === 1 ? '' : 's'}
                </Text>
                <Text variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                  {n2(m.purchase)} MT
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ marginLeft: 12, fontVariant: ['tabular-nums'], color: Number(m.totalMargin) >= 0 ? colors.positive : colors.negative }}
                >
                  ${n2(m.totalMargin)}
                </Text>
              </Pressable>

              {isOpen && (
                <View style={{ marginTop: 8 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.borderStrong }}>
                        <Head w={W.qty}>Qty (MT)</Head>
                        <Head w={W.desc}>Description</Head>
                        <Head w={W.margin}>Margin</Head>
                        <Head w={W.total}>Total margin</Head>
                        <Head w={W.shipped}>Shipped</Head>
                        <Head w={W.openShip}>Open ship</Head>
                        <Head w={W.remaining}>Remaining</Head>
                        <Head w={44}>{gisLabel}</Head>
                        <Head w={30}> </Head>
                      </View>

                      {m.items.map((it) => (
                        <View key={it.id} style={{ flexDirection: 'row', gap: 6, paddingVertical: 5, alignItems: 'center' }}>
                          <Inp w={W.qty} value={it.purchase} numeric onChange={(t) => setField(m.month, it.id, 'purchase', t)} />
                          <Inp w={W.desc} value={it.description} align="left" onChange={(t) => setField(m.month, it.id, 'description', t)} />
                          <Inp w={W.margin} value={it.margin} numeric onChange={(t) => setField(m.month, it.id, 'margin', t)} />
                          {/* computed — GIS rows show the halved figure, full beneath */}
                          <Calc w={W.total} value={it.totalMargin} gis={!!it.gis} />
                          <Inp w={W.shipped} value={it.shipped} numeric onChange={(t) => setField(m.month, it.id, 'shipped', t)} />
                          <Calc w={W.openShip} value={it.openShip} />
                          <Calc w={W.remaining} value={it.remaining} gis={!!it.gis} />
                          <Pressable
                            onPress={() => toggleGis(m.month, it.id, !it.gis)}
                            hitSlop={6}
                            style={{ width: 44, alignItems: 'center' }}
                          >
                            <Ionicons
                              name={it.gis ? 'checkbox' : 'square-outline'}
                              size={17}
                              color={it.gis ? colors.primary : colors.textFaint}
                            />
                          </Pressable>
                          <Pressable onPress={() => deleteItem(m.month, it.id)} hitSlop={6} style={{ width: 30, alignItems: 'center' }}>
                            <Ionicons name="close-circle-outline" size={16} color={colors.negative} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </ScrollView>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
                    <Pressable onPress={() => addItem(m.month)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                      <Text variant="caption" tone="primary">Add row</Text>
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    <Pressable
                      onPress={() =>
                        Alert.alert('Delete month?', `${monthName(m.month)} and all its rows.`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteMonth(m.month) },
                        ])
                      }
                      hitSlop={8}
                    >
                      <Text variant="caption" style={{ color: colors.negative }}>Delete month</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}

      <Button
        title={dirty ? 'Save changes' : 'Saved'}
        disabled={!dirty}
        loading={save.isPending}
        onPress={() => save.mutate()}
        style={{ marginTop: 14 }}
      />
      {dirty && (
        <Text variant="caption" tone="warn" style={{ textAlign: 'center', marginTop: 6 }}>
          Unsaved changes — deleted months are removed on save.
        </Text>
      )}
    </Card>
  );
}

function Head({ w, children }: { w: number; children: React.ReactNode }) {
  return (
    <Text variant="caption" tone="muted" style={{ width: w, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
      {children}
    </Text>
  );
}

function Inp({
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
        width: w, textAlign: align, fontSize: 12, fontFamily: 'Inter_400Regular',
        color: colors.text, paddingVertical: 3, paddingHorizontal: 5,
        borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.surfaceAlt,
      }}
    />
  );
}

// Read-only derived cell. A GIS row shows HALF (what the month counts) with the
// full amount beneath, mirroring web's tooltip.
function Calc({ w, value, gis }: { w: number; value: any; gis?: boolean }) {
  const { colors } = useTheme();
  const v = Number(value) || 0;
  return (
    <View style={{ width: w }}>
      <Text variant="caption" style={{ textAlign: 'right', fontVariant: ['tabular-nums'], color: colors.textMuted }}>
        {n2(gis ? v / 2 : v)}
      </Text>
      {gis ? (
        <Text variant="caption" tone="faint" style={{ textAlign: 'right', fontSize: 9 }}>
          of {n2(v)}
        </Text>
      ) : null}
    </View>
  );
}
