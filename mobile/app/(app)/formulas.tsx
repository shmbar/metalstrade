import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Button, SegmentedControl, Badge, SectionHeader, LoadingState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { loadDataSettings } from '@/data/firestore';
import { saveDataSettings } from '@/data/writes';
import {
  computeFenicr, computeStainless, computeSuperalloys,
  GENERAL_FIELDS, FENICR_FIELDS, STAINLESS_FIELDS, SUPERALLOYS_FIELDS, Field, FormulaTab,
} from '@/features/formulas/calc';

const money = (num: number, symbol = '$') => {
  if (!Number.isFinite(num)) return symbol + '0';
  const [a, b] = num.toFixed(2).split('.');
  return symbol + a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + b;
};

const TAB_FIELDS: Record<FormulaTab, Field[]> = {
  fenicr: FENICR_FIELDS,
  stainless: STAINLESS_FIELDS,
  supperalloys: SUPERALLOYS_FIELDS,
};
const GENERAL_FOR: Record<FormulaTab, Field[]> = {
  fenicr: GENERAL_FIELDS,
  stainless: GENERAL_FIELDS,
  supperalloys: GENERAL_FIELDS.filter((f) => ['nilme', 'mt', 'euroRate'].includes(f.key)),
};

function OutRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
      <Text variant="body" tone="muted">{label}</Text>
      <Text variant="bodyMedium" tone="primary">{value}</Text>
    </View>
  );
}

export default function Formulas() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uidCollection, userTitle } = useAuth();
  const [tab, setTab] = useState<FormulaTab>('fenicr');
  const [value, setValue] = useState<any>({ general: {} });
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    enabled: !!uidCollection && userTitle === 'Admin',
    queryKey: ['formulas', uidCollection],
    queryFn: () => loadDataSettings(uidCollection as string, 'formulasCalc'),
  });

  useEffect(() => {
    if (data && !seeded) {
      setValue(Object.keys(data).length ? data : { general: {} });
      setSeeded(true);
    }
  }, [data, seeded]);

  const out = useMemo(() => {
    if (tab === 'fenicr') return computeFenicr(value);
    if (tab === 'stainless') return computeStainless(value);
    return computeSuperalloys(value) as any;
  }, [tab, value]);

  const back = (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">Back</Text>
    </Pressable>
  );

  if (userTitle !== 'Admin') {
    return (
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        {back}
        <EmptyState title="Admin only" message="Formulas are restricted to Admin accounts." icon={<Ionicons name="lock-closed-outline" size={40} color={colors.textFaint} />} />
      </Screen>
    );
  }

  const setField = (field: Field, text: string) =>
    setValue((v: any) =>
      field.scope === 'general'
        ? { ...v, general: { ...(v.general || {}), [field.key]: text } }
        : { ...v, [tab]: { ...(v[tab] || {}), [field.key]: text } }
    );
  const get = (field: Field) => String((field.scope === 'general' ? value.general?.[field.key] : value[tab]?.[field.key]) ?? '');

  const onSave = async () => {
    setSaving(true);
    try {
      await saveDataSettings(uidCollection as string, 'formulasCalc', value);
      Alert.alert('Saved', 'Formula inputs saved.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {back}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="h2">Formulas</Text>
            <Badge label="Beta" tone="warn" />
          </View>
          <View style={{ width: 50 }} />
        </View>

        <View style={{ marginBottom: 14 }}>
          <SegmentedControl
            value={tab}
            onChange={(v) => setTab(v as FormulaTab)}
            options={[
              { value: 'fenicr', label: 'FeNiCr' },
              { value: 'stainless', label: 'Stainless' },
              { value: 'supperalloys', label: 'SuperAlloys' },
            ]}
          />
        </View>

        {isLoading && !seeded ? (
          <LoadingState />
        ) : (
          <View style={{ gap: 14 }}>
            {/* Outputs */}
            <Card style={{ backgroundColor: colors.primary }}>
              <Text variant="label" color="#ffffffcc">{tab === 'supperalloys' ? 'Cost' : 'Cost / Sales'} · Fe {out.fe?.toFixed(2)}%</Text>
              <Text variant="display" color="#fff" style={{ marginTop: 4 }}>{money(out.cost)}</Text>
              {tab !== 'supperalloys' ? (
                <>
                  <Text variant="caption" color="#ffffffcc" style={{ marginTop: 8 }}>Sales solids {money((out as any).sales)} · Turnings {money((out as any).salesTurnings)}</Text>
                  <Text variant="caption" color="#ffffffaa">Cost turnings {money((out as any).costTurnings)} · €{money((out as any).costEuro, '€').slice(1)}</Text>
                </>
              ) : (
                <Text variant="caption" color="#ffffffcc" style={{ marginTop: 8 }}>Price / € {money((out as any).costEuro, '€')}</Text>
              )}
            </Card>

            {/* General inputs */}
            <Card>
              <SectionHeader title="General" />
              {GENERAL_FOR[tab].map((f) => (
                <View key={f.key} style={{ marginBottom: 10 }}>
                  <TextField label={f.label} value={get(f)} onChangeText={(t) => setField(f, t)} keyboardType="decimal-pad" />
                </View>
              ))}
            </Card>

            {/* Tab inputs */}
            <Card>
              <SectionHeader title={tab === 'fenicr' ? 'FeNiCr' : tab === 'stainless' ? 'Stainless' : 'SuperAlloys'} subtitle="Composition % and prices" />
              {TAB_FIELDS[tab].map((f) => (
                <View key={f.key} style={{ marginBottom: 10 }}>
                  <TextField label={f.label} value={get(f)} onChangeText={(t) => setField(f, t)} keyboardType="decimal-pad" />
                </View>
              ))}
              <OutRow label="Fe (derived)" value={`${out.fe?.toFixed(2)}%`} />
            </Card>

            <Button title="Save" loading={saving} onPress={onSave} />
            <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>
              Beta — formulas transcribed from the web. Verify a known result against the web app before pricing.
            </Text>
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
