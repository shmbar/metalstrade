'use client';
import { useEffect, useState } from 'react';
import Modal from '@components/modal';
import ModalToDelete from '@components/modalToProceed';
import { BtnIcon } from '@components/buttonIcons';
import { GradeFields, useGradeForm } from '@components/GradeForm';

/* A grade, amended from the PO page: the ✎ beside a line's Grade opens the grade that line
   shows in the same editor Settings → Grades uses — rename it, set its spec, move or remove
   a spelling, or delete it. A change applies to the grade everywhere, not only this line. */
export default function GradeEditModal({ gradeId, isOpen, setIsOpen }) {
    const g = useGradeForm();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [loaded, setLoaded] = useState(null);
    const grade = g.all.find(x => x.id === gradeId && !x.deleted) || null;

    /* Fill the form once the grade is known — the registry can still be arriving when the
       dialog opens — and never again while it is open, so a snapshot arriving mid-edit
       (anyone's save, on IMS or GIS) cannot overwrite what is being typed. */
    useEffect(() => {
        if (isOpen && grade && loaded !== grade.id) {
            g.select(grade);
            setLoaded(grade.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, grade, loaded]);

    const save = async () => { if (await g.commit(false)) setIsOpen(false); };
    const del = async () => { if (await g.remove()) setIsOpen(false); };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='md' title='Edit grade'
            subtitle='Shared by IMS and GIS — a change applies wherever this grade is used'>
            <div className='p-4 flex flex-col gap-4'>
                {loaded ? <GradeFields g={g} saveLabel='Save' /> : (
                    <p className='responsiveText text-[var(--ink-muted)]'>
                        {g.ready ? 'This grade no longer exists.' : 'Loading…'}
                    </p>
                )}
                <div className='flex items-center gap-2'>
                    <button type='button' className='blackButton' disabled={!loaded || g.busy} onClick={save}>
                        <BtnIcon action="update" />Save
                    </button>
                    <button type='button' className='whiteButton' disabled={!loaded || g.busy} onClick={() => setIsDeleteOpen(true)}>
                        <BtnIcon action="delete" />Delete grade
                    </button>
                </div>
            </div>
            <ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
                ttl='Delete grade?' txt='Every line and lot of this grade is left without one, on IMS and GIS. Stock, contracts and invoices are not touched.'
                doAction={del} />
        </Modal>
    );
}
