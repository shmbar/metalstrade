import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { loadNotifications } from '@/data/firestore';
import {
  markNotificationRead,
  markAllNotificationsRead,
  snoozeNotification,
} from '@/data/writes';
import { sortByPriority, priorityOf } from '@shared/notificationPriority';

export type Priority = 'high' | 'medium' | 'low';

export interface NotificationRow {
  id: string;
  type?: string;
  entityType?: string;
  entityId?: string;
  message?: string;
  severity?: string;
  actorName?: string;
  actorUid?: string;
  createdAtMs?: number;
  readBy?: string[];
  audience?: string[];
  snoozedBy?: Record<string, number>;
  priority?: Priority;
}

// Web parity (contexts/useNotificationContext.js): the visible feed is
//   1. addressed to me — a doc with an `audience` array that omits my uid is not mine
//   2. not currently snoozed by me — snoozedBy[uid] in the future hides it
//   3. ordered by priority (High → Medium → Low), then newest first
// Mobile previously applied NONE of these: it showed every doc in the account,
// including other people's notifications and ones the user had snoozed, ordered
// only by date. That made the mobile bell disagree with the web bell.
export function useNotificationFeed() {
  const { uidCollection, currentUser } = useAuth();
  const uid = currentUser.uid;
  const qc = useQueryClient();

  const query = useQuery({
    enabled: !!uidCollection,
    queryKey: ['notifications', uidCollection],
    queryFn: () => loadNotifications(uidCollection as string),
  });

  // Targeted snooze wake-up — one timer aimed at the EARLIEST snooze expiry among
  // my snoozed items, so a lapsed notification reappears on time (web does the
  // same with snoozeTick; a blanket interval would never change the memo deps).
  const [snoozeTick, setSnoozeTick] = useState(0);
  const all: NotificationRow[] = useMemo(() => query.data || [], [query.data]);

  useEffect(() => {
    const now = Date.now();
    const next = all.reduce((min, n) => {
      const until = n.snoozedBy?.[uid];
      return until && until > now ? Math.min(min, until) : min;
    }, Infinity);
    if (!Number.isFinite(next)) return;
    const t = setTimeout(() => setSnoozeTick((x) => x + 1), Math.max(250, next - now + 50));
    return () => clearTimeout(t);
  }, [all, uid, snoozeTick]);

  const notifications: NotificationRow[] = useMemo(() => {
    const now = Date.now();
    const mine = all.filter((n) => {
      if (Array.isArray(n.audience) && uid && !n.audience.includes(uid)) return false;
      const until = n.snoozedBy?.[uid];
      if (until && until > now) return false;
      return true;
    });
    return sortByPriority(mine);
    // snoozeTick re-evaluates the Date.now() comparison when a snooze lapses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, uid, snoozeTick]);

  const unread = useMemo(
    () => notifications.filter((n) => !(n.readBy || []).includes(uid)),
    [notifications, uid]
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] });

  const readOne = useMutation({
    mutationFn: (id: string) =>
      markNotificationRead(uidCollection as string, id, uid, currentUser.name),
    onSuccess: invalidate,
  });
  const readMany = useMutation({
    mutationFn: (ids: string[]) =>
      markAllNotificationsRead(uidCollection as string, ids, uid, currentUser.name),
    onSuccess: invalidate,
  });
  const snooze = useMutation({
    mutationFn: ({ id, ms }: { id: string; ms: number }) =>
      snoozeNotification(uidCollection as string, id, uid, Date.now() + ms),
    onSuccess: invalidate,
  });

  const isUnread = (n: NotificationRow) => !(n.readBy || []).includes(uid);

  return {
    notifications,
    unread,
    unreadCount: unread.length,
    priorityOf: (n: NotificationRow): Priority => priorityOf(n),
    isUnread,
    readOne,
    readMany,
    snooze,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
