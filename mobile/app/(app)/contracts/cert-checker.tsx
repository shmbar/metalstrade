import { useMemo, useState } from 'react';
import { View, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Button, SectionHeader, Badge, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useContracts } from '@/features/contracts/useContracts';
import { updateContractField } from '@/data/writes';
import { apiConfigured, postJson } from '@/lib/api';
import { radius } from '@/theme/tokens';

interface SpecRow { element: string; min: string; max: string; tolerance: string }
interface ResultRow { element: string; spec: string; actual: number | null; pass: boolean; reason: string }

export default function CertChecker() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uidCollection } = useAuth();
  const { data: contracts } = useContracts();

  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);

  const [spec, setSpec] = useState<SpecRow[]>(() =>
    Array.isArray((contract as any)?.certSpec) ? (contract as any).certSpec.map((s: any) => ({ element: s.element || '', min: String(s.min ?? ''), max: String(s.max ?? ''), tolerance: String(s.tolerance ?? '') })) : []
  );
  const [el, setEl] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [tol, setTol] = useState('');
  const [savingSpec, setSavingSpec] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ certificateNumber?: string; material?: string; results: ResultRow[] } | null>(null);

  const materialContext = (Array.isArray(contract?.productsData) ? contract!.productsData : [])
    .map((p: any) => p.description).filter(Boolean).join(' / ');

  if (!contract) {
    return (
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        <Back />
        <EmptyState title="Contract not found" message="Open it from the contracts list." />
      </Screen>
    );
  }

  const addElement = () => {
    if (!el.trim()) return;
    setSpec((p) => [...p, { element: el.trim().toUpperCase(), min, max, tolerance: tol }]);
    setEl(''); setMin(''); setMax(''); setTol('');
  };
  const removeElement = (i: number) => setSpec((p) => p.filter((_, k) => k !== i));

  const saveSpec = async () => {
    if (!uidCollection) return;
    setSavingSpec(true);
    try {
      const clean = spec.filter((s) => s.element && (s.min !== '' || s.max !== ''));
      await updateContractField(uidCollection, contract.id, (contract.date as string) || '', { certSpec: clean });
      Alert.alert('Saved', 'Specification saved to this contract.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save spec.');
    } finally {
      setSavingSpec(false);
    }
  };

  const pickAndAnalyze = async () => {
    const clean = spec.filter((s) => s.element && (s.min !== '' || s.max !== ''));
    if (clean.length === 0) { Alert.alert('Add a spec', 'Add at least one element with a min or max first.'); return; }
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setAnalyzing(true);
    setResult(null);
    try {
      const fileBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const data = await postJson<any>('/api/ai/cert-checker', {
        fileBase64,
        mimeType: asset.mimeType || 'application/pdf',
        contractSpec: clean,
        materialContext: materialContext || undefined,
      });
      setResult(data);
    } catch (e: any) {
      Alert.alert('Analysis failed', e?.message || 'Could not analyze the certificate.');
    } finally {
      setAnalyzing(false);
    }
  };

  const passCount = result?.results.filter((r) => r.pass).length || 0;
  const allPass = result ? passCount === result.results.length : false;

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Back />
        <Text variant="h2" style={{ flex: 1 }}>Cert Checker</Text>
      </View>
      <Text variant="caption" tone="muted" style={{ marginBottom: 14 }}>
        {contract.order || 'PO'}{materialContext ? ` · ${materialContext}` : ''}
      </Text>

      {/* Spec editor */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHeader title="Required composition" subtitle="Element min / max / tolerance (%)" />
        {spec.length === 0 ? (
          <Text variant="body" tone="muted" style={{ marginBottom: 8 }}>No elements yet — add the contract spec below.</Text>
        ) : (
          spec.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
              <Badge label={s.element} tone="info" />
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                {s.min !== '' ? `min ${s.min}` : ''}{s.min !== '' && s.max !== '' ? ' · ' : ''}{s.max !== '' ? `max ${s.max}` : ''}{s.tolerance ? ` · ±${s.tolerance}` : ''}
              </Text>
              <Pressable onPress={() => removeElement(i)} hitSlop={8}><Ionicons name="trash-outline" size={18} color={colors.negative} /></Pressable>
            </View>
          ))
        )}
        {/* Add row */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          <View style={{ flex: 1.2 }}><TextField value={el} onChangeText={setEl} placeholder="El" autoCapitalize="characters" /></View>
          <View style={{ flex: 1 }}><TextField value={min} onChangeText={setMin} placeholder="Min" keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><TextField value={max} onChangeText={setMax} placeholder="Max" keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><TextField value={tol} onChangeText={setTol} placeholder="±Tol" keyboardType="decimal-pad" /></View>
          <Pressable onPress={addElement} hitSlop={8} style={{ justifyContent: 'center' }}><Ionicons name="add-circle" size={28} color={colors.primary} /></Pressable>
        </View>
        <Button title="Save spec to contract" variant="ghost" loading={savingSpec} style={{ marginTop: 12 }} onPress={saveSpec} />
      </Card>

      {/* Analyze */}
      {apiConfigured() ? (
        <Button
          title={analyzing ? 'Analyzing certificate…' : 'Upload & check certificate'}
          loading={analyzing}
          leftIcon={<Ionicons name="cloud-upload-outline" size={18} color={colors.primaryText} />}
          onPress={pickAndAnalyze}
        />
      ) : (
        <Text variant="caption" tone="faint" style={{ textAlign: 'center' }}>Connect the backend to use the AI cert checker.</Text>
      )}

      {/* Results */}
      {result && (
        <Card style={{ marginTop: 14 }}>
          <SectionHeader
            title="Result"
            subtitle={`${passCount}/${result.results.length} elements within spec`}
            right={<Badge label={allPass ? 'PASS' : 'CHECK'} tone={allPass ? 'positive' : 'warn'} />}
          />
          {result.certificateNumber || result.material ? (
            <Text variant="caption" tone="muted" style={{ marginBottom: 8 }}>
              {[result.material, result.certificateNumber && `Cert ${result.certificateNumber}`].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {result.results.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
              <Ionicons name={r.pass ? 'checkmark-circle' : 'close-circle'} size={20} color={r.pass ? colors.positive : colors.negative} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyMedium">{r.element} <Text variant="caption" tone="faint">{r.spec}</Text></Text>
                <Text variant="caption" tone="muted" numberOfLines={2}>{r.reason}</Text>
              </View>
              <Text variant="bodyMedium" tone={r.pass ? 'positive' : 'negative'}>{r.actual ?? '—'}</Text>
            </View>
          ))}
        </Card>
      )}

      <View style={{ height: insets.bottom + 24 }} />
    </Screen>
  );
}

function Back() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">Back</Text>
    </Pressable>
  );
}
