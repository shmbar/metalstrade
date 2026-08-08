'use client';
import { Inbox } from 'lucide-react';

// One empty-state look app-wide: muted lucide icon in a subtle circle + caption.
// Usage: <EmptyState message="No contracts found" icon={FileText}
//                    actionLabel="+ New Contract" onAction={addNewContract} />
export default function EmptyState({ message = 'No data available', hint, icon: Icon = Inbox, actionLabel, onAction, className = '' }) {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`}>
            <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center">
                <Icon size={22} className="text-[var(--ink-muted)]" strokeWidth={1.75} />
            </div>
            <div className="font-medium text-[var(--ink-secondary)]" style={{ fontSize: 'var(--fs-title)' }}>{message}</div>
            {hint ? <div className="text-[var(--ink-muted)]" style={{ fontSize: 'var(--fs-input)' }}>{hint}</div> : null}
            {actionLabel && onAction ? (
                <button type="button" onClick={onAction} className="blackButton mt-1">
                    {actionLabel}
                </button>
            ) : null}
        </div>
    );
}
