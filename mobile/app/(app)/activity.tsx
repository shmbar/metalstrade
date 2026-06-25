import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { loadActivity } from '@/data/firestore';
import { radius } from '@/theme/tokens';

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  contract: 'document-text',
  invoice: 'receipt',
  expense: 'card',
  stock: 'cube',
  settings: 'settings',
};

const relativeTime = (ms?: number) => {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString();
};

export default function Activity() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uidCollection } = useAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    enabled: !!uidCollection,
    queryKey: ['activity', uidCollection],
    queryFn: () => loadActivity(uidCollection as string, { max: 200 }),
  });

  return (
    <Screen scroll={false} contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Activity Log</Text>
          <Text variant="caption" tone="faint">Who did what, and when</Text>
        </View>
      </View>

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load activity.'} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No activity yet"
          message="Contract, invoice, expense and stock changes will appear here."
          icon={<Ionicons name="time-outline" size={40} color={colors.textFaint} />}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r, i) => r.id || String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary + '1a',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={ICON[item.entityType] || 'ellipse'} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyMedium" numberOfLines={2}>
                  {item.message || `${item.entityLabel || item.entityType} ${item.action || ''}`.trim()}
                </Text>
                <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
                  {item.actorName || 'Unknown'} · {relativeTime(item.createdAtMs)}
                </Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
