import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, Switch, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Screen,
  Card,
  Text,
  TextField,
  Select,
  DateField,
  Button,
  SectionHeader,
} from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useContracts } from '@/features/contracts/useContracts';
import { useSaveContract, useDeleteContract } from '@/features/contracts/useSaveContract';
import { ProductsEditor } from '@/features/contracts/ProductsEditor';
import {
  SELECT_FIELDS,
  optionsFor,
  blankContract,
  buildAutoOrder,
  validateContract,
  hasErrors,
} from '@/features/contracts/form';
import { pickAndExtractContract, scanAndExtractContract, extractFromUri } from '@/features/contracts/docImport';
import { hapticSuccess } from '@/lib/haptics';
import { apiConfigured } from '@/lib/api';
import { Contract, Product } from '@/data/types';
import { spacing } from '@/theme/tokens';

const fieldByKey = Object.fromEntries(SELECT_FIELDS.map((f) => [f.key, f]));
const autoOrderPattern = /^\d{6}-\d+-\w*$/;

export default function ContractEdit() {
  const { id, importUri } = useLocalSearchParams<{ id?: string; importUri?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { data: contracts } = useContracts();
  const save = useSaveContract();
  const del = useDeleteContract();

  const existing = useMemo(() => (id ? contracts?.find((c) => c.id === id) : undefined), [contracts, id]);
  const isNew = !existing;

  const [value, setValue] = useState<Contract>(() =>
    existing
      ? { ...existing }
      : { ...blankContract(), order: buildAutoOrder(contracts || [], null) }
  );
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [customTerms, setCustomTerms] = useState<boolean>(!!existing?.isTermPmntText);

  // After the first save attempt, re-validate on every change so error marks
  // clear the moment a field is filled (inline validation).
  const set = (patch: Partial<Contract>) =>
    setValue((v) => {
      const next = { ...v, ...patch };
      if (submitted) setErrors(validateContract(next));
      return next;
    });
  const [importing, setImporting] = useState(false);

  // A PDF shared into the app ("Open in IMS") arrives as importUri — run the
  // same AI autofill on it once the form and settings are ready.
  const importedRef = useRef(false);
  useEffect(() => {
    if (importUri && isNew && apiConfigured() && !importedRef.current && settings?.Supplier) {
      importedRef.current = true;
      autofill('uri', String(importUri));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importUri, settings?.Supplier]);

  // Autofill the form from a supplier proforma — PDF file, camera photo, or a
  // file handed to the app (all go through the web document-reader).
  const autofill = async (source: 'pdf' | 'camera' | 'uri' = 'pdf', uri?: string) => {
    setImporting(true);
    try {
      const res =
        source === 'camera' ? await scanAndExtractContract(settings)
        : source === 'uri' && uri ? await extractFromUri(uri, settings)
        : await pickAndExtractContract(settings);
      if (!res) return;
      const f = res.fields || {};
      if (f.date) f.dateRange = { startDate: f.date, endDate: f.date };
      setValue((v) => ({ ...v, ...f }));
      Alert.alert(
        res.appliedLabels.length ? 'Applied from document' : 'Nothing matched',
        res.appliedLabels.length ? `Filled: ${res.appliedLabels.join(', ')}. Review, then Save.` : 'No fields could be extracted — fill them manually.'
      );
    } catch (e: any) {
      Alert.alert('Autofill failed', e?.message || 'Could not read the document.');
    } finally {
      setImporting(false);
    }
  };

  // Supplier change also refreshes the auto-order supplier code (web parity).
  const onSupplierChange = (supplierId: string) => {
    setValue((prev) => {
      const updated: Contract = { ...prev, supplier: supplierId };
      if (autoOrderPattern.test(prev.order || '')) {
        const sup = settings?.Supplier?.Supplier?.find((s: any) => s.id === supplierId);
        const prefix = (prev.order || '').replace(/-[^-]*$/, '');
        const supCode = sup ? String(sup.supplier || sup.nname || '').substring(0, 3).toUpperCase() : '';
        updated.order = `${prefix}-${supCode}`;
      }
      if (submitted) setErrors(validateContract(updated));
      return updated;
    });
  };

  const onSave = async () => {
    setSubmitted(true);
    const errs = validateContract(value);
    setErrors(errs);
    if (hasErrors(errs)) return; // sticky bar shows what's missing inline

    try {
      const res = await save.mutateAsync({ value, existing });
      hapticSuccess();
      router.replace(`/(app)/contracts/${res.contract.id}`);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save the contract.');
    }
  };

  const onDelete = () => {
    Alert.alert('Delete contract?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await del.mutateAsync(value);
          if (!res.ok) {
            Alert.alert('Cannot delete', res.reason || 'Contract is in use.');
            return;
          }
          router.replace('/(app)/contracts');
        },
      },
    ]);
  };

  const renderSelect = (key: string, onChange?: (v: string) => void) => {
    const cfg = fieldByKey[key];
    return (
      <Select
        label={cfg.label}
        required={cfg.required}
        value={String((value as any)[key] || '')}
        options={optionsFor(settings, cfg.categoryKey, String(cfg.key))}
        onChange={onChange || ((v) => set({ [key]: v } as Partial<Contract>))}
        error={errors[key] ? 'Required' : undefined}
      />
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
            <Text variant="bodyMedium" tone="primary">
              Cancel
            </Text>
          </Pressable>
          <Text variant="h3">{isNew ? 'New Contract' : 'Edit Contract'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={{ gap: 14 }}>
          {isNew && apiConfigured() && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Autofill from PDF"
                  variant="secondary"
                  loading={importing}
                  leftIcon={<Ionicons name="sparkles" size={18} color={colors.primary} />}
                  onPress={() => autofill('pdf')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Scan with camera"
                  variant="secondary"
                  loading={importing}
                  leftIcon={<Ionicons name="camera-outline" size={18} color={colors.primary} />}
                  onPress={() => autofill('camera')}
                />
              </View>
            </View>
          )}

          {/* Identity */}
          <Card style={{ gap: 14 }}>
            {renderSelect('supplier', onSupplierChange)}
            <TextField
              label="PO Number *"
              value={value.order}
              onChangeText={(t) => set({ order: t })}
              placeholder="ddmmyy-N-SUP"
              autoCapitalize="characters"
              error={errors.order ? 'Required' : undefined}
            />
            <DateField
              label="Date"
              required
              value={value.dateRange?.startDate}
              onChange={(iso) => set({ dateRange: { startDate: iso, endDate: iso }, date: iso })}
              error={errors.date ? 'Required' : undefined}
            />
          </Card>

          {/* Currency / quantity */}
          <Card style={{ gap: 14 }}>
            {renderSelect('cur')}
            {renderSelect('qTypeTable')}
          </Card>

          {/* Shipment block */}
          <Card style={{ gap: 14 }}>
            <SectionHeader title="Shipment" />
            {renderSelect('shpType')}
            {renderSelect('origin')}
            {renderSelect('delTerm')}
            {renderSelect('pol')}
            {renderSelect('pod')}
            {renderSelect('packing')}
            {renderSelect('contType')}
            {renderSelect('size')}
            {renderSelect('deltime')}
          </Card>

          {/* Payment terms — select or custom text */}
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="label" tone="muted">
                Payment Terms
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="caption" tone="faint">
                  Custom text
                </Text>
                <Switch
                  value={customTerms}
                  onValueChange={(on) => {
                    setCustomTerms(on);
                    set({ isTermPmntText: on, termPmnt: '' });
                  }}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            </View>
            {customTerms ? (
              <TextField
                value={String(value.termPmnt || '')}
                onChangeText={(t) => set({ termPmnt: t })}
                placeholder="Type your payment terms…"
                multiline
                numberOfLines={3}
                style={{ minHeight: 64, textAlignVertical: 'top' }}
              />
            ) : (
              <Select
                value={String(value.termPmnt || '')}
                options={optionsFor(settings, 'Payment Terms', 'termPmnt')}
                onChange={(v) => set({ termPmnt: v })}
              />
            )}
          </Card>

          {/* Products */}
          <ProductsEditor
            products={(value.productsData as Product[]) || []}
            currency={value.cur || ''}
            onChange={(productsData) => set({ productsData })}
          />

          {/* Comments + completed */}
          <Card style={{ gap: 12 }}>
            <TextField
              label="Comments"
              value={String(value.comments || '')}
              onChangeText={(t) => set({ comments: t })}
              placeholder="Internal notes…"
              multiline
              numberOfLines={4}
              style={{ minHeight: 84, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="body">Contract completed</Text>
              <Switch
                value={!!value.completed}
                onValueChange={(on) => set({ completed: on })}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </Card>

          {/* Secondary actions (primary Save lives in the sticky bar below) */}
          {!isNew && (
            <Button
              title="Delete contract"
              variant="ghost"
              loading={del.isPending}
              leftIcon={<Ionicons name="trash-outline" size={18} color={colors.negative} />}
              onPress={onDelete}
              style={{ borderColor: colors.negative }}
            />
          )}
          <Text variant="caption" tone="faint" style={{ textAlign: 'center', marginTop: 4 }}>
            Saves to Firestore (contracts_{(value.dateRange?.startDate || '').substring(0, 4) || 'YYYY'}) — same data as the web CRM.
          </Text>
        </View>
      </Screen>

      {/* Sticky save bar — always reachable, shows what's missing after a save attempt */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.bgElevated,
          paddingHorizontal: spacing.lg,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
          gap: 8,
        }}
      >
        {submitted && hasErrors(errors) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="alert-circle" size={15} color={colors.negative} />
            <Text variant="caption" tone="negative">
              {Object.values(errors).filter(Boolean).length} required field
              {Object.values(errors).filter(Boolean).length === 1 ? '' : 's'} missing — marked in red above
            </Text>
          </View>
        )}
        <Button title={isNew ? 'Create contract' : 'Save changes'} loading={save.isPending} onPress={onSave} />
      </View>
    </KeyboardAvoidingView>
  );
}
