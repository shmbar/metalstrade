'use client';

// A table cell that truncates at the COLUMN's width — not at an arbitrary one —
// and only raises a tooltip when the text genuinely does not fit.
//
// The PO# cell it replaces carried `truncate max-w-[80px]`, so a 14-digit
// reference ellipsized to "510520000…" and popped a tooltip even in a column with
// room to spare. A cap in px cannot know how wide its column ended up; `w-full`
// does, because the column tells it.
//
// The tooltip is interactive and its text selectable, with a copy button, because
// the value it holds — a PO number, a container, a reference — is usually wanted
// in the clipboard rather than merely read. A label tooltip is normally
// click-through on purpose (see components/tlTip.js); this one opts out.

import { useRef, useState } from 'react';
import Tltip from '../tlTip';
import { Copy, Check } from 'lucide-react';

export default function TruncatedCell({ value, className = '', style, direction = 'top' }) {
    const ref = useRef(null);
    const [clipped, setClipped] = useState(false);
    const [copied, setCopied] = useState(false);

    const text = value == null ? '' : String(value);

    // Measured on hover, not on render: a table holds hundreds of these and only
    // the one under the pointer needs an answer. scrollWidth > clientWidth is the
    // element reporting that its own text overflows.
    const measure = () => {
        const el = ref.current;
        if (el) setClipped(el.scrollWidth > el.clientWidth + 1);
    };

    const copy = async (e) => {
        e.stopPropagation();   // rows open on double-click; don't feed this to the row
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard needs a secure context and permission; if it's refused the
            // text is still selectable by hand, which is the fallback.
        }
    };

    const cell = (
        <span ref={ref} onMouseEnter={measure} style={style} className={`block w-full truncate ${className}`}>
            {text}
        </span>
    );

    // Nothing to reveal, nothing to copy.
    if (!text) return cell;

    return (
        <Tltip
            direction={direction}
            show={clipped}
            interactive
            tltpText={
                <span className="inline-flex items-center gap-2 bg-[var(--tooltip-bg)] text-[var(--tooltip-ink)] border border-[var(--tooltip-border)] shadow-pop rounded-lg px-2 py-1 responsiveTextTable font-normal">
                    {/* select-text because the surrounding chrome sets user-select: none,
                        and picking the value out by hand has to keep working if the
                        clipboard API is unavailable. */}
                    <span className="select-text whitespace-nowrap">{text}</span>
                    <button
                        type="button"
                        onClick={copy}
                        aria-label={copied ? 'Copied' : 'Copy to clipboard'}
                        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                    >
                        {copied
                            ? <Check className="w-3 h-3" style={{ color: 'var(--ok-text)' }} />
                            : <Copy className="w-3 h-3" />}
                    </button>
                </span>
            }
        >
            {cell}
        </Tltip>
    );
}
