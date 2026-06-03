'use client';
// Pill badge for a status label. Pure tone logic lives in statusUtils.js (no JSX,
// unit-tested); this file is just the presentation.
import { TONES, statusTone } from './statusUtils';

export default function StatusBadge({ label, tone, size = 'sm', className = '', style = {} }) {
    if (label == null || label === '') return null;
    const t = TONES[tone || statusTone(label)] || TONES.gray;
    const pad = size === 'xs' ? 'px-2 py-0.5' : 'px-3 py-1';
    const fontSize = size === 'xs' ? '0.55rem' : '0.65rem';
    return (
        <span
            className={`inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap ${pad} ${className}`}
            style={{ background: t.bg, color: t.text, border: `1px solid ${t.border}`, fontSize, ...style }}
        >
            {label}
        </span>
    );
}
