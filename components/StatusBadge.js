'use client';
// Pill badge for a status label. Pure tone logic lives in statusUtils.js (no JSX,
// unit-tested); this file is just the presentation.
import { TONES, statusTone } from './statusUtils';

export default function StatusBadge({ label, tone, size = 'sm', className = '', style = {} }) {
    if (label == null || label === '') return null;
    const t = TONES[tone || statusTone(label)] || TONES.gray;
    const pad = size === 'xs' ? 'px-2 py-0.5' : 'px-2.5 py-1';
    const fontSize = size === 'xs' ? '0.625rem' : '0.65625rem';
    return (
        <span
            /* rounded-lg, not rounded-full: one radius across the app. This single
               line is what made every StatusBadge in the CRM a pill — including
               salescontracts and invoices, which have no radius class of their own. */
            className={`inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap ${pad} ${className}`}
            style={{ background: t.bg, color: t.text, border: `1px solid ${t.border}`, fontSize, ...style }}
        >
            {label}
        </span>
    );
}
