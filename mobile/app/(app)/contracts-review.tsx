import { useMemo, useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, TextField, SegmentedControl, ProgressBar, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useContractsReview, statusTone } from '@/features/review/useContractsReview';
import { fmtMoney, curSymbol } from '@/lib/format';
import { sumReviewFinancials } from '@/features/review/reviewFinance';

const wt = (n: number) => `${fmtMoney(n, 3)}`; // web showWeight — fixed 3 dp
// web fmtMT (page.js:38) — max 2 dp, no minimum. Used ONLY for the progress-bar
// caption; the table cells keep showWeight's 3 dp.
const wtCap = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n || 0);

export default function ContractsReview() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Web's currency selector (page.js:200-207 CB → valCur), default USD. Every
  // contract's money converts into it; nothing is bucketed per contract currency.
  const [viewCur, setViewCur] = useState<'us' | 'eu'>('us');
  const { rows, statement, statementLines, isLoading, isError, error, refetch } = useContractsReview(viewCur);
  const [tab, setTab] = useState<'review' | 'statement'>('review');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.order.toLowerCase().includes(q) || r.supplierName.toLowerCase().includes(q));
  }, [rows, search]);

  // Totals recomputed from the FILTERED rows — a SINGLE row in the view currency,
  // exactly like web's setTtl(), which sums every contract regardless of its own
  // currency because reviewFinancials has already converted each one into viewCur.
  const reviewTotals = useMemo(() => sumReviewFinancials(filtered.map((r) => r.fin)), [filtered]);

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Contracts Review</Text>
        <PeriodSelector />
      </View>

      <View style={{ marginBottom: 14 }}>
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as any)}
          options={[
            { value: 'review', label: 'Review' },
            { value: 'statement', label: 'Statement' },
          ]}
        />
      </View>

      {tab === 'review' && (
        <>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <TextField value={search} onChangeText={setSearch} placeholder="Search PO or supplier…" autoCapitalize="none" rightElement={<Ionicons name="search" size={18} color={colors.textFaint} />} />
            </View>
            {/* Web's currency dropdown — one view currency for the whole table. */}
            <Pressable
              onPress={() => setViewCur((c) => (c === 'us' ? 'eu' : 'us'))}
              hitSlop={8}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt }}
            >
              <Text variant="bodyMedium" tone="primary">{viewCur === 'eu' ? 'EUR €' : 'USD $'}</Text>
            </Pressable>
          </View>
          <View style={{ height: 12 }} />
        </>
      )}

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : tab === 'review' ? (
        filtered.length === 0 ? (
          <EmptyState title="No contracts" message="None in the selected period." icon={<Ionicons name="albums-outline" size={40} color={colors.textFaint} />} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(r) => r.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
            onRefresh={refetch}
            refreshing={isLoading}
            renderItem={({ item }) => {
              const pct = item.poWeight > 0 ? Math.min(100, (item.shippedWeight / item.poWeight) * 100) : 0;
              return (
                <Card style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="h3" numberOfLines={1}>{item.order}</Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>{item.supplierName}</Text>
                    </View>
                    <Badge label={item.statusLabel || '—'} tone={statusTone(item.statusKey)} />
                  </View>
                  <View style={{ marginTop: 10, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="caption" tone="faint">Shipped {wtCap(item.shippedWeight)} / {wtCap(item.poWeight)} MT</Text>
                      <Text variant="caption" tone={pct >= 99.9 ? 'positive' : 'muted'}>{pct.toFixed(0)}%</Text>
                    </View>
                    <ProgressBar pct={pct} color={pct >= 99.9 ? colors.positive : colors.primary} height={8} />
                    <Text variant="caption" tone="faint">Remaining {wt(item.remaining)} MT</Text>
                  </View>

                  {/* Web's 11 financial columns, per contract, in its own currency. */}
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
                    <Money label="Purchase Value" v={item.fin.conValue} cur={item.finCur} />
                    <Money label="Inv Value Sales" v={item.fin.totalInvoices} cur={item.finCur} />
                    {Math.abs(item.fin.deviation) > 0.005 && (
                      <Money label="Deviation" v={item.fin.deviation} cur={item.finCur} tone="warn" />
                    )}
                    <Money
                      label={item.fin.prepaidPer == null ? 'Prepaid' : `Prepaid (${item.fin.prepaidPer.toFixed(0)}%)`}
                      v={item.fin.totalPrepayment1}
                      cur={item.finCur}
                    />
                    <Money label="Initial Debt" v={item.fin.inDebt} cur={item.finCur} />
                    <Money label="Actual Payment" v={item.fin.payments} cur={item.finCur} tone="positive" />
                    <Money label="Debt After Prepayment" v={item.fin.debtaftr} cur={item.finCur} />
                    <Money label="Debt Balance" v={item.fin.debtBlnc} cur={item.finCur} tone={item.fin.debtBlnc > 0.01 ? 'negative' : 'positive'} />
                    <Money label="Expenses" v={item.fin.expenses1} cur={item.finCur} />
                    <Money label="Profit" v={item.fin.profit} cur={item.finCur} tone={item.fin.profit >= 0 ? 'positive' : 'negative'} strong />
                  </View>
                </Card>
              );
            }}
            ListHeaderComponent={
              /* Totals strip — recomputed live from the FILTERED rows, per currency,
                 exactly like web's totals row above the header. */
              <Card style={{ marginBottom: 12 }}>
                <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>
                  Totals · {filtered.length} contract(s)
                </Text>
                <Money label="Purchase Value" v={reviewTotals.conValue} cur={viewCur} />
                <Money label="Inv Value Sales" v={reviewTotals.totalInvoices} cur={viewCur} />
                <Money
                  label={reviewTotals.prepaidPer == null ? 'Prepaid' : `Prepaid (${reviewTotals.prepaidPer.toFixed(2)}%)`}
                  v={reviewTotals.totalPrepayment1}
                  cur={viewCur}
                />
                <Money label="Actual Payment" v={reviewTotals.payments} cur={viewCur} tone="positive" />
                <Money label="Debt Balance" v={reviewTotals.debtBlnc} cur={viewCur} tone={reviewTotals.debtBlnc > 0.01 ? 'negative' : 'positive'} />
                <Money label="Expenses" v={reviewTotals.expenses1} cur={viewCur} />
                <Money label="Profit" v={reviewTotals.profit} cur={viewCur} tone={reviewTotals.profit >= 0 ? 'positive' : 'negative'} strong />
              </Card>
            }
          />
        )
      ) : statementLines.length === 0 ? (
        <EmptyState title="No statement data" message="None in the selected period." />
      ) : (
        <FlatList
          /* Web's statement is ONE ROW PER MATERIAL LINE, not per supplier — the
             per-supplier totals stay as a header summary above it. */
          data={statementLines}
          keyExtractor={(s) => s.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <Card style={{ marginBottom: 12 }}>
              <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>By supplier</Text>
              {statement.map((item, i) => (
                <View
                  key={`${item.supplier}-${item.cur}-${i}`}
                  style={{ paddingVertical: 7, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>{item.supplier}</Text>
                    <Badge label={item.cur === 'eu' ? 'EUR' : 'USD'} tone="neutral" />
                  </View>
                  <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
                    {wt(item.poWeight)} contracted · {wt(item.shippedWeight)} shipped · {wt(item.remaining)} remaining MT
                  </Text>
                </View>
              ))}
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyMedium" numberOfLines={2}>{item.description}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                    {[item.order, item.supplierName, (item.date || '').substring(0, 10)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Badge label={item.statusLabel || '—'} tone={statusTone(item.statusKey)} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <View><Text variant="caption" tone="faint">Quantity</Text><Text variant="bodyMedium">{wt(item.poWeight)}</Text></View>
                <View><Text variant="caption" tone="faint">Shipped</Text><Text variant="bodyMedium" tone="positive">{wt(item.shippedWeight)}</Text></View>
                {/* Web prints the MAGNITUDE and conveys an over-ship by colour only
                    (page.js:661-663), so a negative remaining showed as "-12.000" on
                    mobile where web shows "12.000" in red. */}
                <View><Text variant="caption" tone="faint">Remaining</Text><Text variant="bodyMedium" tone={item.remaining < -0.0005 ? 'negative' : item.remaining > 0.01 ? 'warn' : 'positive'}>{wt(Math.abs(item.remaining))}</Text></View>
                <View><Text variant="caption" tone="faint">Received</Text><Text variant="bodyMedium">{wt(item.qntyReceived)}</Text></View>
              </View>

              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                {/* Statement lines show the RAW contract unit price, which is never
                    FX-converted — so this one keeps the contract's own currency. */}
                <Money label="Purchase value" v={item.unitPrc} cur={item.cur} />
                {item.consignees.length > 0 && <Meta label="Consignee" v={item.consignees.join(', ')} />}
                {item.destinations.length > 0 && <Meta label="Destination" v={item.destinations.join(', ')} />}
                {item.invoiceNums.length > 0 && <Meta label="Invoices" v={item.invoiceNums.join(', ')} />}
                {item.salesPos.length > 0 && <Meta label="Sales PO" v={item.salesPos.join(', ')} />}
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

// One money row of the review card / totals strip.
function Money({
  label, v, cur, tone, strong,
}: {
  label: string;
  v: number;
  cur: string;
  tone?: 'positive' | 'negative' | 'warn';
  strong?: boolean;
}) {
  const { colors } = useTheme();
  const color =
    tone === 'positive' ? colors.positive : tone === 'negative' ? colors.negative : tone === 'warn' ? colors.warn : undefined;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text
        variant={strong ? 'bodyMedium' : 'body'}
        style={{ fontVariant: ['tabular-nums'], ...(color ? { color } : {}) }}
      >
        {curSymbol(cur)}{fmtMoney(v)}
      </Text>
    </View>
  );
}

// A label/value metadata line on a statement row.
function Meta({ label, v }: { label: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 3, gap: 12 }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="caption" style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>{v}</Text>
    </View>
  );
}
