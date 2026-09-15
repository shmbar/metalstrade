import React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Sheet, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { loadActivity } from '@/data/firestore';
import { spacing } from '@/theme/tokens';

const when = (ms?: number) => {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Everything that happened to one record, newest first — web's ActivityLog in its
 * scoped mode (entityType + entityId), opened from a contract or invoice. Loaded
 * only while the sheet is open.
 */
export function HistorySheet({
  visible,
  onClose,
  entityType,
  entityId,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  entityType: 'contract' | 'invoice';
  entityId: string;
  title: string;
}) {
  const { colors } = useTheme();
  const { uidCollection } = useAuth();
  const { data = [], isLoading, isError } = useQuery({
    enabled: visible && !!uidCollection && !!entityId,
    queryKey: ['activity', uidCollection, entityType, entityId],
    queryFn: () => loadActivity(uidCollection as string, { entityType, entityId, max: 500 }),
  });

  return (
    <Sheet visible={visible} onClose={onClose} title="History" subtitle={title}>
      {isLoading ? (
        <Text variant="body" tone="muted" style={{ paddingVertical: spacing.lg, textAlign: 'center' }}>
          Loading history…
        </Text>
      ) : isError ? (
        <Text variant="body" tone="negative" style={{ paddingVertical: spacing.lg, textAlign: 'center' }}>
          Couldn’t load the history.
        </Text>
      ) : data.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: 6 }}>
          <Ionicons name="time-outline" size={28} color={colors.textFaint} />
          <Text variant="body" tone="muted">Nothing recorded for this record yet.</Text>
        </View>
      ) : (
        <View style={{ paddingBottom: spacing.sm }}>
          {data.map((r: any, i: number) => (
            <View
              key={r.id || i}
              style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: colors.primary + '88' }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body">{r.message || r.action || '—'}</Text>
                <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
                  {[r.actorName, when(r.createdAtMs)].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}
