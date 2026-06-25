import { useMemo } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { loadNotifications } from '@/data/firestore';
import { markNotificationRead, markAllNotificationsRead } from '@/data/writes';

const SEV_TONE: Record<string, string> = { warning: '#f59e0b', error: '#dc2626', info: '#2563eb' };

const relativeTime = (ms?: number) => {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function Notifications() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uidCollection, currentUser } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    enabled: !!uidCollection,
    queryKey: ['notifications', uidCollection],
    queryFn: () => loadNotifications(uidCollection as string),
  });

  const isUnread = (n: any) => !(n.readBy || []).includes(currentUser.uid);
  const unreadIds = useMemo(() => (data || []).filter(isUnread).map((n) => n.id), [data]);

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(uidCollection as string, id, currentUser.uid, currentUser.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(uidCollection as string, unreadIds, currentUser.uid, currentUser.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <Screen scroll={false} contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {unreadIds.length > 0 && (
        <Button title={`Mark all read (${unreadIds.length})`} variant="secondary" loading={readAll.isPending} onPress={() => readAll.mutate()} style={{ marginBottom: 12 }} />
      )}

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="All caught up" message="No notifications." icon={<Ionicons name="notifications-off-outline" size={40} color={colors.textFaint} />} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n, i) => n.id || String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => {
            const unread = isUnread(item);
            const accent = SEV_TONE[item.severity] || colors.primary;
            return (
              <Card style={{ marginBottom: 10, flexDirection: 'row', gap: 12, opacity: unread ? 1 : 0.6 }} onPress={() => unread && readOne.mutate(item.id)}>
                <View style={{ width: 8, alignItems: 'center', paddingTop: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: unread ? accent : 'transparent' }} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="bodyMedium" numberOfLines={3}>{item.message || item.type}</Text>
                  <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
                    {item.actorName || 'System'} · {relativeTime(item.createdAtMs)}
                  </Text>
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
