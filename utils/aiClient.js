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

    const token = await user.getIdToken();
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, { ...options, headers });
}
