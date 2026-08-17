import { useMemo, useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, SegmentedControl, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { PeriodSelector } from '@/components/PeriodSelector';
import { useTheme } from '@/theme/ThemeProvider';
import { useInvoicesReview, PartyStatement } from '@/features/review/useInvoicesReview';
import { curSymbol, fmtMoney } from '@/lib/format';

/**
 * BALANCES — who owes what, on its own screen.
 *
 * Client feedback was "they need to see balance separate from invoices". The
 * figures already existed, but only inside Invoices Review's second tab and the
 * Cashflow page, both two taps deep under More — so in practice the answer to
 * "what are we owed?" meant reading an invoice list and adding up.
 *
 * This is the same data (useInvoicesReview, which is pinned to web's statement
 * rules by the parity suite) presented as the question the user actually asks.
 * Nothing is recomputed here: a second implementation of a money figure is how
 * the two apps drifted apart in the first place.
 *
 * Currencies are never summed together — that rule holds across this whole app,
 * because a $ and a € balance are different debts, not one number.
 */

type Side = 'clients' | 'suppliers';

export default function Balances() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { clients, suppliers, isLoading, isError, error, refetch } = useInvoicesReview();
  const [side, setSide] = useState<Side>('clients');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const list = side === 'clients' ? clients : suppliers;
    const q = search.trim().toLowerCase();
    const filtered = q ? list.filter((r) => r.name.toLowerCase().includes(q)) : list;
    // Biggest debt first — the reason you open this screen.
    return [...filtered].sort((a, b) => total(b) - total(a));
  }, [clients, suppliers, side, search]);

  // Per-currency totals across the VISIBLE rows, so they agree with the list.
  const totals = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => Object.entries(r.byCur).forEach(([c, v]) => (m[c] = (m[c] || 0) + v)));
    return Object.entries(m).filter(([, v]) => Math.abs(v) > 0.005);
  }, [rows]);

  const accent = side === 'clients' ? colors.positive : colors.negative;

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text variant="h2">Balances</Text>
        <PeriodSelector />
      </View>

      <View style={{ marginBottom: 12 }}>
        <SegmentedControl
          value={side}
          onChange={(v) => setSide(v as Side)}
          options={[
            { value: 'clients', label: 'Owed to us' },
            { value: 'suppliers', label: 'We owe' },
          ]}
        />
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder={side === 'clients' ? 'Search client…' : 'Search supplier…'}
        autoCapitalize="none"
        rightElement={
          search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          ) : (
            <Ionicons name="search" size={18} color={colors.textFaint} />
          )
        }
      />
      <View style={{ height: 12 }} />

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={search ? 'No matches' : 'Nothing outstanding'}
          message={
            search
              ? 'No one by that name has an open balance.'
              : side === 'clients'
                ? 'Every client invoice in this period is settled.'
                : 'Every supplier balance in this period is settled.'
          }
          icon={<Ionicons name="checkmark-circle-outline" size={40} color={colors.textFaint} />}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.name}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <Card style={{ marginBottom: 12 }}>
              <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>
                {side === 'clients' ? 'Total outstanding' : 'Total payable'} · {rows.length}{' '}
                {side === 'clients' ? 'client' : 'supplier'}
                {rows.length === 1 ? '' : 's'}
              </Text>
              {totals.length === 0 ? (
                <Text variant="bodyMedium" tone="muted">
                  —
                </Text>
              ) : (
                totals.map(([cur, v]) => (
                  <View
                    key={cur}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}
                  >
                    <Text variant="caption" tone="faint">
                      {cur === 'eu' ? 'EUR' : 'USD'}
                    </Text>
                    <Text variant="h3" style={{ color: accent, fontVariant: ['tabular-nums'] }}>
                      {curSymbol(cur)}
                      {fmtMoney(v)}
                    </Text>
                  </View>
                ))
              )}
            </Card>
          }
          renderItem={({ item }) => (
            <Card
              style={{ marginBottom: 10 }}
              /* Straight through to the invoices behind the number — the whole point
                 of splitting this out is that the balance is the entry point, not a
                 thing you derive after scrolling an invoice list. */
              onPress={
                side === 'clients'
                  ? () => router.push(`/(app)/invoices?client=${encodeURIComponent(item.name)}`)
                  : undefined
              }
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyMedium" numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {Object.entries(item.byCur)
                    .filter(([, v]) => Math.abs(v) > 0.005)
                    .map(([cur, v]) => (
                      <Text
                        key={cur}
                        variant="bodyMedium"
                        style={{
                          // A negative receivable is a credit — the client is in
                          // front, which is not the same story as a debt.
                          color: v < 0 ? colors.textMuted : accent,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {curSymbol(cur)}
                        {fmtMoney(v)}
                      </Text>
                    ))}
                </View>
                {side === 'clients' && <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const total = (p: PartyStatement) => Object.values(p.byCur).reduce((a, b) => a + b, 0);
