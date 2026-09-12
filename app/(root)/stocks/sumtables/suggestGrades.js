'use client';
import { useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Modal from '../../../../components/modal';
import CheckBox from '../../../../components/checkbox';
import { BtnIcon } from '../../../../components/buttonIcons';
import { SettingsContext } from '../../../../contexts/useSettingsContext';
import { UserAuth } from '../../../../contexts/useAuthContext';
import useGrades from '../../../../hooks/useGrades';
import { assignAliases, findGradeByName, makeGrade } from '../../../../utils/grades';

/* Naming every group in one pass.

   Declaring grades one at a time is the honest way to start, but there are ~550
   spellings behind a few dozen alloys and the card has ALREADY folded them — a row
   like "NiCrMo Ingots · 16–31Ni" is twenty-one spellings the grouping got right.
   What is missing is only the name, so this lists every undeclared fold with the
   name it would take, and writes the lot of them in one commit.

   Nothing is guessed silently: every proposed name is editable here, multi-spelling
   folds start ticked because those are the ones that pay, and a fold of one spelling
   starts unticked — naming those is real work, not a merge. */
const fmtMT = (q) => (Number(q) || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export default function SuggestGradesModal({ isOpen, setIsOpen, groups = [], onDone }) {
    const { all, save } = useGrades();
    const { user } = UserAuth();
    const { setToast } = useContext(SettingsContext);

    const [picked, setPicked] = useState({});
    const [names, setNames] = useState({});
    const [busy, setBusy] = useState(false);

    /* Seeded when the dialog opens and not re-seeded while it is open: `groups` is
       recomputed on every grade snapshot, and reseeding would wipe a name being typed. */
    useEffect(() => {
        if (!isOpen) return;
        const p = {}, n = {};
        groups.forEach(g => { p[g.key] = g.spellings.length > 1; n[g.key] = g.name; });
        setPicked(p);
        setNames(n);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const chosen = groups.filter(g => picked[g.key] && (names[g.key] || '').trim());
    const chosenSpellings = chosen.reduce((s, g) => s + g.spellings.length, 0);
    const setAll = (on) => setPicked(Object.fromEntries(groups.map(g => [g.key, on])));

    const create = async () => {
        if (!chosen.length) return;
        let base = all;
        const changed = new Map();
        for (const g of chosen) {
            const name = names[g.key].trim();
            // Two groups can be given the same name on purpose — that is a merge, and
            // the second one must find the grade the first just made.
            const existing = findGradeByName(base, name);
            let id = existing?.id;
            if (!existing) {
                const made = makeGrade(uuidv4(), { name });
                base = [...base, made];
                changed.set(made.id, made);
                id = made.id;
            }
            assignAliases(base, id, g.spellings).forEach(m => changed.set(m.id, m));
            base = base.map(x => changed.get(x.id) || x);
        }
        setBusy(true);
        try {
            await save([...changed.values()], user?.email || '');
            setToast?.({
                show: true,
                text: `${chosen.length} grade${chosen.length === 1 ? '' : 's'} declared from ${chosenSpellings} spelling${chosenSpellings === 1 ? '' : 's'}`,
                clr: 'success',
            });
            onDone?.();
            setIsOpen(false);
        } catch (e) {
            setToast?.({ show: true, text: `Not saved: ${e?.code || e?.message || e}`, clr: 'fail' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size="lg" title="Name these groups"
            subtitle={`${groups.length} group${groups.length === 1 ? '' : 's'} without a grade · ${chosen.length} selected`}>
            <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <p className="responsiveTextTable text-[var(--ink-muted)]">
                        These are the folds the card already made. Edit a name, untick what you are not sure of,
                        and the rest are declared in one go.
                    </p>
                    <span className="flex items-center gap-2 shrink-0">
                        <button type="button" className="whiteButton blackButtonSm" onClick={() => setAll(true)}>All</button>
                        <button type="button" className="whiteButton blackButtonSm" onClick={() => setAll(false)}>None</button>
                    </span>
                </div>

                <ul className="max-h-[55vh] overflow-auto custom-scroll flex flex-col divide-y divide-[var(--line)]
                    rounded-lg border border-[var(--line)] bg-[var(--bg-subtle)]">
                    {groups.map(g => (
                        <li key={g.key} className="flex items-center gap-3 px-2 py-1.5">
                            <CheckBox size="size-3" checked={!!picked[g.key]}
                                onChange={() => setPicked(p => ({ ...p, [g.key]: !p[g.key] }))} />
                            <input className="input h-8 w-60 shrink-0" value={names[g.key] ?? ''}
                                onChange={e => setNames(n => ({ ...n, [g.key]: e.target.value }))}
                                placeholder="Grade name" />
                            <span className="responsiveTextTable text-[var(--ink-muted)] flex-1 min-w-0 truncate cursor-default"
                                title={g.spellings.join('\n')}>
                                {g.spellings.length} spelling{g.spellings.length === 1 ? '' : 's'} · {g.spellings.join(' · ')}
                            </span>
                            <span className="responsiveTextTable tnum text-[var(--ink-muted)] shrink-0 w-24 text-right">
                                {fmtMT(g.qnty)} MT
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="flex justify-end items-center gap-3 pt-3 border-t border-[var(--line)]">
                    <span className="responsiveTextTable text-[var(--ink-muted)] mr-auto">
                        {chosenSpellings} spelling{chosenSpellings === 1 ? '' : 's'} will be classified
                    </span>
                    <button type="button" className="whiteButton" onClick={() => setIsOpen(false)}>Cancel</button>
                    <button type="button" className="blackButton" disabled={busy || !chosen.length} onClick={create}>
                        <BtnIcon action={busy ? 'saving' : 'merge'} spin={busy} />
                        Declare {chosen.length || ''} grade{chosen.length === 1 ? '' : 's'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
