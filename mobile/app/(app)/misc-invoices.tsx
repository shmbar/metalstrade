import { useMemo, useState } from 'react';
import { View, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, SectionHeader, SkeletonList, ErrorState, EmptyState, Sheet } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useMiscInvoices, useSetMiscCategory, MISC_CATS, MiscRow, MiscCat } from '@/features/misc/useMiscInvoices';
import { apiConfigured, postJson } from '@/lib/api';
import { curSymbol, fmtMoney } from '@/lib/format';
import { StackHeader } from '@/components/StackHeader';

const CAT_TONE: Record<string, 'info' | 'warn' | 'positive' | 'neutral'> = {
  shipments: 'info',
  personal: 'warn',
  random: 'positive',
  uncategorized: 'neutral',
};
const catLabel = (c: MiscCat) => MISC_CATS.find((x) => x.id === c)?.label || 'Uncategorized';

export default function MiscInvoices() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { rows, totals, isLoading, isError, error, refetch } = useMiscInvoices();
  const setCat = useSetMiscCategory();
  const [editing, setEditing] = useState<MiscRow | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  // AI category suggestion (web /api/ai/categorize-expense).
  const suggestCategory = async (row: MiscRow) => {
    setAiBusy(true);
    try {
      const res = await postJson<{ category?: string }>('/api/ai/categorize-expense', {
        description: `${row.description || ''} ${row.invoice || ''} ${row.supplierName}`.trim(),
        // The route renders `c.id` and `c.label` into its prompt — sending bare id
        // strings left both undefined, so the model never got the category list.
        categories: MISC_CATS.map((c) => ({ id: c.id, label: c.label })),
      });
      const cat = (MISC_CATS.find((c) => c.id === res.category)?.id || '') as MiscCat;
      if (cat) {
        await setCat.mutateAsync({ id: row.id, category: cat });
        setEditing(null);
      } else {
        Alert.alert('No suggestion', 'Couldn’t confidently categorize this one — pick manually.');
      }
    } catch (e: any) {
      Alert.alert('AI suggest failed', e?.message || 'Could not get a suggestion.');
    } finally {
      setAiBusy(false);
    }
  };

  // Web prints these at full 2-decimal precision through Intl. fmtCurKM collapses
  // to $K/$M, so $1,234,567.89 read as "$1.23M" — up to ~$5,000 of hidden
  // difference on a single line. The symbol resolves through the tenant's own
  // Currency settings the way web's getD does, so a third currency shows its ISO
  // code rather than the raw stored id.
  const symFor = (cur: string) => {
    const iso = settings?.Currency?.Currency?.find((c: any) => c.id === cur)?.cur;
    if (iso) return iso.toUpperCase() === 'EUR' ? '€' : iso.toUpperCase() === 'USD' ? '$' : `${iso} `;
    return curSymbol(cur);
  };
  const curLine = (byCur: Record<string, number>) => {
    const ents = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
    return ents.length ? ents.map(([c, v]) => `${symFor(c)}${fmtMoney(v)}`).join('  ') : '$0.00';
  };

  const catRows = useMemo(
    () =>
      ['shipments', 'personal', 'random', 'uncategorized']
        .map((id) => ({ id, byCur: totals.byCat[id] || {} }))
        .filter((c) => Object.keys(c.byCur).length > 0),
    [totals]
  );

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Misc Invoices" right={<PeriodSelector />} />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No misc invoices" message="None in the selected period." icon={<Ionicons name="receipt-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={rows}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <View>
              <Card style={{ marginBottom: 12 }}>
                <SectionHeader title="Totals" subtitle={`${rows.length} invoice(s)`} />
                {/* Web renders BOTH currency rows explicitly, always — with the
                    weight sum beside the amount, at 2 decimals (not $K/$M). */}
                <TotalRow label="Total $" qnty={totals.usd.qnty} amount={totals.usd.amount} sym="$" first />
                <TotalRow label="Total €" qnty={totals.eur.qnty} amount={totals.eur.amount} sym="€" />
                {catRows.map((c) => (
                  <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Badge label={catLabel(c.id === 'uncategorized' ? '' : (c.id as MiscCat))} tone={CAT_TONE[c.id]} />
                    <Text variant="bodyMedium">{curLine(c.byCur)}</Text>
                  </View>
                ))}
              </Card>

              {/* Summary — unpaid invoices, per supplier (web's first summary card). */}
              {totals.bySupplierUnpaid.length > 0 && (
                <SupplierSummary title="Unpaid invoices" groups={totals.bySupplierUnpaid} totals={totals.unpaid} />
              )}
              {/* Summary — all invoices, per supplier (web's second summary card). */}
              {totals.bySupplier.length > 0 && (
                <SupplierSummary title="Summary — all" groups={totals.bySupplier} totals={totals.all} />
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }} onPress={() => setEditing(item)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>{item.description || item.invoice || 'Invoice'}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>{item.supplierName}{item.order ? ` · ${item.order}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {/* Row amounts resolve the symbol through the tenant Currency
                      list, like web (getD), rather than a hardcoded map. */}
                  <Text variant="bodyMedium" tone="primary">{symFor(item.cur)}{fmtMoney(item.total)}</Text>
                  {item.paidNotPaid ? (
                    <Text variant="caption" tone={item.paidNotPaid === 'Paid' ? 'positive' : 'negative'}>{item.paidNotPaid}</Text>
                  ) : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <Badge label={catLabel(item.category)} tone={CAT_TONE[item.category || 'uncategorized']} />
                <View style={{ flex: 1 }} />
                <Text variant="caption" tone="primary">Tap to set category</Text>
              </View>
            </Card>
          )}
        />
      )}

      {/* Category picker */}
      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title="Category"
        headerRight={
          apiConfigured() && editing ? (
            <Pressable
              onPress={() => suggestCategory(editing)}
              hitSlop={8}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primary + '1A' }}
            >
              {aiBusy ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="sparkles" size={14} color={colors.primary} />}
              <Text variant="label" tone="primary">AI suggest</Text>
            </Pressable>
          ) : undefined
        }
      >
        {[{ id: '' as MiscCat, label: 'Uncategorized' }, ...MISC_CATS.map((c) => ({ id: c.id as MiscCat, label: c.label }))].map((c) => {
          const active = (editing?.category || '') === c.id;
          return (
            <Pressable
              key={c.id || 'none'}
              onPress={async () => {
                if (editing) await setCat.mutateAsync({ id: editing.id, category: c.id });
                setEditing(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}
            >
              <Text variant="body" tone={active ? 'primary' : 'default'}>{c.label}</Text>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </Pressable>
          );
        })}
      </Sheet>
    </Screen>
  );
}

// Explicit per-currency total row — web shows amount at 2 decimals (never $K/$M)
// alongside the weight sum for that currency.
function TotalRow({ label, qnty, amount, sym, first }: { label: string; qnty: number; amount: number; sym: string; first?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 6, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border,
      }}
    >
      <Text variant="bodyMedium">{label}</Text>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <Text variant="body" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
          {new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(qnty || 0)}
        </Text>
        <Text variant="bodyMedium" tone="primary" style={{ fontVariant: ['tabular-nums'] }}>
          {sym}{fmtMoney(amount)}
        </Text>
      </View>
    </View>
  );
}

// Per-supplier × currency summary card (web's two "Summary" tables).
function SupplierSummary({
  title, groups, totals,
}: {
  title: string;
  groups: { supplier: string; byCur: Record<string, number> }[];
  totals: Record<string, number>;
}) {
  const { colors } = useTheme();
  const line = (byCur: Record<string, number>) =>
    Object.entries(byCur)
      .filter(([, v]) => Math.abs(v) > 0.005)
      .map(([c, v]) => `${curSymbol(c)}${fmtMoney(v)}`)
      .join('  ') || '$0.00';
  return (
    <Card style={{ marginBottom: 12 }}>
      <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>{title}</Text>
      {groups.map((g, i) => (
        <View
          key={g.supplier}
          style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingVertical: 6, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border,
          }}
        >
          <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>{g.supplier}</Text>
          <Text variant="bodyMedium" style={{ fontVariant: ['tabular-nums'] }}>{line(g.byCur)}</Text>
        </View>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text variant="bodyMedium">Total</Text>
        <Text variant="bodyMedium" tone="primary" style={{ fontVariant: ['tabular-nums'] }}>{line(totals)}</Text>
      </View>
    </Card>
  );
}
