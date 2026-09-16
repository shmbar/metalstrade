import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/store/auth';
import { logEvent, newId } from '@/data/writes';

// Comment threads on a record — port of web utils.js addComment / subscribeComments
// and components/CommentThread.js. Same collection ({uid}/data/comments), same
// entityKey ('contract:<id>' / 'invoice:<id>'), same notification on post, so a
// comment written on the phone shows in the web thread and pings the same people.

export interface CommentRow {
  id: string;
  entityType: string;
  entityId: string;
  entityKey: string;
  text: string;
  authorUid: string;
  authorName: string;
  createdAt: string;
  createdAtMs: number;
}

/** Live thread for one record, oldest first. Subscribes only while `enabled`. */
export function useComments(entityType: string, entityId: string | undefined, enabled = true) {
  const uidCollection = useAuth((s) => s.uidCollection);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !uidCollection || !entityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, uidCollection, 'data', 'comments'),
      where('entityKey', '==', `${entityType}:${entityId}`)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(
          snap.docs.map((d) => d.data() as CommentRow).sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0))
        );
        setLoading(false);
      },
      () => {
        // Same as web: a failed subscription reads as an empty thread, not a crash.
        setComments([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uidCollection, entityType, entityId, enabled]);

  return { comments, loading };
}

/** Post a comment and notify the team — web CommentThread send(). */
export async function addComment(
  uidCollection: string,
  args: { entityType: string; entityId: string; entityLabel: string; text: string; authorUid: string; authorName: string }
): Promise<CommentRow | null> {
  const body = args.text.trim();
  if (!uidCollection || !args.entityId || !body) return null;
  const now = new Date();
  const rec: CommentRow = {
    id: newId(),
    entityType: args.entityType || '',
    entityId: args.entityId,
    entityKey: `${args.entityType || ''}:${args.entityId}`,
    text: body,
    authorUid: args.authorUid || '',
    authorName: args.authorName || 'Unknown',
    createdAt: now.toISOString(),
    createdAtMs: now.getTime(),
  };
  await setDoc(doc(db, uidCollection, 'data', 'comments', rec.id), rec);
  await logEvent(uidCollection, {
    type: 'comment.added',
    entityType: args.entityType,
    entityId: args.entityId,
    entityLabel: args.entityLabel,
    action: 'commented',
    message: `${args.authorName || 'Someone'} commented on ${args.entityLabel || 'a record'}: "${
      body.length > 80 ? `${body.slice(0, 80)}…` : body
    }"`,
    notify: true,
    severity: 'info',
    actorUid: args.authorUid,
    actorName: args.authorName,
  });
  return rec;
}
