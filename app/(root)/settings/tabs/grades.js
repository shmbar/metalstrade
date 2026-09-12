'use client';
import { useContext, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SettingsContext } from '../../../../contexts/useSettingsContext';
import { UserAuth } from '../../../../contexts/useAuthContext';
import ModalToDelete from '../../../../components/modalToProceed';
import Tltip from '../../../../components/tlTip';
import { BtnIcon, SearchAdornment } from '../../../../components/buttonIcons';
import useGrades from '../../../../hooks/useGrades';
import { aliasKey, assignAliases, findGradeByName, formatAssay, hasAssay, makeGrade, parseAssay } from '../../../../utils/grades';
import { matchesAllWords } from '@utils/search';

/* The grade registry, for editing. Declaring happens mostly elsewhere — ticking rows
   on the Stocks page and merging, or picking a grade on a PO line — and this is where a
   grade is renamed, its nominal spec set, or a spelling that landed in the wrong grade
   pulled out. The list is shared by IMS and GIS (utils/gradesStore.js). */

const blank = () => ({ id: '', name: '', spec: '', aliases: [], lineIds: [] });
const sameList = (a = [], b = []) => a.length === b.length && a.every((x, i) => x === b[i]);

const Grades = () => {
    const { setToast } = useContext(SettingsContext);
    const { user } = UserAuth();
    const { grades, all, ready, save } = useGrades();

    const [form, setForm] = useState(blank());
    const [aliasInput, setAliasInput] = useState('');
    const [filter, setFilter] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const list = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return grades
            .filter(g => !q || matchesAllWords([g.name, g.aliases], q))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    }, [grades, filter]);

    // Which grade each spelling belongs to today — to warn before a save moves one.
    const owners = useMemo(() => {
        const m = new Map();
        grades.forEach(g => (g.aliases || []).forEach(a => m.set(aliasKey(a), g)));
        return m;
    }, [grades]);

    const select = (g) => {
        setForm({ id: g.id, name: g.name, spec: g.spec || '', aliases: [...(g.aliases || [])], lineIds: [...(g.lineIds || [])] });
        setError('');
        setAliasInput('');
    };
    const clearForm = () => { setForm(blank()); setError(''); setAliasInput(''); };

    const addAlias = () => {
        const s = aliasInput.trim();
        if (!s) return;
        if (!form.aliases.some(a => aliasKey(a) === aliasKey(s))) setForm(f => ({ ...f, aliases: [...f.aliases, s] }));
        setAliasInput('');
    };
    const removeAlias = (a) => setForm(f => ({ ...f, aliases: f.aliases.filter(x => x !== a) }));

    const commit = async (isNew) => {
        const name = form.name.trim();
        if (!name) { setError('A grade needs a name.'); return; }
        const clash = findGradeByName(grades, name);
        if (clash && clash.id !== form.id) { setError(`"${clash.name}" already exists.`); return; }

        const id = isNew ? uuidv4() : form.id;
        // What this save is being given, to compare against once it comes back.
        const submitted = { name, spec: form.spec.trim(), aliases: form.aliases, lineIds: form.lineIds };
        const orig = (!isNew && all.find(g => g.id === id)) || makeGrade(id, { name });
        const next = { ...orig, name, spec: form.spec.trim(), lineIds: form.lineIds, aliases: [], deleted: false };
        // Re-add this grade's spellings through assignAliases so any that belonged to
        // another grade are taken off it in the same commit.
        const moved = assignAliases([...all.filter(g => g.id !== id), next], id, form.aliases);
        const byId = new Map(moved.map(g => [g.id, g]));
        if (!byId.has(id)) byId.set(id, next);

        setBusy(true);
        try {
            await save([...byId.values()], user?.email || '');
            const saved = byId.get(id);
            /* Show what was actually written — assignAliases may have normalised or moved a
               spelling — but never over the top of an edit made WHILE the save was in
               flight. A batch commit is a network round trip, and typing a second spelling
               during it used to have the form replaced underneath, so the entry vanished
               with a success toast on screen. Each field is only taken from the save if it
               still holds what was submitted. */
            setForm(f => ({
                id,
                name: f.name === submitted.name ? saved.name : f.name,
                spec: f.spec === submitted.spec ? saved.spec : f.spec,
                aliases: sameList(f.aliases, submitted.aliases) ? [...saved.aliases] : f.aliases,
                lineIds: sameList(f.lineIds, submitted.lineIds) ? [...(saved.lineIds || [])] : f.lineIds,
            }));
            setError('');
            setToast?.({ show: true, text: isNew ? `Grade "${name}" added` : `Grade "${name}" updated`, clr: 'success' });
        } catch (e) {
            setToast?.({ show: true, text: `Not saved: ${e?.code || e?.message || e}`, clr: 'fail' });
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        const g = all.find(x => x.id === form.id);
        if (!g) return;
        try {
            await save([{ ...g, deleted: true }], user?.email || '');
            setToast?.({ show: true, text: `Grade "${g.name}" deleted — its spellings are unclassified again`, clr: 'success' });
            clearForm();
        } catch (e) {
            setToast?.({ show: true, text: `Not deleted: ${e?.code || e?.message || e}`, clr: 'fail' });
        }
    };

    const parsedSpec = parseAssay(form.spec);
    const labelCls = 'responsiveTextTable font-medium text-[var(--ink-muted)] mb-1';
    const inputCls = 'w-full h-8 px-3 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] responsiveTextTitle outline-none transition-colors focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)]';

    return (
        <div className='p-4 rounded-2xl flex flex-col md:flex-row w-full gap-4'>
            <div className="w-full md:w-[27%] flex-shrink-0 rounded-2xl p-2 bg-[var(--bg-subtle)]">
                <p className='flex items-center gap-1 responsiveTextInput font-medium pl-2 text-[var(--ink)]'>
                    Grades <span className='text-[var(--ink-muted)] tnum'>({grades.length})</span>
                </p>
                <div className='relative mt-1.5 px-1'>
                    <input value={filter} onChange={e => setFilter(e.target.value)} placeholder='Find grade or spelling'
                        className='input w-full h-8 pr-8' />
                    <SearchAdornment value={filter} onClear={() => setFilter('')} />
                </div>
                <ul className="flex flex-col mt-1 py-1 max-h-96 overflow-auto custom-scroll">
                    {list.map(g => (
                        <li key={g.id} onClick={() => select(g)}
                            className={`cursor-pointer flex items-center gap-2 py-1.5 px-3 responsiveTextInput text-[var(--ink)] rounded-lg hover:bg-[var(--bg-card)] ${form.id === g.id ? 'font-medium bg-[var(--bg-card)]' : ''}`}>
                            <span className="truncate flex-1">{g.name}</span>
                            <Tltip direction='left' tltpText={`${(g.aliases || []).length} spelling${(g.aliases || []).length === 1 ? '' : 's'}`}>
                                <span className="responsiveTextTable text-[var(--ink-muted)] tnum cursor-default">{(g.aliases || []).length}</span>
                            </Tltip>
                        </li>
                    ))}
                    {ready && list.length === 0 && (
                        <li className='px-3 py-2 responsiveTextTable text-[var(--ink-muted)]'>
                            {filter ? 'Nothing matches' : 'No grades yet. Add one here, or merge rows on the Stocks page.'}
                        </li>
                    )}
                </ul>
            </div>

            <div className='flex flex-col w-full bg-[var(--bg-subtle)] p-4 rounded-2xl'>
                <div className='pb-2 mt-1 w-full gap-4 flex flex-wrap h-fit'>
                    <Tltip direction='top' tltpText='Add a new grade'>
                        <button className={`supplierAddButton ${form.id ? 'cursor-not-allowed' : ''}`} disabled={!!form.id || busy} onClick={() => commit(true)}>
                            <BtnIcon action="add" />Add
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Save changes to this grade'>
                        <button className='supplierButton' disabled={!form.id || busy} onClick={() => commit(false)}>
                            <BtnIcon action="update" />Update
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete grade'>
                        <button className='supplierButton' disabled={!form.id || busy} onClick={() => setIsDeleteOpen(true)}>
                            <BtnIcon action="delete" />Delete
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Clear form'>
                        <button className='supplierButton' onClick={clearForm}>
                            <BtnIcon action="clear" />Clear
                        </button>
                    </Tltip>
                </div>

                <div className='border border-[var(--line)] p-4 rounded-2xl mt-1 shadow-card w-full bg-[var(--bg-card)] flex flex-col gap-4'>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className='flex flex-col'>
                            <label className={labelCls}>Name</label>
                            <input className={inputCls} value={form.name} placeholder='e.g. 40Ni'
                                onChange={e => { setForm({ ...form, name: e.target.value }); setError(''); }} />
                            {error && <p className='responsiveTextTable text-[var(--danger-text)] mt-1'>{error}</p>}
                        </div>
                        <div className='flex flex-col'>
                            <label className={labelCls}>Nominal spec</label>
                            <input className={inputCls} value={form.spec} placeholder='e.g. 42Ni 12Cr 3Mo 3Nb 6Co 2Ti'
                                onChange={e => setForm({ ...form, spec: e.target.value })} />
                            {form.spec.trim() && (
                                <p className='responsiveTextTable text-[var(--ink-muted)] mt-1'>
                                    {hasAssay(parsedSpec)
                                        ? <>Reads as <span className='tnum text-[var(--ink)]'>{formatAssay(parsedSpec)}</span></>
                                        : 'No elements recognised — kept as written'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className={labelCls}>Spellings that mean this grade</p>
                        {form.aliases.length === 0 ? (
                            <p className='responsiveTextTable text-[var(--ink-muted)]'>None yet.</p>
                        ) : (
                            <ul className='flex flex-wrap gap-1.5'>
                                {form.aliases.map(a => {
                                    const owner = owners.get(aliasKey(a));
                                    const movesFrom = owner && owner.id !== form.id ? owner.name : '';
                                    return (
                                        <li key={a} className='inline-flex items-center gap-1 pl-2 pr-1 h-7 rounded-lg border border-[var(--line)] bg-[var(--bg-subtle)] responsiveTextTable text-[var(--ink)] max-w-full'>
                                            <span className='truncate'>{a}</span>
                                            {movesFrom && <span className='text-[var(--warn-text)] shrink-0'>· moves from {movesFrom}</span>}
                                            <button type='button' aria-label={`Remove ${a}`} className='cell-clear text-[var(--ink-muted)]' onClick={() => removeAlias(a)}>
                                                <BtnIcon action="close" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        <div className='flex gap-2 mt-2'>
                            <input className={inputCls} value={aliasInput} placeholder='Add a spelling, e.g. 40Ni Refinery Turnings'
                                onChange={e => setAliasInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }} />
                            <button type='button' className='whiteButton shrink-0' onClick={addAlias} disabled={!aliasInput.trim()}>
                                <BtnIcon action="add" />Add
                            </button>
                        </div>
                    </div>

                    {form.lineIds.length > 0 && (
                        <div className='flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--line)]'>
                            <p className='responsiveTextTable text-[var(--ink)]'>
                                {form.lineIds.length} PO line{form.lineIds.length === 1 ? ' is' : 's are'} set to this grade individually
                                <span className='text-[var(--ink-muted)]'> — spelled like another grade, but really this one.</span>
                            </p>
                            <button type='button' className='whiteButton shrink-0' onClick={() => setForm(f => ({ ...f, lineIds: [] }))}>
                                <BtnIcon action="clear" />Clear
                            </button>
                        </div>
                    )}

                    <p className='responsiveTextTable text-[var(--ink-muted)]'>
                        Grades are shared by IMS and GIS. Changes apply everywhere at once, including stock already received.
                        Save with Update after editing spellings.
                    </p>
                </div>
            </div>

            <ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
                ttl='Delete grade?' txt='Its spellings become unclassified again. Stock, contracts and invoices are not touched.'
                doAction={remove} />
        </div>
    );
};

export default Grades;
