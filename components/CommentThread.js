'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { UserAuth } from '../contexts/useAuthContext';
import { addComment, subscribeComments } from '../utils/utils';
import { Send, Loader2, MessageSquare } from 'lucide-react';

function relativeTime(ms) {
    if (!ms) return '';
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
    return new Date(ms).toLocaleDateString();
}
const initials = (name = '') =>
    name.toString().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('') || '?';

// Stable color per author so messages are easy to scan.
const AVATAR_COLORS = ['#0366ae', '#15803d', '#b45309', '#7c3aed', '#be185d', '#0e7490'];
const colorFor = (key = '') => {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

/**
 * Live comment thread for a record. Posts also raise a notification so teammates
 * are pinged ("X commented on PO 123").
 */
const CommentThread = ({ entityType, entityId, entityLabel }) => {
    const { uidCollection, currentUser, logActivity } = UserAuth() || {};
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const endRef = useRef(null);

    useEffect(() => {
        if (!uidCollection || !entityId) { setLoading(false); return; }
        setLoading(true);
        const unsub = subscribeComments(uidCollection, entityType, entityId, (rows) => {
            setComments(rows);
            setLoading(false);
        });
        return () => { try { unsub && unsub(); } catch { /* ignore */ } };
    }, [uidCollection, entityType, entityId]);

    // Keep the newest message in view.
    useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [comments.length]);

    const send = useCallback(async () => {
        const body = text.trim();
        if (!body || sending || !uidCollection || !entityId) return;
        setSending(true);
        const saved = await addComment(uidCollection, {
            entityType, entityId, text: body,
            authorUid: currentUser?.uid, authorName: currentUser?.name,
        });
        if (saved) {
            setText('');
            // Notify teammates of the new comment (also lands in the activity log).
            logActivity?.({
                type: 'comment.added', entityType, entityId, entityLabel,
                action: 'commented',
                message: `${currentUser?.name || 'Someone'} commented on ${entityLabel || 'a record'}: "${body.length > 80 ? body.slice(0, 80) + '…' : body}"`,
                notify: true, severity: 'info',
            });
        }
        setSending(false);
    }, [text, sending, uidCollection, entityType, entityId, entityLabel, currentUser, logActivity]);

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    return (
        <div className='flex flex-col p-3' style={{ minHeight: 240 }}>
            {/* Thread */}
            <div className='flex-1 overflow-y-auto pr-1' style={{ maxHeight: '50vh' }}>
                {loading ? (
                    <div className='flex items-center justify-center gap-2 py-8'>
                        <Loader2 className='w-4 h-4 animate-spin' style={{ color: 'var(--endeavour)' }} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--chathams-blue)' }}>Loading comments…</span>
                    </div>
                ) : comments.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-8 gap-1'>
                        <MessageSquare className='w-5 h-5' style={{ color: '#b8ddf8' }} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--regent-gray)' }}>No comments yet — start the conversation.</span>
                    </div>
                ) : (
                    <ul className='flex flex-col gap-2'>
                        {comments.map((c) => {
                            const mine = c.authorUid && c.authorUid === currentUser?.uid;
                            return (
                                <li key={c.id} className='flex items-start gap-2'>
                                    <span className='inline-flex items-center justify-center rounded-full text-white flex-shrink-0 mt-0.5' style={{ width: 24, height: 24, fontSize: '0.55rem', background: colorFor(c.authorName || c.authorUid) }}>
                                        {initials(c.authorName)}
                                    </span>
                                    <div className='min-w-0 flex-1'>
                                        <div className='flex items-center gap-2'>
                                            <span className='font-medium' style={{ fontSize: '0.66rem', color: 'var(--chathams-blue)' }}>
                                                {mine ? 'You' : (c.authorName || 'Unknown')}
                                            </span>
                                            <span style={{ fontSize: '0.58rem', color: 'var(--regent-gray)' }} title={c.createdAt}>{relativeTime(c.createdAtMs)}</span>
                                        </div>
                                        <div className='rounded-lg px-2.5 py-1.5 mt-0.5 whitespace-pre-wrap break-words' style={{ fontSize: '0.7rem', color: 'var(--port-gore)', background: mine ? '#dbeeff' : '#f8fbff', border: '1px solid #eef5fc' }}>
                                            {c.text}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                        <div ref={endRef} />
                    </ul>
                )}
            </div>

            {/* Composer */}
            <div className='flex items-end gap-2 mt-2 pt-2' style={{ borderTop: '1px solid #eef5fc' }}>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={2}
                    placeholder='Write a comment…  (Enter to send, Shift+Enter for a new line)'
                    className='flex-1 rounded-xl border px-3 py-2 outline-none focus:border-[var(--endeavour)] resize-none'
                    style={{ fontSize: '0.72rem', borderColor: '#b8ddf8', background: '#f8fbff', color: 'var(--port-gore)', fontFamily: 'inherit' }}
                />
                <button
                    onClick={send}
                    disabled={!text.trim() || sending}
                    className='flex items-center gap-1 px-3 py-2 rounded-xl text-white font-medium transition-all disabled:opacity-50'
                    style={{ fontSize: '0.7rem', background: 'var(--endeavour)' }}
                >
                    {sending ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <Send className='w-3.5 h-3.5' />}
                    Send
                </button>
            </div>
        </div>
    );
};

export default CommentThread;
