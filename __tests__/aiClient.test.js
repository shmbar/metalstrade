import { describe, it, expect } from 'vitest';
import { trimHistory, chatStorageKey, MAX_CHAT_HISTORY } from '@utils/aiClient';

const msg = (role, content, extra = {}) => ({
    id: `${role}-${Math.random()}`,
    role,
    content,
    time: '9:00 AM',
    isStreaming: false,
    ...extra,
});

describe('trimHistory — the prompt stops growing without limit', () => {
    it('keeps only the tail once a thread runs long', () => {
        const thread = Array.from({ length: 60 }, (_, i) => msg(i % 2 ? 'assistant' : 'user', `m${i}`));
        const out = trimHistory(thread);
        expect(out).toHaveLength(MAX_CHAT_HISTORY);
        // the LAST messages survive — the recent context, not the opening pleasantries
        expect(out[out.length - 1].content).toBe('m59');
        expect(out[0].content).toBe(`m${60 - MAX_CHAT_HISTORY}`);
    });

    it('leaves a short thread untouched', () => {
        const thread = [msg('user', 'hi'), msg('assistant', 'hello')];
        expect(trimHistory(thread)).toEqual([
            { role: 'user', content: 'hi' },
            { role: 'assistant', content: 'hello' },
        ]);
    });

    it('sends only role and content — not our ids, timestamps or streaming flags', () => {
        const out = trimHistory([msg('user', 'hi', { isError: true, citations: [1, 2] })]);
        expect(Object.keys(out[0]).sort()).toEqual(['content', 'role']);
    });

    it('drops anything the model cannot use', () => {
        const out = trimHistory([
            msg('user', 'keep me'),
            msg('assistant', ''),          // empty placeholder mid-stream
            { role: 'system', content: 'not ours to send' },
            null,
            undefined,
        ]);
        expect(out).toEqual([{ role: 'user', content: 'keep me' }]);
    });

    it('handles an empty or missing thread without throwing', () => {
        expect(trimHistory([])).toEqual([]);
        expect(trimHistory(null)).toEqual([]);
        expect(trimHistory(undefined)).toEqual([]);
    });

    it('honours an explicit cap', () => {
        const thread = Array.from({ length: 10 }, (_, i) => msg('user', `m${i}`));
        expect(trimHistory(thread, 3).map(m => m.content)).toEqual(['m7', 'm8', 'm9']);
    });
});

describe('chatStorageKey — one company cannot see the other one\'s thread', () => {
    const IMS = 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2';
    const GIS = 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS';

    it('gives the two workspaces different keys', () => {
        expect(chatStorageKey('floating', IMS)).not.toBe(chatStorageKey('floating', GIS));
    });

    it('keeps the two surfaces apart within one workspace', () => {
        expect(chatStorageKey('floating', IMS)).not.toBe(chatStorageKey('assistant', IMS));
    });

    it('is stable for the same surface and workspace', () => {
        expect(chatStorageKey('assistant', GIS)).toBe(chatStorageKey('assistant', GIS));
    });

    it('does not collide when there is no workspace yet', () => {
        expect(chatStorageKey('floating', null)).toBe('ims-chat:floating:none');
        expect(chatStorageKey('floating', undefined)).toBe('ims-chat:floating:none');
        expect(chatStorageKey('floating', null)).not.toBe(chatStorageKey('floating', IMS));
    });
});
