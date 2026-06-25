import { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Badge, SegmentedControl, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { INCOTERMS, MODE_FILTERS } from '@/features/incoterms/data';

function Responsibility({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const who = /^Seller/.test(value) ? 'seller' : /^Buyer/.test(value) ? 'buyer' : 'none';
  const color = who === 'seller' ? colors.primary : who === 'buyer' ? colors.warn : colors.text;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text variant="caption" tone="muted" style={{ flex: 1 }}>{label}</Text>
      <Text variant="caption" color={color} style={{ flex: 1.4, textAlign: 'right', fontFamily: 'Poppins_500Medium' }}>
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
    const q = search.trim().toLowerCase();
    return INCOTERMS.filter((t) => {
      if (mode !== 'all' && t.mode !== mode) return false;
      if (!q) return true;
      return t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
    });
  }, [search, mode]);

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Incoterms 2020</Text>
          <Text variant="caption" tone="faint">Who pays, who carries the risk, where it transfers</Text>
        </View>
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Search term (FOB, CIF…)"
        autoCapitalize="characters"
        rightElement={<Ionicons name="search" size={18} color={colors.textFaint} />}
      />

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
                  <Text variant="bodyMedium" color="#fff" style={{ fontFamily: 'Poppins_700Bold' }}>{t.code}</Text>
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
