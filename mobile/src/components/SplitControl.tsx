// Reusable IMS/GIS split control for a single expense / company-expense / invoice row.
// Port of the web components/SplitControl.js, using the SAME verbatim splitUtils math
// and the SAME idempotent notification lifecycle:
//   none    → "Put under control" (flags the row, raises a standing notification)
//   pending → amber "Pending split" (tap → calculate) + remove
//   done    → green "Split r/r" (tap → edit / reopen)
// Persistence is delegated to the caller via onPersist so each screen keeps its own
// Firestore write path (expenses_/companyExpenses/invoices_), exactly like web.

import React, { useState } from 'react';
import { View, Pressable, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextField, Button } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { useAuth } from '@/store/auth';
import { ensureSplitNotification, clearSplitNotification } from '@/data/writes';
import { SPLIT_DEFAULT_RATIO, computeShares, curSymbol, splitStatusOf } from '@shared/splitUtils';

const fmt = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type SplitEntity = 'expense' | 'companyexpense' | 'invoice';

export interface SplitControlProps {
  row: any;
  entityType?: SplitEntity;
  entityLabel?: string;
  amount?: number;
  currency?: string;
  /** async (splitObjOrNull) => persist { split } on the row */
  onPersist: (split: Record<string, unknown> | null) => Promise<void>;
}

export function SplitControl({
  row,
  entityType = 'expense',
  entityLabel = '',
  amount = 0,
  currency = '',
  onPersist,
}: SplitControlProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uidCollection, currentUser } = useAuth();

  const status = splitStatusOf(row);
  const sym = curSymbol(currency);
  const existing = row?.split || {};

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ratio, setRatio] = useState<string>(String(existing.ratio ?? SPLIT_DEFAULT_RATIO));
  const [note, setNote] = useState<string>(existing.note || '');

  const notifPayload = {
    entityType, entityId: row?.id, entityLabel, amount, currency,
    actorUid: currentUser?.uid, actorName: currentUser?.name,
  };

  // none → pending (flag for splitting)
  const putUnderControl = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onPersist({
        status: 'pending',
        ratio: SPLIT_DEFAULT_RATIO,
        by: currentUser?.uid || '',
        byName: currentUser?.name || '',
        at: new Date().toISOString(),
      });
      await ensureSplitNotification(uidCollection as string, notifPayload);
    } finally {
      setBusy(false);
    }
  };

  // pending → none (unflag)
  const removeControl = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onPersist(null);
      await clearSplitNotification(uidCollection as string, entityType, row?.id);
    } finally {
      setBusy(false);
    }
  };

  // save calculated split → done (clears the standing notification)
  const saveSplit = async () => {
    if (busy) return;
    const r = Math.min(100, Math.max(0, Number(ratio) || 0));
    const { imsShare, gisShare } = computeShares(amount, r);
    setBusy(true);
    try {
      await onPersist({
        status: 'done', ratio: r, imsShare, gisShare,
        by: currentUser?.uid || '', byName: currentUser?.name || '',
        at: new Date().toISOString(), note: note.trim(),
      });
      await clearSplitNotification(uidCollection as string, entityType, row?.id);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  // done → pending (reopen) — re-raises the standing notification
  const reopen = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onPersist({ ...existing, status: 'pending', at: new Date().toISOString() });
      await ensureSplitNotification(uidCollection as string, notifPayload);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const openModal = () => {
    setRatio(String(existing.ratio ?? SPLIT_DEFAULT_RATIO));
    setNote(existing.note || '');
    setOpen(true);
  };

  const r = Math.min(100, Math.max(0, Number(ratio) || 0));
  const preview = computeShares(amount, r);

  const pill = (bg: string, border: string, fg: string, label: string, icon?: any, onPress?: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
        backgroundColor: bg, borderWidth: 1, borderColor: border, opacity: busy ? 0.5 : 1,
      }}
    >
      {icon && <Ionicons name={icon} size={11} color={fg} />}
      <Text variant="caption" color={fg}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {status === 'none' &&
        pill(colors.surfaceAlt, colors.border, colors.primary, 'Put under control', 'git-branch-outline', putUnderControl)}

      {status === 'pending' && (
        <>
          {pill(colors.surfaceAlt, colors.warn, colors.warn, 'Pending split', 'time-outline', openModal)}
          <Pressable onPress={removeControl} disabled={busy} hitSlop={8}>
            <Ionicons name="close" size={14} color={colors.warn} />
          </Pressable>
        </>
      )}

      {status === 'done' &&
        pill(
          colors.surfaceAlt, colors.positive, colors.positive,
          `Split ${existing.ratio ?? SPLIT_DEFAULT_RATIO}/${100 - (existing.ratio ?? SPLIT_DEFAULT_RATIO)}`,
          'checkmark-circle-outline', openModal
        )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setOpen(false)} />
        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
            paddingBottom: insets.bottom + spacing.lg,
            maxHeight: '85%',
          }}
        >
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <Text variant="h2">IMS / GIS split</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="body" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                {entityLabel || 'Item'}
              </Text>
              <Text variant="bodyMedium">{sym}{fmt(amount)}</Text>
            </View>

            <View>
              <Text variant="label" tone="muted" style={{ marginBottom: 6 }}>% to IMS</Text>
              <TextField
                value={ratio}
                onChangeText={(v) => setRatio(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />
              <Text variant="caption" tone="faint" style={{ marginTop: 4 }}>
                GIS gets {100 - r}%
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                {[50, 60, 70, 100].map((p) => {
                  const on = r === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setRatio(String(p))}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                        backgroundColor: on ? colors.primary : colors.surfaceAlt,
                        borderWidth: 1, borderColor: on ? colors.primary : colors.border,
                      }}
                    >
                      <Text variant="caption" color={on ? '#fff' : colors.textMuted}>{p}/{100 - p}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View
                style={{
                  flex: 1, alignItems: 'center', padding: 10, borderRadius: radius.lg,
                  backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
                }}
              >
                <Text variant="caption" tone="muted">IMS</Text>
                <Text variant="h3" style={{ marginTop: 2 }}>{sym}{fmt(preview.imsShare)}</Text>
              </View>
              <View
                style={{
                  flex: 1, alignItems: 'center', padding: 10, borderRadius: radius.lg,
                  backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
                }}
              >
                <Text variant="caption" tone="muted">GIS</Text>
                <Text variant="h3" tone="primary" style={{ marginTop: 2 }}>{sym}{fmt(preview.gisShare)}</Text>
              </View>
            </View>

            <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline />

            <Button title="Save split" loading={busy} onPress={saveSplit} />
            {status === 'done' && <Button title="Reopen" variant="secondary" onPress={reopen} />}
            <Button title="Cancel" variant="secondary" onPress={() => setOpen(false)} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
