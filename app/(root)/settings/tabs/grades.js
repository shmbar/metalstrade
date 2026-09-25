'use client';
import { useMemo, useState } from 'react';
import ModalToDelete from '../../../../components/modalToProceed';
import Tltip from '../../../../components/tlTip';
import { BtnIcon, SearchAdornment } from '../../../../components/buttonIcons';
import { GradeFields, useGradeForm } from '../../../../components/GradeForm';
import { matchesAllWords } from '@utils/search';

/* The grade registry, for editing. Grades are also made from a PO line's Grade cell and by
   ticking rows on the Stocks page and merging; this is where the whole list is seen, and
   where a spelling that landed in the wrong grade is pulled out. The form itself is shared
   with the ✎ beside a PO line's Grade (components/GradeForm.js). */

const Grades = () => {
    const g = useGradeForm();
    const { grades, ready, form, busy } = g;
    const [filter, setFilter] = useState('');
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const list = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return grades
            .filter(x => !q || matchesAllWords([x.name, x.aliases], q))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    }, [grades, filter]);

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
                    {list.map(x => (
                        <li key={x.id} onClick={() => g.select(x)}
                            className={`cursor-pointer flex items-center gap-2 py-1.5 px-3 responsiveTextInput text-[var(--ink)] rounded-lg hover:bg-[var(--bg-card)] ${form.id === x.id ? 'font-medium bg-[var(--bg-card)]' : ''}`}>
                            <span className="truncate flex-1">{x.name}</span>
                            <Tltip direction='left' tltpText={`${(x.aliases || []).length} spelling${(x.aliases || []).length === 1 ? '' : 's'}`}>
                                <span className="responsiveTextTable text-[var(--ink-muted)] tnum cursor-default">{(x.aliases || []).length}</span>
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
                        <button className={`supplierAddButton ${form.id ? 'cursor-not-allowed' : ''}`} disabled={!!form.id || busy} onClick={() => g.commit(true)}>
                            <BtnIcon action="add" />Add
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Save changes to this grade'>
                        <button className='supplierButton' disabled={!form.id || busy} onClick={() => g.commit(false)}>
                            <BtnIcon action="update" />Update
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete grade'>
                        <button className='supplierButton' disabled={!form.id || busy} onClick={() => setIsDeleteOpen(true)}>
                            <BtnIcon action="delete" />Delete
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Clear form'>
                        <button className='supplierButton' onClick={g.clearForm}>
                            <BtnIcon action="clear" />Clear
                        </button>
                    </Tltip>
                </div>

                <div className='border border-[var(--line)] p-4 rounded-2xl mt-1 shadow-card w-full bg-[var(--bg-card)]'>
                    <GradeFields g={g} />
                </div>
            </div>

            <ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
                ttl='Delete grade?' txt='Its spellings become unclassified again. Stock, contracts and invoices are not touched.'
                doAction={g.remove} />
        </div>
    );
};

export default Grades;
