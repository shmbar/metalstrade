import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet, Text, Avatar, IconButton } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/auth';
import { useComments, addComment } from '@/features/comments/useComments';
import { toast } from '@/store/toast';
import { radius, spacing } from '@/theme/tokens';

const relativeTime = (ms?: number) => {
  if (!ms) return '';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString();
};

/**
 * The comment thread on a contract or an invoice — web's CommentThread in a sheet.
 * Live: a teammate's reply on the web lands here without a refresh.
 */
export function CommentsSheet({
  visible,
  onClose,
  entityType,
  entityId,
  entityLabel,
}: {
  visible: boolean;
  onClose: () => void;
  entityType: 'contract' | 'invoice';
  entityId: string;
  entityLabel: string;
}) {
  const { colors } = useTheme();
  const { uidCollection, currentUser } = useAuth();
  const { comments, loading } = useComments(entityType, entityId, visible);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim() || sending || !uidCollection) return;
    setSending(true);
    try {
      const saved = await addComment(uidCollection, {
        entityType,
        entityId,
        entityLabel,
        text,
        authorUid: currentUser?.uid || '',
        authorName: currentUser?.name || '',
      });
      if (saved) setText('');
    } catch (e: any) {
      toast.error(e?.message || 'Could not post the comment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Comments"
      subtitle={entityLabel}
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              paddingHorizontal: spacing.md,
              maxHeight: 120,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write a comment…"
              placeholderTextColor={colors.textFaint}
              multiline
              accessibilityLabel="Comment"
              style={{ paddingVertical: 10, color: colors.text, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}
            />
          </View>
          <IconButton
            icon="send"
            variant="primary"
            accessibilityLabel="Send comment"
            onPress={send}
            disabled={!text.trim() || sending}
          />
        </View>
      }
    >
      {loading ? (
        <Text variant="body" tone="muted" style={{ paddingVertical: spacing.lg, textAlign: 'center' }}>
          Loading comments…
        </Text>
      ) : comments.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: 6 }}>
          <Ionicons name="chatbubbles-outline" size={28} color={colors.textFaint} />
          <Text variant="body" tone="muted">No comments yet — start the conversation.</Text>
        </View>
      ) : (
        <View style={{ gap: 12, paddingBottom: spacing.sm }}>
          {comments.map((c) => {
            const mine = !!c.authorUid && c.authorUid === currentUser?.uid;
            return (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Avatar name={c.authorName || '?'} size={30} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text variant="bodyMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {mine ? 'You' : c.authorName || 'Unknown'}
                    </Text>
                    <Text variant="caption" tone="faint">{relativeTime(c.createdAtMs)}</Text>
                  </View>
                  <View
                    style={{
                      marginTop: 4,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: radius.lg,
                      backgroundColor: mine ? colors.primary + '14' : colors.surfaceAlt,
                    }}
                  >
                    <Text variant="body">{c.text}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}
