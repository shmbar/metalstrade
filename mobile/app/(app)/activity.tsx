import { useMemo, useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Screen,
  Card,
  Text,
  TextField,
  SegmentedControl,
  ProgressBar,
  SkeletonList,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { loadActivity, loadPresence, PRESENCE_ONLINE_MS } from '@/data/firestore';
import {
  activityLeaderboard,
  loginCounts,
  weeklyBreakdown,
  coverageFrom,
  splitPresence,
  LOGIN_TYPE,
  WEEK_MS,
} from '@shared/activityStats';
import { radius } from '@/theme/tokens';

/* Web's three tabs, same ids, same blurbs (activity/page.js:9-13). Each panel
   loads its own data, so a tab nobody opened never pulls the collection. */
const TABS = [
  { id: 'feed', label: 'Activity', blurb: 'Who did what, and when — across contracts, invoices, expenses and stock.' },
  { id: 'online', label: "Who's online", blurb: 'Who is signed in right now, and when everyone was last here.' },
  { id: 'summary', label: 'Summary', blurb: 'Most active users per week, their share of the work, and how often people sign in.' },
] as const;

type TabId = (typeof TABS)[number]['id'];

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
  const [tab, setTab] = useState<TabId>('feed');
  const active = TABS.find((t) => t.id === tab) || TABS[0];

  const feed = useQuery({
    enabled: !!uidCollection,
    queryKey: ['activity', uidCollection],
    queryFn: () => loadActivity(uidCollection as string, { max: 500 }),
  });

  // Only fetched when the tab is opened — presence is a separate collection.
  const presence = useQuery({
    enabled: !!uidCollection && tab === 'online',
    queryKey: ['presence', uidCollection],
    queryFn: () => loadPresence(uidCollection as string),
    refetchInterval: 60_000,
  });

  return (
    <Screen scroll={false} flush contentContainerStyle={{ paddingTop: insets.top + 8 }} edges={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text variant="bodyMedium" tone="primary">Back</Text>
        </Pressable>
        <Text variant="h2">Activity Log</Text>
        <View style={{ width: 56 }} />
      </View>

      {/* The blurb changes with the tab, as web's does — it is what tells the
          reader what they are looking at. */}
      <Text variant="caption" tone="muted" style={{ marginBottom: 10 }}>{active.blurb}</Text>

      <View style={{ marginBottom: 12 }}>
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as TabId)}
          options={TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </View>

      {tab === 'feed' && <FeedTab query={feed} />}
      {tab === 'online' && <OnlineTab query={presence} />}
      {tab === 'summary' && <SummaryTab query={feed} />}
    </Screen>
  );
}

// ── Activity ─────────────────────────────────────────────────────────────────
function FeedTab({ query }: { query: any }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [actor, setActor] = useState('all');
  const items: any[] = query.data || [];

  // web ActivityLog:80 — the actor list comes from the rows themselves.
  const actors = useMemo(() => [...new Set(items.map((i) => i.actorName).filter(Boolean))], [items]);
  const types = useMemo(() => [...new Set(items.map((i) => i.entityType).filter(Boolean))], [items]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (type !== 'all' && i.entityType !== type) return false;
      if (actor !== 'all' && i.actorName !== actor) return false;
      if (!needle) return true;
      return [i.message, i.entityLabel, i.actorName, i.action]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(needle));
    });
  }, [items, q, type, actor]);

  if (query.isLoading) return <SkeletonList />;
  if (query.isError) return <ErrorState message={(query.error as Error)?.message || 'Failed to load.'} onRetry={query.refetch} />;

  return (
    <>
      <TextField
        value={q}
        onChangeText={setQ}
        placeholder="Search the feed…"
        autoCapitalize="none"
        rightElement={<Ionicons name="search" size={18} color={colors.textFaint} />}
      />
      <View style={{ height: 8 }} />
      <Chips label="Type" value={type} options={['all', ...types]} onChange={setType} />
      {actors.length > 1 && <Chips label="Who" value={actor} options={['all', ...actors]} onChange={setActor} />}

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing here"
          message={q || type !== 'all' || actor !== 'all' ? 'No entries match those filters.' : 'No activity recorded yet.'}
          icon={<Ionicons name="pulse-outline" size={40} color={colors.textFaint} />}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, i) => r.id || String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96, paddingTop: 8 }}
          onRefresh={query.refetch}
          refreshing={query.isLoading}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View
                  style={{
                    width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: colors.surfaceAlt,
                  }}
                >
                  <Ionicons name={ICON[item.entityType] || 'ellipse'} size={15} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="caption" numberOfLines={2}>{item.message || item.action || '—'}</Text>
                  <Text variant="caption" tone="faint" style={{ marginTop: 2 }} numberOfLines={1}>
                    {[item.actorName, relativeTime(item.createdAtMs)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </>
  );
}

// ── Who's online ─────────────────────────────────────────────────────────────
function OnlineTab({ query }: { query: any }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { online, away } = useMemo(
    () => splitPresence(query.data || [], { onlineMs: PRESENCE_ONLINE_MS }),
    [query.data]
  );

  if (query.isLoading) return <SkeletonList />;
  if (query.isError) return <ErrorState message={(query.error as Error)?.message || 'Failed to load.'} onRetry={query.refetch} />;

  const Row = ({ p, isOnline }: { p: any; isOnline: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
      <View
        style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: isOnline ? colors.positive : colors.textFaint,
        }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyMedium" numberOfLines={1}>{p.name || 'Unknown'}</Text>
        {!!p.email && <Text variant="caption" tone="faint" numberOfLines={1}>{p.email}</Text>}
      </View>
      <Text variant="caption" tone="muted">
        {/* An explicit sign-out zeroes the stamp, so there is no "last seen" to
            quote — saying "signed out" is honest where "55 years ago" is not. */}
        {isOnline ? 'online' : p.lastSeenMs ? relativeTime(p.lastSeenMs) : 'signed out'}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={[{ k: 'online' }, { k: 'away' }]}
      keyExtractor={(s) => s.k}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
      onRefresh={query.refetch}
      refreshing={query.isLoading}
      renderItem={({ item }) =>
        item.k === 'online' ? (
          <Card style={{ marginBottom: 12 }}>
            <Text variant="label" tone="muted" style={{ marginBottom: 4 }}>Here now · {online.length}</Text>
            {online.length === 0 ? (
              <Text variant="caption" tone="faint">Nobody is signed in right now.</Text>
            ) : (
              online.map((p: any) => <Row key={p.uid} p={p} isOnline />)
            )}
          </Card>
        ) : (
          <Card>
            <Text variant="label" tone="muted" style={{ marginBottom: 4 }}>Last here · {away.length}</Text>
            {away.length === 0 ? (
              <Text variant="caption" tone="faint">No one else has signed in yet.</Text>
            ) : (
              away.map((p: any) => <Row key={p.uid} p={p} isOnline={false} />)
            )}
          </Card>
        )
      }
    />
  );
}

// ── Summary ──────────────────────────────────────────────────────────────────
function SummaryTab({ query }: { query: any }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rows: any[] = query.data || [];

  const now = Date.now();
  const board = useMemo(() => activityLeaderboard(rows, { from: now - 4 * WEEK_MS, to: now }), [rows, now]);
  const logins = useMemo(() => loginCounts(rows, { from: now - 4 * WEEK_MS, to: now }), [rows, now]);
  const weeks = useMemo(() => weeklyBreakdown(rows, { weeks: 8, now }), [rows, now]);
  /* Login history only exists from the day sign-in logging shipped, so a count
     over an earlier window is a real zero rather than a bug. Say so instead of
     showing a confident 0 (activityStats.js header). */
  const loginSince = useMemo(() => coverageFrom(rows, LOGIN_TYPE), [rows]);

  if (query.isLoading) return <SkeletonList />;
  if (query.isError) return <ErrorState message={(query.error as Error)?.message || 'Failed to load.'} onRetry={query.refetch} />;

  const maxWeek = weeks.reduce((m: number, w: any) => Math.max(m, w.total), 0) || 1;

  return (
    <FlatList
      data={[{ k: 'board' }, { k: 'logins' }, { k: 'weeks' }]}
      keyExtractor={(s) => s.k}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
      onRefresh={query.refetch}
      refreshing={query.isLoading}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => {
        if (item.k === 'board') {
          return (
            <Card>
              <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>Most active users · last 4 weeks</Text>
              {board.length === 0 ? (
                <Text variant="caption" tone="faint">No activity in this window.</Text>
              ) : (
                board.map((u: any) => (
                  <View key={u.uid || u.name} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>{u.name}</Text>
                      <Text variant="caption" tone="muted">{u.count} · {Math.round(u.share * 100)}%</Text>
                    </View>
                    <ProgressBar pct={u.share * 100} color={colors.primary} height={6} />
                  </View>
                ))
              )}
            </Card>
          );
        }
        if (item.k === 'logins') {
          return (
            <Card>
              <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>Sign-ins · last 4 weeks</Text>
              {logins.length === 0 ? (
                <Text variant="caption" tone="faint">
                  {loginSince
                    ? 'No sign-ins recorded in this window.'
                    : 'Sign-in logging has not recorded anything yet, so this is empty rather than zero.'}
                </Text>
              ) : (
                logins.map((u: any) => (
                  <View key={u.uid || u.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>{u.name}</Text>
                    <Text variant="caption" tone="muted">{u.logins}</Text>
                  </View>
                ))
              )}
              {!!loginSince && (
                <Text variant="caption" tone="faint" style={{ marginTop: 6 }}>
                  Counted since {new Date(loginSince).toLocaleDateString()}
                </Text>
              )}
            </Card>
          );
        }
        return (
          <Card>
            <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>Week by week</Text>
            {weeks.map((w: any) => (
              <View key={w.weekStart} style={{ marginBottom: 7 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" tone="muted">{w.label}</Text>
                  <Text variant="caption">{w.total}</Text>
                </View>
                <ProgressBar pct={(w.total / maxWeek) * 100} color={colors.primary} height={6} />
              </View>
            ))}
          </Card>
        );
      }}
    />
  );
}

/** A horizontal filter row — 'all' plus whatever the rows themselves contain. */
function Chips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <Text variant="caption" tone="faint" style={{ width: 34 }}>{label}</Text>
      <FlatList
        horizontal
        data={options}
        keyExtractor={(o) => o}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const on = value === item;
          return (
            <Pressable
              onPress={() => onChange(item)}
              style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginRight: 6,
                backgroundColor: on ? colors.primary : colors.surfaceAlt,
                borderWidth: 1, borderColor: on ? colors.primary : colors.border,
              }}
            >
              <Text variant="caption" color={on ? '#FFFFFF' : colors.textMuted}>{item}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
