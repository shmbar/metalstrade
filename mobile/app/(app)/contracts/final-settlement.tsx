import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, Switch, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, TextField, Button, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useContracts } from '@/features/contracts/useContracts';
import {
  useSettlementLots,
  useSaveFinalSettlement,
  buildSettlementRows,
  buildPayload,
  recomputeTotal,
  SettlementBase,
} from '@/features/stocks/useFinalSettlement';
import { curSymbol, fmtMoney } from '@/lib/format';

export default function FinalSettlement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { data: contracts } = useContracts();
  const contract = useMemo(() => contracts?.find((c) => c.id === id), [contracts, id]);

  const { data: lots, isLoading, isError, error, refetch } = useSettlementLots(contract);
  const save = useSaveFinalSettlement();

  const built = useMemo(() => buildSettlementRows(lots || []), [lots]);
  const [working, setWorking] = useState<SettlementBase[]>([]);
  const [isDraft, setIsDraft] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Seed editable state once lots load.
  useEffect(() => {
    if (lots && !seeded) {
      setWorking(built.rows.map((r) => ({ ...r.working })));
      setIsDraft(built.isDraft);
      setSeeded(true);
    }
  }, [lots, seeded, built]);

  const sym = curSymbol(contract?.cur);
  const unitLabel =
    settings?.Quantity?.Quantity?.find((q: any) => q.id === contract?.qTypeTable)?.qTypeTable || 'MT';

  const update = (i: number, field: keyof SettlementBase, value: string) => {
    setWorking((prev) => {
      const next = [...prev];
      let row = { ...next[i], [field]: value };
      if (field === 'finalqnty' || field === 'unitPrcFinal') row = recomputeTotal(row);
      next[i] = row;
      return next;
    });
  };

  const onSave = async () => {
    if (!contract) return;
    try {
      const payload = buildPayload(built.rows, working, isDraft);
      await save.mutateAsync({ contract, payload });
      Alert.alert(
        isDraft ? 'Saved as draft' : 'Settlement applied',
        isDraft
          ? 'Held back — cashflow & stocks are unchanged until you turn Draft off and save.'
          : 'The final figures now apply to cashflow & stocks.'
      );
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save the settlement.');
    }
  };

  if (!contract) {
    return (
      <Screen>
        <Back />
        <EmptyState title="Contract not found" message="Open it from the contracts list." />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <Back />

      <View style={{ marginTop: 8, marginBottom: 14 }}>
        <Text variant="h1">Final Settlement</Text>
        <Text variant="body" tone="muted" style={{ marginTop: 2 }}>
          {contract.order}
        </Text>
      </View>

      {/* Draft toggle */}
      <Card style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text variant="bodyMedium">Draft mode</Text>
          <Text variant="caption" tone="muted">
            {isDraft
              ? 'Held back — won’t affect cashflow or stocks until turned off.'
              : 'Off — saving applies the settlement to cashflow & stocks.'}
          </Text>
        </View>
        <Switch value={isDraft} onValueChange={setIsDraft} trackColor={{ true: colors.warn }} />
      </Card>

      {isDraft && (
        <View
          style={{
            backgroundColor: colors.warn + '1a',
            borderColor: colors.warn,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <Text variant="caption" color={colors.warn} style={{ fontFamily: 'Inter_600SemiBold' }}>
            Draft mode — these figures are held back and won’t affect cashflow or stocks until you turn off Draft and save.
          </Text>
        </View>
      )}

      {isLoading ? (
        <LoadingState label="Loading lots…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load stock lots.'} onRetry={refetch} />
      ) : built.rows.length === 0 ? (
        <EmptyState
          title="No stock lots"
          message="This contract has no warehouse lots to settle."
          icon={<Ionicons name="cube-outline" size={40} color={colors.textFaint} />}
        />
      ) : (
        <View style={{ gap: 14 }}>
          {built.rows.map((r, i) => {
            const w = working[i];
            if (!w) return null;
            return (
              <Card key={r.lot.id} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="label" tone="muted">
                    Received {fmtMoney(parseFloat(r.lot.qnty) || 0)} {unitLabel}
                  </Text>
                  {r.lot.poInvoices?.[0]?.inv ? (
                    <Text variant="caption" tone="faint">
                      Inv #{r.lot.poInvoices[0].inv}
                    </Text>
                  ) : null}
                </View>

                <TextField
                  label="Description"
                  value={String(w.descriptionText ?? '')}
                  onChangeText={(t) => update(i, 'descriptionText', t)}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label={`Final Qty (${unitLabel})`}
                      value={String(w.finalqnty ?? '')}
                      onChangeText={(t) => update(i, 'finalqnty', t)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Advised Price"
                      value={String(w.unitPrc ?? '')}
                      onChangeText={(t) => update(i, 'unitPrc', t)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Received Price"
                      value={String(w.unitPrcFinal ?? '')}
                      onChangeText={(t) => update(i, 'unitPrcFinal', t)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 12 }}>
                    <Text variant="label" tone="muted">
                      Total
                    </Text>
                    <Text variant="h3" tone="primary">
                      {sym}
                      {fmtMoney(parseFloat(String(w.finaltotal)) || 0)}
                    </Text>
                  </View>
                </View>

                <TextField
                  label="Remarks"
                  value={String(w.remark ?? '')}
                  onChangeText={(t) => update(i, 'remark', t)}
                />
              </Card>
            );
          })}

          <Button
            title={isDraft ? 'Save draft' : 'Apply settlement'}
            loading={save.isPending}
            onPress={onSave}
          />
        </View>
      )}
    </Screen>
  );
}

function Back() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
      <Ionicons name="chevron-back" size={22} color={colors.primary} />
      <Text variant="bodyMedium" tone="primary">
        Back
      </Text>
    </Pressable>
  );
}
