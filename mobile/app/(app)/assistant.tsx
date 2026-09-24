import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, TextInput, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Pressable } from '@/components/ui/Pressable';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, EmptyState, StackHeader, KeyboardFooter, IconButton, Chip } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { streamAssistant, isAssistantConfigured, ChatMessage, AssistantSource, AssistantRanking } from '@/features/assistant/api';
import { useAssistantContext } from '@/features/assistant/useAssistantContext';
import { MAX_FONT_SCALE, radius, spacing, typography } from '@/theme/tokens';
import { keyboardScrollProps } from '@/lib/keyboard';
import { SERVICE_UNAVAILABLE } from '@/lib/api';

/*
 * The Assistant — web app/(root)/apps/Assistant/page.js, feature for feature: the header's
 * live-data line, Reload data and Clear chat; the empty state that says what is being
 * searched and offers six ways in by category; answers with bold / bullet formatting, a
 * ranking drawn as bars, the records behind them and follow-up questions; a thinking
 * indicator until the first words arrive; Send that becomes Stop while an answer streams;
 * and a conversation that survives leaving the screen, kept per workspace.
 */

interface UiMessage extends ChatMessage {
  id: string;
  time?: string;
  streaming?: boolean;
  isError?: boolean;
  /** citation chips from the final sources event */
  sources?: AssistantSource[];
  /** a ranking drawn as bars under the answer */
  ranking?: AssistantRanking | null;
  /** questions offered after the answer — tapping one sends it */
  followUps?: string[];
}

// web page.js SUGGESTIONS — grouped the way the business thinks about them.
const SUGGESTIONS = [
  { category: 'Receivables', text: 'Show overdue invoices' },
  { category: 'Receivables', text: 'Which client owes the most?' },
  { category: 'Costs', text: 'Show unpaid expenses' },
  { category: 'Performance', text: 'What is my profit this month?' },
  { category: 'Contracts', text: 'Contract status breakdown' },
  { category: 'Help', text: 'How do I create an invoice?' },
];

// web utils/aiClient.js — how much of the thread goes back to the model each turn.
const MAX_CHAT_HISTORY = 20;
const trimHistory = (messages: UiMessage[]): ChatMessage[] =>
  messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content && !m.isError)
    .slice(-MAX_CHAT_HISTORY)
    .map((m) => ({ role: m.role, content: m.content }));
// web chatStorageKey('assistant', uidCollection) — per workspace, so IMS never shows GIS's thread.
const storageKeyFor = (uid?: string | null) => `ims-chat:assistant:${uid || 'none'}`;

const timeLabel = (d = new Date()) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// The server's citation routes are WEB paths; map them to the mobile equivalents.
const sourceHref = (s: AssistantSource) =>
  s.type === 'invoice' ? (s.id ? `/(app)/invoices/${s.id}` : '/(app)/invoices')
  : s.type === 'contract' ? (s.id ? `/(app)/contracts/${s.id}` : '/(app)/contracts')
  : '/(app)/expenses';

const dLabel = (iso: string) => {
  const [y, m, d] = String(iso).split('-');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return y && m && d ? `${Number(d)} ${MON[Number(m) - 1]} ${y}` : iso;
};

/* web formatMessageContent — **bold**, a "• " bullet and a "1. " number in the brand colour,
   line breaks kept. Built as nested Text rather than HTML, so nothing in an answer can
   ever be interpreted as markup. */
function Formatted({ content, color }: { content: string; color: string }) {
  const { colors } = useTheme();
  const lines = content.split('\n');
  return (
    <Text variant="body" style={{ color, lineHeight: 22 }}>
      {lines.map((line, li) => {
        let rest = line;
        const parts: React.ReactNode[] = [];
        if (rest.startsWith('• ')) {
          parts.push(<Text key="b" style={{ color: colors.primary }}>• </Text>);
          rest = rest.slice(2);
        } else {
          const num = rest.match(/^(\d+)\. /);
          if (num) {
            parts.push(<Text key="n" variant="bodyMedium" style={{ color: colors.primary, lineHeight: 22 }}>{num[1]}. </Text>);
            rest = rest.slice(num[0].length);
          }
        }
        rest.split(/(\*\*.+?\*\*)/g).forEach((seg, si) => {
          if (!seg) return;
          const bold = seg.match(/^\*\*(.+)\*\*$/);
          parts.push(bold ? <Text key={si} variant="bodyStrong" color={color} style={{ lineHeight: 22 }}>{bold[1]}</Text> : <Text key={si} color={color} style={{ lineHeight: 22 }}>{seg}</Text>);
        });
        return (
          <Text key={li}>
            {parts}
            {li < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      })}
    </Text>
  );
}

/* web RankingBlock — the top row is the answer and alone takes the full brand colour;
   brand, not status colours, because nothing here is good or bad. On a phone each row
   stacks name + figure over a full-width bar, as web does below sm. */
function RankingBlock({ ranking }: { ranking: AssistantRanking }) {
  const { colors } = useTheme();
  const max = Math.max(...ranking.rows.map((r) => Number(r.value) || 0), 0);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 8 }}>
      <Text variant="overline" tone="faint">
        {ranking.title}
      </Text>
      {ranking.rows.map((r, i) => {
        const pct = max > 0 ? Math.max(2, Math.round(((Number(r.value) || 0) / max) * 100)) : 0;
        const top = i === 0;
        return (
          <View key={`${r.label}-${i}`} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text variant={top ? 'captionStrong' : 'caption'} numberOfLines={1} style={{ flex: 1, color: top ? colors.text : colors.textMuted }}>
                {r.label}
              </Text>
              <Text variant={top ? 'captionStrong' : 'captionMedium'} style={{ color: top ? colors.text : colors.textMuted }}>
                {r.display}
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: top ? colors.primary : colors.primary + '55' }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** web's "Thinking" bubble — three brand dots, staggered, until the first token. */
function ThinkingDot({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    y.set(withDelay(delay, withRepeat(withSequence(withTiming(-4, { duration: 280 }), withTiming(0, { duration: 280 })), -1)));
  }, [delay, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }, style]} />;
}

export default function Assistant() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const uidCollection = useAuth((s) => s.uidCollection);
  const configured = isAssistantConfigured();
  const { currentData, dateRange, isLoading: dataLoading, isFetching, syncedAt, counts, reload } = useAssistantContext();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);
  const storageKey = storageKeyFor(uidCollection);

  const scrollEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

  // The conversation survives leaving the screen (web keeps it in localStorage).
  useEffect(() => {
    if (!uidCollection) return;
    let live = true;
    AsyncStorage.getItem(storageKey)
      .then((saved) => {
        const parsed = saved ? JSON.parse(saved) : null;
        if (live) setMessages(Array.isArray(parsed) ? parsed.map((m: UiMessage) => ({ ...m, streaming: false })) : []);
      })
      .catch(() => live && setMessages([]));
    return () => {
      live = false;
    };
  }, [storageKey, uidCollection]);

  useEffect(() => {
    if (!uidCollection || !messages.length) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(messages.slice(-50))).catch(() => {});
  }, [messages, storageKey, uidCollection]);

  // Leaving mid-answer stops the request rather than streaming into nothing.
  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = loading || dataLoading;

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: UiMessage = { id: `user-${Date.now()}`, role: 'user', content, time: timeLabel() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollEnd();

    const msgId = `assistant-${Date.now()}`;
    const controller = new AbortController();
    abortRef.current = controller;
    let started = false;
    const patch = (fn: (m: UiMessage) => UiMessage) => {
      if (!started) {
        started = true;
        setMessages((prev) => [...prev, fn({ id: msgId, role: 'assistant', content: '', time: timeLabel(), streaming: true })]);
      } else {
        setMessages((prev) => prev.map((m) => (m.id === msgId ? fn(m) : m)));
      }
      scrollEnd();
    };

    try {
      await streamAssistant({
        messages: trimHistory([...messages, userMsg]),
        currentData,
        dateRange,
        signal: controller.signal,
        onText: (delta) => patch((m) => ({ ...m, content: m.content + delta })),
        onSources: (sources) => patch((m) => ({ ...m, sources })),
        onStructure: ({ ranking, followUps }) => patch((m) => ({ ...m, ranking, followUps })),
      });
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, streaming: false } : m)));
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        // Stopping on purpose is not an error: keep what streamed in, drop an empty bubble.
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, streaming: false } : m)).filter((m) => !(m.id === msgId && !m.content)));
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== msgId),
          { id: `error-${Date.now()}`, role: 'assistant', content: `I encountered an error: ${err?.message || 'Failed to get response'}. Please try again.`, time: timeLabel(), isError: true },
        ]);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      scrollEnd();
    }
  };

  const stop = () => abortRef.current?.abort();

  // web handleClearChat — and the stored copy goes too, so the thread does not return.
  const clearChat = () => {
    setMessages([]);
    AsyncStorage.removeItem(storageKey).catch(() => {});
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;
  const streamingNow = messages.some((m) => m.streaming);
  const n = (v: number) => Number(v || 0).toLocaleString('en-US');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <StackHeader
          title="Assistant"
          subtitle={dataLoading ? 'Loading your data…' : `Answers from your live data${syncedAt ? ` · synced ${timeLabel(new Date(syncedAt))}` : ''}`}
          right={
            configured ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconButton icon="refresh" accessibilityLabel="Reload data" disabled={isFetching} onPress={() => reload()} />
                {messages.length > 0 && <Chip label="Clear chat" onPress={clearChat} />}
              </View>
            ) : undefined
          }
        />
      </View>

      {!configured ? (
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            title="Assistant unavailable"
            message={SERVICE_UNAVAILABLE}
            icon={<Ionicons name="cloud-offline-outline" size={24} color={colors.textFaint} />}
          />
        </View>
      ) : (
        <>
          {messages.length === 0 ? (
            <ScrollView
        {...keyboardScrollProps}
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: 16 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ alignItems: 'center', gap: 8 }}>
                <View style={{ width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '1A' }}>
                  <Ionicons name="sparkles" size={20} color={colors.primary} />
                </View>
                <Text variant="h2" style={{ textAlign: 'center' }}>Ask about your trading data</Text>
                <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
                  {dataLoading
                    ? 'Loading your contracts, invoices, expenses and stock…'
                    : `Searching ${n(counts.contracts)} contracts · ${n(counts.invoices)} invoices · ${n(counts.expenses)} expenses in ${dLabel(dateRange.startDate || '')} – ${dLabel(dateRange.endDate || '')} · ${n(counts.stockLines)} stock lines on hand`}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s.text}
                    onPress={() => send(s.text)}
                    disabled={busy}
                    accessibilityRole="button"
                    style={{ width: '48.5%', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 9, gap: 4, opacity: busy ? 0.5 : 1 }}
                  >
                    <Text variant="overline" tone="faint">{s.category}</Text>
                    <Text variant="bodyStrong">{s.text}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : (
            <FlatList
        {...keyboardScrollProps}
              ref={listRef}
              style={{ flex: 1 }}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: spacing.lg, gap: 10 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollEnd}
              ListFooterComponent={
                loading && !streamingNow ? (
                  <View style={{ alignSelf: 'flex-start', marginTop: 10, borderRadius: 14, borderTopLeftRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', gap: 6 }} accessibilityLabel="Thinking">
                    <ThinkingDot delay={0} />
                    <ThinkingDot delay={150} />
                    <ThinkingDot delay={300} />
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                if (item.role === 'user') {
                  return (
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ maxWidth: '80%', borderRadius: 14, borderBottomRightRadius: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.primary + '1F' }}>
                        <Text variant="body">{item.content}</Text>
                      </View>
                    </View>
                  );
                }
                const fg = item.isError ? colors.negative : colors.text;
                return (
                  <View style={{ alignItems: 'flex-start', gap: 8 }}>
                    <View
                      style={{
                        alignSelf: 'stretch',
                        borderRadius: 14,
                        borderTopLeftRadius: 6,
                        borderWidth: 1,
                        borderColor: item.isError ? colors.negative + '40' : colors.border,
                        backgroundColor: item.isError ? colors.negative + '12' : colors.card,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        gap: 10,
                      }}
                    >
                      <Text>
                        <Formatted content={item.content} color={fg} />
                        {item.streaming ? <Text style={{ color: colors.primary }}> ▍</Text> : null}
                      </Text>

                      {!item.streaming && item.ranking && item.ranking.rows.length > 1 && <RankingBlock ranking={item.ranking} />}

                      {/* The records behind the figures — tap through to check them. */}
                      {!!item.sources?.length && (
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                          <Text variant="caption" tone="faint" style={{ marginRight: 2 }}>
                            Based on {item.sources.length} record{item.sources.length === 1 ? '' : 's'}
                          </Text>
                          {item.sources.slice(0, 8).map((s: AssistantSource, i: number) => (
                            <Pressable
                              key={`${s.type}:${s.id}:${i}`}
                              onPress={() => router.push(sourceHref(s) as any)}
                              accessibilityRole="button"
                              accessibilityLabel={`Open ${s.type} ${s.label}`}
                              style={{ height: 28, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card }}
                            >
                              <Text variant="captionStrong" numberOfLines={1} style={{ maxWidth: 160, color: colors.info }}>{s.label}</Text>
                            </Pressable>
                          ))}
                          {item.sources.length > 8 && <Text variant="caption" tone="faint">+{item.sources.length - 8} more</Text>}
                        </View>
                      )}
                    </View>

                    {/* Next questions, only under the latest answer. */}
                    {item.id === lastAssistantId && !item.streaming && !!item.followUps?.length && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 2 }}>
                        {item.followUps.map((q: string) => (
                          <Pressable
                            key={q}
                            onPress={() => send(q)}
                            disabled={busy}
                            accessibilityRole="button"
                            accessibilityLabel={`Ask: ${q}`}
                            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.primary + '55', backgroundColor: colors.card, opacity: busy ? 0.5 : 1 }}
                          >
                            <Text variant="captionStrong" style={{ color: colors.info }}>{q}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}

          {/* Composer — rides up onto the keyboard. While an answer streams, Send becomes Stop. */}
          <KeyboardFooter style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your trading data…"
                placeholderTextColor={colors.textFaint}
                multiline
                editable={!busy}
                accessibilityLabel="Ask the assistant"
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                style={{ flex: 1, maxHeight: 120, paddingVertical: 8, color: colors.text, fontFamily: typography.input.fontFamily, fontSize: typography.input.fontSize, opacity: busy ? 0.6 : 1 }}
              />
              {loading ? (
                <Pressable
                  onPress={stop}
                  accessibilityRole="button"
                  accessibilityLabel="Stop generating"
                  style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt }}
                >
                  <View style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: colors.textMuted }} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => send()}
                  disabled={!input.trim() || busy}
                  accessibilityRole="button"
                  accessibilityLabel="Send"
                  style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: !input.trim() || busy ? 0.4 : 1 }}
                >
                  <Ionicons name="arrow-up" size={20} color={colors.primaryText} />
                </Pressable>
              )}
            </View>
          </KeyboardFooter>
        </>
      )}
    </View>
  );
}
