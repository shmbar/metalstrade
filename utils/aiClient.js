'use client';
import { auth } from './firebase';

/**
 * Wraps `fetch` for any /api/ai/* or /api/assistant call.
 * Automatically attaches the current user's Firebase ID token as a Bearer header
 * so the server can verify auth + enforce rate limits and cost ceilings.
 *
 * Throws if no user is signed in — call sites should already be inside the
 * authenticated app shell, so this only fires for misconfigured pages.
 */
export async function authedFetch(url, options = {}) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');

    let token;
    try {
        token = await user.getIdToken();
    } catch (e) {
        throw new Error(`Could not refresh the sign-in token — try signing out and back in (${e?.message || e})`);
    }
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, { ...options, headers });
}

// How many messages of a conversation are sent back to the model each turn.
// Both chat surfaces used to post the WHOLE thread every time, and neither the
// route nor the model call trimmed it — so a long session grew its own prompt
// without limit: every question cost more than the last, and a thread that ran
// far enough would fail outright on context length. 20 keeps roughly ten
// exchanges of memory, which is well past what these questions need.
export const MAX_CHAT_HISTORY = 20;

/**
 * The tail of a conversation, oldest trimmed away.
 *
 * Only role + content survive: the surfaces also carry ids, timestamps and
 * streaming flags that the model has no use for, and sending them was quietly
 * paying for tokens on our own bookkeeping.
 */
export const trimHistory = (messages, max = MAX_CHAT_HISTORY) =>
    (messages || [])
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
        .slice(-max)
        .map(m => ({ role: m.role, content: m.content }));

/**
 * localStorage key for a stored conversation, scoped to the workspace.
 *
 * It was one global key, so switching IMS <-> GIS left the previous company's
 * conversation — and whatever figures it had quoted — sitting in the new one.
 */
export const chatStorageKey = (surface, uidCollection) =>
    `ims-chat:${surface}:${uidCollection || 'none'}`;
