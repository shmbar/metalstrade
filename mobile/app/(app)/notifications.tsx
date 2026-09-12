import { useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Card, Text, Button, SkeletonList, ErrorState, EmptyState, FadeInItem, StackHeader, IconButton } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useNotificationFeed, NotificationRow, Priority } from '@/features/push/useNotificationFeed';
import { PRIORITY_ORDER } from '@shared/notificationPriority';

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

const PRIORITY_LABEL: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

// Web routes an entity to its page (utils/notificationRouting.routeFor). The mobile
// route names differ, so the mapping is expressed here against expo-router paths
// while keeping the same entityType → destination decisions.
const routeForMobile = (entityType?: string, entityId?: string): string => {
  switch (entityType) {
    case 'contract':
      return entityId ? `/contracts/${entityId}` : '/contracts';
    case 'invoice':
      return entityId ? `/invoices/${entityId}` : '/invoices';
    case 'expense':
    case 'companyexpense':
      return '/expenses';
    case 'stock':
      return '/stocks';
    case 'settings':
      return '/settings';
    default:
      return '/activity';
  }
};

const SNOOZE_OPTIONS = [
  { label: '1h', ms: 60 * 60 * 1000 },
  { label: '1d', ms: 24 * 60 * 60 * 1000 },
  { label: '1w', ms: 7 * 24 * 60 * 60 * 1000 },
];

export default function Notifications() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    notifications, unread, unreadCount, priorityOf, isUnread,
    readOne, readMany, snooze, isLoading, isError, error, refetch,
  } = useNotificationFeed();

  // WhatsApp-style select mode (web: notification bell selection + bulk read).
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, true>>({});
  const selectedIds = useMemo(() => Object.keys(selected), [selected]);
  const [snoozeFor, setSnoozeFor] = useState<string | null>(null);

  // Priority tone drawn from the app theme (web uses CSS vars, which RN can't parse).
  const toneFor = (p: Priority) =>
    p === 'high' ? colors.negative : p === 'medium' ? colors.warn : colors.textFaint;

  const exitSelect = () => { setSelectMode(false); setSelected({}); };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });

  // Grouped High → Medium → Low, matching the web bell's grouping. Rows inside a
  // group keep the feed order (already priority-then-newest from the hook).
  const sections = useMemo(() => {
    const byPriority: Record<string, NotificationRow[]> = {};
    notifications.forEach((n) => {
      const p = priorityOf(n);
      (byPriority[p] ||= []).push(n);
    });
    return PRIORITY_ORDER
      .filter((p) => byPriority[p]?.length)
      .map((p) => ({ priority: p as Priority, rows: byPriority[p] }));
  }, [notifications, priorityOf]);

  // Flatten into a single virtualized list with inline group headers.
  type Item = { kind: 'header'; priority: Priority; count: number } | { kind: 'row'; row: NotificationRow };
  const items: Item[] = useMemo(
    () => sections.flatMap((s) => [
      { kind: 'header' as const, priority: s.priority, count: s.rows.length },
      ...s.rows.map((row) => ({ kind: 'row' as const, row })),
    ]),
    [sections]
  );

  const onRowPress = (n: NotificationRow) => {
    if (selectMode) { toggleSelect(n.id); return; }
    if (isUnread(n)) readOne.mutate(n.id);
    router.push(routeForMobile(n.entityType, n.entityId) as any);
  };

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      {/* In select mode the back control cancels the selection instead of leaving
          the screen — the same header, one role swapped, so the row never jumps. */}
      <StackHeader
        title={selectMode ? `${selectedIds.length} selected` : 'Notifications'}
        subtitle={selectMode ? 'Tap rows to select' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        backLabel={selectMode ? 'Cancel selection' : 'Back'}
        onBack={selectMode ? exitSelect : undefined}
        right={
          notifications.length > 0 ? (
            <IconButton
              icon={selectMode ? 'close' : 'checkmark-circle-outline'}
              accessibilityLabel={selectMode ? 'Cancel selection' : 'Select notifications'}
              onPress={() => (selectMode ? exitSelect() : setSelectMode(true))}
            />
          ) : undefined
        }
      />

      {selectMode ? (
        <Button
          title={`Mark ${selectedIds.length || ''} read`.replace('  ', ' ')}
          variant="primary"
          loading={readMany.isPending}
          disabled={!selectedIds.length}
          onPress={() => readMany.mutate(selectedIds, { onSuccess: exitSelect })}
          style={{ marginBottom: 12 }}
        />
      ) : unreadCount > 0 ? (
        <Button
          title={`Mark all read (${unreadCount})`}
          variant="secondary"
          loading={readMany.isPending}
          onPress={() => readMany.mutate(unread.map((n) => n.id))}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message || 'Failed to load.'} onRetry={refetch} />
      ) : !items.length ? (
        <EmptyState
          title="All caught up"
          message="No notifications."
          icon={<Ionicons name="notifications-off-outline" size={40} color={colors.textFaint} />}
        />
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={items}
          keyExtractor={(it, i) => (it.kind === 'header' ? `h:${it.priority}` : it.row.id || String(i))}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item, index }) => {
            if (item.kind === 'header') {
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: toneFor(item.priority) }} />
                  <Text variant="caption" tone="muted">
                    {PRIORITY_LABEL[item.priority].toUpperCase()} · {item.count}
                  </Text>
                </View>
              );
            }
            const n = item.row;
            const unreadRow = isUnread(n);
            const p = priorityOf(n);
            const accent = toneFor(p);
            const isSelected = !!selected[n.id];
            return (
              <FadeInItem index={index}>
              <View>
                <Card
                  style={{
                    marginBottom: 10,
                    flexDirection: 'row',
                    gap: 12,
                    opacity: unreadRow ? 1 : 0.6,
                    borderColor: isSelected ? colors.primary : undefined,
                    borderWidth: isSelected ? 1.5 : undefined,
                  }}
                  onPress={() => onRowPress(n)}
                  onLongPress={() => { setSelectMode(true); toggleSelect(n.id); }}
                >
                  <View style={{ width: 8, alignItems: 'center', paddingTop: 4 }}>
                    {selectMode ? (
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={isSelected ? colors.primary : colors.textFaint}
                      />
                    ) : (
                      <View
                        style={{
                          width: 8, height: 8, borderRadius: 4,
                          backgroundColor: unreadRow ? accent : 'transparent',
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="bodyMedium" numberOfLines={3}>{n.message || n.type}</Text>
                    <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
                      {n.actorName || 'System'} · {relativeTime(n.createdAtMs)}
                    </Text>
                  </View>
                  {!selectMode && (
                    <Pressable
                      onPress={() => setSnoozeFor(snoozeFor === n.id ? null : n.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Snooze notification"
                      style={{ paddingLeft: 4, justifyContent: 'center' }}
                    >
                      <Ionicons name="time-outline" size={18} color={colors.textFaint} />
                    </Pressable>
                  )}
                </Card>
                {snoozeFor === n.id && !selectMode && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: -4, marginBottom: 12, paddingLeft: 20 }}>
                    <Text variant="caption" tone="muted" style={{ alignSelf: 'center' }}>Snooze</Text>
                    {SNOOZE_OPTIONS.map((o) => (
                      <Pressable
                        key={o.label}
                        onPress={() => { snooze.mutate({ id: n.id, ms: o.ms }); setSnoozeFor(null); }}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                          backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
                        }}
                      >
                        <Text variant="caption" tone="primary">{o.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
              </FadeInItem>
            );
          }}
        />
      )}
    </Screen>
  );
}
