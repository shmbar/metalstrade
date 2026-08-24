'use client';
import { useState, useCallback } from 'react';
import { BtnIcon } from './buttonIcons';

// Primary/secondary button that shows a spinner while its async onClick runs.
// Drop-in for save actions: <LoadingButton onClick={saveData}>Save</LoadingButton>
//
// It leads with an icon like every other button in the band. `action` names the
// verb (see components/buttonIcons.js) and defaults to 'save' because that is
// what all four call sites do — Formulas, Material Tables and both invoice
// modals. While the click is in flight the icon becomes the spinner rather than
// sitting next to one, so the button keeps its width and does not jump.
// Pass action={null} for a button that genuinely wants no glyph.
export default function LoadingButton({ onClick, children, variant = 'primary', action = 'save', className = '', disabled, ...rest }) {
    const [busy, setBusy] = useState(false);

    const handleClick = useCallback(async (e) => {
        if (busy) return;
        try {
            setBusy(true);
            await onClick?.(e);
        } finally {
            setBusy(false);
        }
    }, [busy, onClick]);

    const base = variant === 'primary' ? 'blackButton' : 'whiteButton';
    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled || busy}
            aria-busy={busy}
            className={`${base} ${className} disabled:opacity-60 disabled:cursor-not-allowed`}
            {...rest}
        >
            {busy ? <BtnIcon action="saving" spin /> : <BtnIcon action={action} />}
            {children}
        </button>
    );
}
