import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Badge, SegmentedControl, EmptyState, SearchField } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { INCOTERMS, MODE_FILTERS } from '@/features/incoterms/data';
import { StackHeader } from '@/components/StackHeader';
import { matchesAllWords, searchWords } from '@shared/search';

function Responsibility({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const who = /^Seller/.test(value) ? 'seller' : /^Buyer/.test(value) ? 'buyer' : 'none';
  const color = who === 'seller' ? colors.primary : who === 'buyer' ? colors.warn : colors.text;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text variant="caption" tone="muted" style={{ flex: 1 }}>{label}</Text>
      <Text variant="caption" color={color} style={{ flex: 1.4, textAlign: 'right', fontFamily: 'PlusJakartaSans_500Medium' }}>
        {value}
      </Text>
    </View>
  );
}

export default function Incoterms() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'all' | 'any' | 'sea'>('all');

  const list = useMemo(() => {
    const words = searchWords(search);
    return INCOTERMS.filter((t) => {
      if (mode !== 'all' && t.mode !== mode) return false;
      return matchesAllWords([t.code, t.name, t.desc], words);
    });
  }, [search, mode]);

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <StackHeader title="Incoterms 2020" subtitle="Who pays, who carries the risk, where it transfers" />

      <SearchField value={search} onChangeText={setSearch} placeholder="Search term (FOB, CIF…)" autoCapitalize="characters" />

      <View style={{ marginTop: 12, marginBottom: 14 }}>
        <SegmentedControl value={mode} onChange={(v) => setMode(v as any)} options={MODE_FILTERS.map((m) => ({ value: m.key as any, label: m.label }))} />
      </View>

      {list.length === 0 ? (
        <EmptyState title="No matches" message="Try a different search or filter." />
      ) : (
        <View style={{ gap: 14 }}>
          {list.map((t) => (
            <Card key={t.code}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text variant="bodyMedium" color="#fff" style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}>{t.code}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="h3" numberOfLines={1}>{t.name}</Text>
                </View>
                <Badge label={t.mode === 'sea' ? 'Sea / inland' : 'Any mode'} tone={t.mode === 'sea' ? 'info' : 'positive'} />
              </View>
              <Text variant="caption" tone="muted" style={{ marginBottom: 10 }}>{t.desc}</Text>
              <Responsibility label="Risk transfers" value={t.risk} />
              <Responsibility label="Carriage" value={t.carriage} />
              <Responsibility label="Insurance" value={t.insurance} />
              <Responsibility label="Export clearance" value={t.exportC} />
              <Responsibility label="Import clearance" value={t.importC} />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
