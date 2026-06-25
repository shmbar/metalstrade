import { useRef, useState } from 'react';
import { View, Pressable, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Text, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { streamAssistant, isAssistantConfigured, ChatMessage } from '@/features/assistant/api';
import { useAssistantContext } from '@/features/assistant/useAssistantContext';
import { radius, spacing } from '@/theme/tokens';

interface UiMessage extends ChatMessage {
  id: string;
  streaming?: boolean;
}

// Mirrors the web Assistant's suggestion chips for parity.
const SUGGESTIONS = [
  'Show overdue invoices',
  'Which client owes the most?',
  'Show unpaid expenses',
  'What is my profit this month?',
  'Contract status breakdown',
  'How do I create an invoice?',
];

export default function Assistant() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const configured = isAssistantConfigured();
  const { currentData, dateRange } = useAssistantContext();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList>(null);

  const scrollEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setInput('');

    const userMsg: UiMessage = { id: `u-${Date.now()}`, role: 'user', content };
    const botId = `a-${Date.now()}`;
    const history: ChatMessage[] = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg, { id: botId, role: 'assistant', content: '', streaming: true }]);
    setBusy(true);
    scrollEnd();

    try {
      await streamAssistant({
        messages: history,
        currentData,
        dateRange,
        onText: (delta) => {
          setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, content: m.content + delta } : m)));
          scrollEnd();
        },
      });
      setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, streaming: false } : m)));
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) => (m.id === botId ? { ...m, streaming: false, content: `⚠️ ${e?.message || 'Failed to reach the assistant.'}` } : m))
      );
    } finally {
      setBusy(false);
      scrollEnd();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, marginBottom: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="h2">Assistant</Text>
          <Text variant="caption" tone="faint">Ask about your contracts, invoices, receivables…</Text>
        </View>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
      </View>

      {!configured ? (
        <View style={{ padding: spacing.lg }}>
          <EmptyState
            title="Backend not configured"
            message="Set EXPO_PUBLIC_API_BASE_URL to your deployed web app URL (which hosts /api/assistant) to enable the AI Assistant."
            icon={<Ionicons name="cloud-offline-outline" size={40} color={colors.textFaint} />}
          />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 8}>
          {messages.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, gap: 12 }}>
              <EmptyState title="How can I help?" message="Ask in plain language — I read your loaded data." icon={<Ionicons name="sparkles-outline" size={40} color={colors.primary} />} />
              <View style={{ gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} onPress={() => send(s)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, backgroundColor: colors.surface }}>
                    <Text variant="body" tone="primary">{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: spacing.lg, gap: 10 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const mine = item.role === 'user';
                return (
                  <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                    <Card
                      padded={false}
                      style={{
                        maxWidth: '88%',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        backgroundColor: mine ? colors.primary : colors.card,
                      }}
                    >
                      {item.content ? (
                        <Text variant="body" color={mine ? colors.primaryText : colors.text}>{item.content}</Text>
                      ) : (
                        <ActivityIndicator color={colors.primary} />
                      )}
                    </Card>
                  </View>
                );
              }}
            />
          )}

          {/* Composer */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 10, paddingTop: 8 }}>
            <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: spacing.md, maxHeight: 120 }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask anything…"
                placeholderTextColor={colors.textFaint}
                multiline
                style={{ paddingVertical: 10, color: colors.text, fontFamily: 'Poppins_400Regular', fontSize: 15 }}
              />
            </View>
            <Pressable
              onPress={() => send(input)}
              disabled={busy || !input.trim()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: busy || !input.trim() ? colors.border : colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {busy ? <ActivityIndicator color={colors.primaryText} /> : <Ionicons name="arrow-up" size={20} color={colors.primaryText} />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
