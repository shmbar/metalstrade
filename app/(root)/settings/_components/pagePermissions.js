import React from 'react';
import CheckBox from '../../../../components/checkbox';
import { PAGE_GROUPS, PAGE_KEYS, defaultPagesForRole, roleMeta } from '../../../../utils/permissions';

// The per-user page checklist, grouped exactly like the sidebar so an admin
// ticking boxes is looking at the nav the member will end up with.
const PagePermissions = ({ role, pages, setPages }) => {

    const meta = roleMeta(role);
    const locked = meta.key === 'superadmin'; // a super admin always sees everything
    const selected = new Set(locked ? PAGE_KEYS : pages || []);

    const toggle = (key) => {
        const next = new Set(selected);
        if (next.has(key)) next.delete(key); else next.add(key);
        setPages(PAGE_KEYS.filter((k) => next.has(k))); // keep canonical order
    };

    const toggleGroup = (group) => {
        const keys = group.pages.map((p) => p.key);
        const allOn = keys.every((k) => selected.has(k));
        const next = new Set(selected);
        keys.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
        setPages(PAGE_KEYS.filter((k) => next.has(k)));
    };

    const isDefault = (() => {
        const d = defaultPagesForRole(role);
        return d.length === selected.size && d.every((k) => selected.has(k));
    })();

    return (
        <div className="flex flex-col gap-2">

            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="responsiveTextInput font-semibold">Can see</p>
                {!locked && (
                    <div className="flex items-center gap-2 responsiveText">
                        <button type="button" onClick={() => setPages([...PAGE_KEYS])}
                            className="text-[var(--brand)] hover:underline">All</button>
                        <span className="text-[var(--ink-muted)]">·</span>
                        <button type="button" onClick={() => setPages([])}
                            className="text-[var(--brand)] hover:underline">None</button>
                        <span className="text-[var(--ink-muted)]">·</span>
                        <button type="button" onClick={() => setPages([...defaultPagesForRole(role)])}
                            className="text-[var(--brand)] hover:underline">Reset to {meta.label} default</button>
                    </div>
                )}
            </div>

            <p className="responsiveText text-[var(--ink-muted)]">
                {locked
                    ? 'A Super Admin always has access to every page — this cannot be narrowed.'
                    : isDefault
                        ? `Standard ${meta.label} access. Tick or untick a page to make it specific to this person.`
                        : `Custom access — ${selected.size} of ${PAGE_KEYS.length} pages.`}
            </p>

            <div className={`rounded-control border border-[var(--line)] bg-[var(--bg-subtle)] p-2 flex flex-col gap-2
                max-h-[320px] overflow-y-auto ${locked ? 'opacity-60 pointer-events-none' : ''}`}>
                {PAGE_GROUPS.map((group) => {
                    const keys = group.pages.map((p) => p.key);
                    const allOn = keys.every((k) => selected.has(k));
                    return (
                        <div key={group.ttl}>
                            <button type="button" onClick={() => toggleGroup(group)}
                                className="responsiveText font-semibold uppercase tracking-wide text-[var(--ink-muted)] hover:text-[var(--ink)] mb-1">
                                {group.ttl}
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                                {group.pages.map((p) => (
                                    <label key={p.key}
                                        className="flex items-center gap-2 cursor-pointer responsiveTextInput py-0.5">
                                        <CheckBox size="size-4" checked={selected.has(p.key)}
                                            onChange={() => toggle(p.key)} />
                                        <span className={selected.has(p.key) ? '' : 'text-[var(--ink-muted)]'}>{p.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!locked && selected.size === 0 && (
                <p className="responsiveText text-[var(--danger-text)]">
                    No pages selected — this person will be able to sign in but not open anything.
                </p>
            )}
        </div>
    );
};

export default PagePermissions;
