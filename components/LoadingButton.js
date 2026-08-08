'use client';
import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

// Primary/secondary button that shows a spinner while its async onClick runs.
// Drop-in for save actions: <LoadingButton onClick={saveData}>Save</LoadingButton>
export default function LoadingButton({ onClick, children, variant = 'primary', className = '', disabled, ...rest }) {
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
            {busy && <Loader2 size={13} className="animate-spin flex-shrink-0" />}
            {children}
        </button>
    );
}
