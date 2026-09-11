'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Modal from '../../../../components/modal';
import { Selector } from '../../../../components/selectors/selectShad';
import { BtnIcon } from '../../../../components/buttonIcons';
import { SettingsContext } from '../../../../contexts/useSettingsContext';
import { UserAuth } from '../../../../contexts/useAuthContext';
import useGrades from '../../../../hooks/useGrades';
import { aliasKey, assignAliases, findGradeByName, formatAssay, hasAssay, makeGrade, parseAssay } from '../../../../utils/grades';

/* "Make one grade from all our stock": the spellings ticked in the grade card become
   aliases of one grade — existing, or typed as a new name right here.

   Declaring from the stock rather than from Settings is the point. You sort while
   looking at the tonnage and value, not a list of strings. A spelling belongs to one
   grade, so any that already belonged to another move — and the dialog says which
   before anything is written. */
export default function MergeGradeModal({ isOpen, setIsOpen, spellings = [], onDone }) {
    const { grades, all, index, save } = useGrades();
    const { user } = UserAuth();
    const { setToast } = useContext(SettingsContext);

    const [target, setTarget] = useState({ gradeId: '' });
    const [newName, setNewName] = useState('');
    const [spec, setSpec] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setTarget({ gradeId: '' });
        setNewName('');
        setSpec('');
    }, [isOpen]);

    const creating = newName !== '';
    const chosen = creating ? null : grades.find(g => g.id === target.gradeId) || null;
    const totalQ = spellings.reduce((s, x) => s + (Number(x.qnty) || 0), 0);

    // Spellings that currently belong to a DIFFERENT grade than the one chosen.
    const moving = useMemo(() => spellings
        .map(s => ({ ...s, from: index.byAlias.get(aliasKey(s.name)) }))
        .filter(s => s.from && s.from.id !== chosen?.id), [spellings, index, chosen]);

    const onCreate = (name) => {
        const existing = findGradeByName(grades, name);
        if (existing) { setTarget({ gradeId: existing.id }); setNewName(''); return; }
        setNewName(name.trim());
    };

    const merge = async () => {
        let base = all, targetId = chosen?.id, created = [];
        if (creating) {
            const g = makeGrade(uuidv4(), { name: newName, spec });
            base = [...all, g];
            targetId = g.id;
            created = [g];
        }
        if (!targetId || !spellings.length) return;
        const changed = assignAliases(base, targetId, spellings.map(s => s.name));
        const byId = new Map([...created, ...changed].map(g => [g.id, g]));
        setBusy(true);
        try {
            await save([...byId.values()], user?.email || '');
            const name = creating ? newName : chosen.name;
            setToast?.({ show: true, text: `${spellings.length} spelling${spellings.length === 1 ? '' : 's'} merged into ${name}`, clr: 'success' });
            onDone?.();
            setIsOpen(false);
        } catch (e) {
            setToast?.({ show: true, text: `Merge failed: ${e?.code || e?.message || e}`, clr: 'fail' });
        } finally {
            setBusy(false);
        }
    };

    const parsedSpec = parseAssay(spec);
    const labelCls = 'responsiveTextTable font-medium text-[var(--ink-muted)] mb-1 block';

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size="md" title="Merge into grade"
            subtitle={`${spellings.length} spelling${spellings.length === 1 ? '' : 's'} · ${totalQ.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} MT`}>
            <div className="p-4 flex flex-col gap-3">
                <ul className="max-h-48 overflow-auto flex flex-col gap-1 rounded-lg border border-[var(--line)] p-2 bg-[var(--bg-subtle)]">
                    {spellings.map(s => (
                        <li key={s.name} className="flex items-center justify-between gap-3 responsiveTextTable text-[var(--ink)]">
                            <span className="truncate">{s.name}</span>
                            <span className="tnum text-[var(--ink-muted)] shrink-0">
                                {(Number(s.qnty) || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} MT
                            </span>
                        </li>
                    ))}
                </ul>

                <div>
                    <span className={labelCls}>Grade</span>
                    {creating ? (
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center h-8 px-3 rounded-control border border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-strong)] responsiveTextInput font-medium truncate">
                                New grade: {newName}
                            </span>
                            <button type="button" className="whiteButton" onClick={() => setNewName('')}>Change</button>
                        </div>
                    ) : (
                        <Selector arr={grades.map(g => ({ id: g.id, label: g.name }))} value={target}
                            onChange={(id) => setTarget({ gradeId: id })} name="gradeId" secondaryName="label"
                            onCreate={onCreate} createLabel="New grade" />
                    )}
                    <p className="responsiveTextTable text-[var(--ink-muted)] mt-1">
                        Pick a grade, or type a new name and choose “New grade”.
                    </p>
                </div>

                {creating && (
                    <div>
                        <span className={labelCls}>Nominal spec (optional)</span>
                        <input className="input w-full h-8" value={spec} onChange={e => setSpec(e.target.value)}
                            placeholder="e.g. 42Ni 12Cr 3Mo 3Nb 6Co 2Ti" />
                        {spec.trim() && (
                            <p className="responsiveTextTable mt-1 text-[var(--ink-muted)]">
                                {hasAssay(parsedSpec)
                                    ? <>Reads as <span className="tnum text-[var(--ink)]">{formatAssay(parsedSpec)}</span></>
                                    : 'No elements recognised — saved as written'}
                            </p>
                        )}
                    </div>
                )}

                {moving.length > 0 && (
                    <p className="responsiveTextTable rounded-lg px-3 py-2 border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-text)]">
                        {moving.length === 1 ? 'One of these belongs' : `${moving.length} of these belong`} to another grade and will move:{' '}
                        {[...new Set(moving.map(m => m.from.name))].join(', ')}.
                    </p>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
                    <button type="button" className="whiteButton" onClick={() => setIsOpen(false)}>Cancel</button>
                    <button type="button" className="blackButton" disabled={busy || (!chosen && !creating) || !spellings.length} onClick={merge}>
                        <BtnIcon action={busy ? 'saving' : 'merge'} spin={busy} />Merge
                    </button>
                </div>
            </div>
        </Modal>
    );
}
