'use client';
import { useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Selector } from '@components/selectors/selectShad';
import { SettingsContext } from '@contexts/useSettingsContext';
import { UserAuth } from '@contexts/useAuthContext';
import useGrades from '../hooks/useGrades';
import { assignGradeToLine, findGradeByName, makeGrade, resolveGrade } from '@utils/grades';

/* The Grade of one PO line.

   It shows what the registry already says — this line's explicit assignment, else the
   grade its spelling belongs to — so on a repeat PO it is right before anyone touches
   it. Picking or typing a grade teaches the registry (utils/grades.js
   assignGradeToLine): an unclaimed spelling becomes an alias for next month, and a
   spelling that normally means another grade makes this one line the exception.

   Nothing is written onto the contract. Grades resolve live, so a later re-map in
   Settings moves this line and every lot received under it. */
export default function GradeCell({ lineId, description, disabled = false }) {
    const { grades, all, index, save } = useGrades();
    const { user } = UserAuth();
    const { setToast } = useContext(SettingsContext);

    const resolved = resolveGrade(index, { lineId, description });
    const explicit = lineId ? index.byLine.get(lineId) : null;
    const hasText = String(description ?? '').trim() !== '';

    const commit = async (changed) => {
        if (!changed.length) return;
        try {
            await save(changed, user?.email || '');
        } catch (e) {
            setToast?.({ show: true, text: `Grade not saved: ${e?.code || e?.message || e}`, clr: 'fail' });
        }
    };

    const pick = (id) => commit(assignGradeToLine(all, id, { lineId, description }));

    const create = (name) => {
        const existing = findGradeByName(grades, name);
        if (existing) return pick(existing.id);
        const grade = makeGrade(uuidv4(), { name });
        const changed = assignGradeToLine([...all, grade], grade.id, { lineId, description });
        if (!changed.some(g => g.id === grade.id)) changed.push(grade);
        return commit(changed);
    };

    // Clears only an assignment made for this line; a spelling's grade is managed in Settings.
    const clearExplicit = () => commit(assignGradeToLine(all, null, { lineId, description }));

    return (
        <div onClick={(e) => e.stopPropagation()}
            title={explicit ? 'Set for this line only' : resolved ? 'From how this material is spelled' : 'No grade — pick one or type a new name'}>
            <Selector
                arr={grades.map(g => ({ id: g.id, label: g.name }))}
                value={{ gradeId: resolved?.id || '' }}
                onChange={pick}
                name='gradeId'
                secondaryName='label'
                classes='h-7'
                sizeVar='var(--fs-table)'
                disabled={disabled || !lineId || !hasText}
                onCreate={create}
                createLabel='New grade'
                clear={explicit ? clearExplicit : undefined}
            />
        </div>
    );
}
