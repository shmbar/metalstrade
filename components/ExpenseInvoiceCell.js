'use client';
import { useEffect, useState } from 'react';
import { listAll, ref } from 'firebase/storage';
import { storage } from '@utils/firebase';
import { BtnIcon } from '@components/buttonIcons';

/* An expense's invoice number in a list, with whether its invoice is attached.

   An expense's document lives in a storage folder named by the expense id (the Files
   button on the expense form, expenses/modals/filesModal.js). Nothing on the list said
   whether one was there, so the only way to find an expense with no invoice was to open
   it and look — which is how a duplicate with no PDF sat unnoticed next to the real one
   (VALIVA 100568, 2026-09-24). The number now opens the invoice itself, and a paperclip
   says, before anything is opened, whether there is one.

   One folder listing per row, only for rows actually on screen, at most six at a time,
   and remembered for the session — a list of fifty costs fifty small listings once. */

const cache = new Map();          // expense id → Promise<boolean | null>
let running = 0;
const waiting = [];
const limited = (task) => new Promise((resolve, reject) => {
    const run = () => {
        running++;
        task().then(resolve, reject).finally(() => { running--; waiting.shift()?.(); });
    };
    if (running < 6) run(); else waiting.push(run);
});

/** Whether the expense has anything attached: true, false, or null when the folder could
    not be read (then no claim is made either way). `fresh` re-reads after an upload. */
export const hasAttachment = (id, { fresh = false } = {}) => {
    if (!id) return Promise.resolve(false);
    if (fresh) cache.delete(id);
    if (!cache.has(id)) {
        cache.set(id, limited(() => listAll(ref(storage, `${id}/`)))
            .then(r => r.items.length > 0)
            .catch(() => { cache.delete(id); return null; }));
    }
    return cache.get(id);
};

export default function ExpenseInvoiceCell({ id, number, onOpen, refreshKey = 0 }) {
    const [attached, setAttached] = useState(null);

    useEffect(() => {
        let on = true;
        hasAttachment(id).then(v => { if (on) setAttached(v); });
        return () => { on = false; };
    }, [id, refreshKey]);

    const stop = (e) => e.stopPropagation();
    const title = attached === true ? 'Open the invoice'
        : attached === false ? 'No invoice attached — click to add it'
            : 'Open the invoice';

    return (
        <button type="button" title={title}
            onClick={(e) => { stop(e); onOpen?.(); }}
            onDoubleClick={stop}
            className="inline-flex items-center gap-1 max-w-full text-[var(--endeavour)] hover:underline">
            <span className="truncate">{number || '—'}</span>
            {attached !== null && (
                <span aria-label={attached ? 'invoice attached' : 'no invoice attached'}
                    className={`inline-flex shrink-0 ${attached ? 'text-[var(--brand)]' : 'text-[var(--ink-muted)] opacity-40'}`}>
                    <BtnIcon action="files" />
                </span>
            )}
        </button>
    );
}
