'use client';
import { useContext, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Selector } from '@components/selectors/selectShad';
import { SettingsContext } from '@contexts/useSettingsContext';
import { UserAuth } from '@contexts/useAuthContext';
import useGrades from '../hooks/useGrades';
import { BtnIcon } from '@components/buttonIcons';
import Tltip from '@components/tlTip';
import GradeEditModal from '@components/GradeEditModal';
import { assignGradeToLine, findGradeByName, isExcluded, makeGrade, resolveGrade, suggestGrade } from '@utils/grades';

/* The Grade of one PO line.

   It shows what the registry already says — a grade set on this line, else the grade its
   spelling belongs to — so on a repeat PO it is right before anyone touches it.

   Picking, typing or clearing a grade here changes THIS line and no other (utils/grades.js
   assignGradeToLine). It used to hand the line's spelling to the grade, so every row
   spelled the same way — on this PO and on others — changed with it, and a mistaken pick
   could not be taken back from here (client, 2026-09-25). The spelling is only remembered
   to OFFER the grade on the next line spelled the same way.

   ✎ opens the grade itself — name, spec, spellings, delete — the same editor as
   Settings → Grades, so a grade made here can be amended here.

   Nothing is written onto the contract. Grades resolve live, so a later re-map in
   Settings moves this line and every lot received under it. */
export default function GradeCell({ lineId, description, disabled = false }) {
    const { grades, all, index, profiles, save } = useGrades();
    const { user } = UserAuth();
    const { setToast } = useContext(SettingsContext);
    const [editId, setEditId] = useState(null);

    const resolved = resolveGrade(index, { lineId, description });
    const setOnLine = lineId ? index.byLine.get(lineId) : null;
    const hasText = String(description ?? '').trim() !== '';
    /* A spelling the registry has never seen still usually IS a known grade — the same
       name with a different note, chemistry inside a grade's range, or a spelling already
       picked for a grade on another line. Offered under the empty box, one click to take —
       but never the grade this line was just cleared of. */
    const suggestion = useMemo(() => {
        if (resolved || !hasText || disabled) return null;
        const s = suggestGrade(profiles, description);
        return s && !isExcluded(index, lineId, s.grade.id) ? s : null;
    }, [resolved, hasText, disabled, profiles, description, index, lineId]);

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

    // This line, empty — whether its grade was set here or came from its spelling.
    const clearLine = () => commit(assignGradeToLine(all, null, { lineId, description }));

    return (
        <div onClick={(e) => e.stopPropagation()}
            title={!hasText ? 'Type the material first'
                : setOnLine ? 'Set on this line'
                    : resolved ? 'From how this material is spelled' : 'No grade — pick one or type a new name'}>
            <div className="flex items-center gap-1">
                <div className="flex-1 min-w-0">
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
                        clear={resolved && !disabled ? clearLine : undefined}
                        clearLabel='No grade'
                    />
                </div>
                {resolved && (
                    <Tltip direction='top' tltpText={`Edit ${resolved.name} — name, spec, spellings`}>
                        <button type="button" aria-label={`Edit grade ${resolved.name}`}
                            onClick={() => setEditId(resolved.id)}
                            className="inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-control text-[var(--ink-muted)] opacity-60 hover:opacity-100 hover:text-[var(--brand)] transition-opacity">
                            <BtnIcon action="edit" />
                        </button>
                    </Tltip>
                )}
            </div>
            {suggestion && (
                <button type="button" onClick={() => pick(suggestion.grade.id)}
                    title={suggestion.reason === 'name'
                        ? `Same material as one already in ${suggestion.grade.name} — click to use it`
                        : `The chemistry fits ${suggestion.grade.name} — click to use it`}
                    className="mt-0.5 flex items-center gap-1 max-w-full responsiveTextTable font-medium text-[var(--brand-strong)] hover:underline">
                    <BtnIcon action="confirm" />
                    <span className="truncate">Use {suggestion.grade.name}</span>
                </button>
            )}
            {/* Mounted only while open: every open starts from the grade as saved. */}
            {editId && (
                <GradeEditModal gradeId={editId} isOpen={!!editId}
                    setIsOpen={(open) => { if (!open) setEditId(null); }} />
            )}
        </div>
    );
}
