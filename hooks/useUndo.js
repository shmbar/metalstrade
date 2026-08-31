'use client';

// Undo for pages whose edits are already discrete writes.
//
// The Margins page undoes by snapshotting its whole `data` object, which works
// there because every edit lives in one piece of state that autosaves. The table
// pages are the opposite: an inline cell edit writes ONE field straight to
// Firestore (updateContractField and friends), optimistically, reverting on
// failure. Snapshotting those would mean holding a copy of every row.
//
// So this records the INVERSE instead: each entry knows how to put one field back
// the way it was, which is both smaller and more honest — undo replays the same
// write path the edit used, so anything that guards the edit (permissions, a
// completed contract, a failed network call) guards the undo too.
//
// Deliberately in-memory and per-page: an undo stack that survived a reload would
// promise to reverse a change the user can no longer see in context.

import { useCallback, useEffect, useRef, useState } from 'react';

export const useUndo = ({ max = 25, hotkey = true } = {}) => {
    const stack = useRef([]);
    const [count, setCount] = useState(0);
    const [busy, setBusy] = useState(false);
    const [lastLabel, setLastLabel] = useState('');

    const sync = () => {
        setCount(stack.current.length);
        setLastLabel(stack.current[stack.current.length - 1]?.label || '');
    };

    /**
     * @param entry.label  what the button offers to undo, e.g. 'Supplier on PO 090426'
     * @param entry.apply  async () => void — puts it back
     */
    const record = useCallback((entry) => {
        if (!entry?.apply) return;
        stack.current.push(entry);
        // Oldest falls off the bottom: this is a safety net for the last few
        // actions, not an audit trail — the activity log is that.
        if (stack.current.length > max) stack.current.shift();
        sync();
    }, [max]);

    const undo = useCallback(async () => {
        const entry = stack.current.pop();
        sync();
        if (!entry) return null;
        setBusy(true);
        try {
            await entry.apply();
            return entry;
        } catch (e) {
            // The write failed, so the change was NOT reversed. Put it back on the
            // stack rather than quietly dropping it — the user's next press retries.
            stack.current.push(entry);
            sync();
            throw e;
        } finally {
            setBusy(false);
        }
    }, []);

    const clear = useCallback(() => {
        stack.current = [];
        sync();
    }, []);

    // Ctrl/Cmd+Z. Ignored while the caret is in a field, where the browser's own
    // text undo is what the user means, and while an undo is already running.
    const undoRef = useRef(undo); undoRef.current = undo;
    const busyRef = useRef(busy); busyRef.current = busy;
    useEffect(() => {
        if (!hotkey) return;
        const onKey = (e) => {
            const z = e.key === 'z' || e.key === 'Z';
            if (!z || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
            const el = document.activeElement;
            const tag = el?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
            if (busyRef.current) return;
            e.preventDefault();
            undoRef.current?.().catch(() => { });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [hotkey]);

    return { record, undo, clear, count, busy, lastLabel };
};

export default useUndo;
