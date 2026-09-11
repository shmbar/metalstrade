'use client';
import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { BtnIcon } from '@components/buttonIcons';
import { ELEMENTS, assayOf, assayRange, formatAssay, hasAssay, parseAssay } from '@utils/grades';

/* The chemistry behind a stock row: which grade it resolves to, what that grade is sold
   as, and what each lot actually assayed — the "718 Offspec is different every lot"
   question answered in one place.

   Figures from a lot's own analysis are shown plainly. Figures lifted from the
   description are set in italic: a description carries the PO's nominal assay, not a
   measurement of the lot, and the two must not be read as the same kind of number.

   Click, not hover: this sits inside rows that expand and open on click, and a hover
   card over a dense table fires on every pass of the mouse. */

const fmtQty = (q) => (Number(q) || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtEl = (v) => (Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '');

export default function ChemistryPopover({ lots = [], description = '', grade = null }) {
    const rows = useMemo(() => lots
        .filter(l => l && l.type !== 'out')
        .map(l => {
            const name = l.productsData?.find(p => p.id === (l.descriptionId || l.description))?.description
                || l.descriptionName || description;
            const { assay, source } = assayOf(l, name);
            return { id: l.id, po: l.order || '—', qnty: l.qnty, assay, source };
        }), [lots, description]);

    const cols = useMemo(() => ELEMENTS.filter(e => rows.some(r => Number.isFinite(r.assay[e]))), [rows]);
    const withAssay = rows.filter(r => hasAssay(r.assay));
    const range = withAssay.length > 1 ? assayRange(withAssay.map(r => r.assay)) : null;
    const recorded = rows.some(r => r.source === 'analysis');
    const nominal = grade?.spec ? (formatAssay(parseAssay(grade.spec)) || grade.spec) : '';
    const stop = (e) => e.stopPropagation();

    if (!rows.length) return null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button type="button" aria-label="Chemistry per lot" title="Chemistry per lot"
                    onClick={stop} onPointerDown={stop}
                    className={`inline-flex items-center justify-center shrink-0 w-5 h-5 rounded-control transition-opacity
                        ${recorded ? 'text-[var(--brand)]' : 'text-[var(--ink-muted)] opacity-60 hover:opacity-100'}`}>
                    <BtnIcon action="assay" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" onClick={stop}
                className="w-auto min-w-[300px] max-w-[560px] p-3 bg-[var(--bg-card)] border-[var(--line)]">
                <div className="flex items-baseline justify-between gap-3">
                    <p className="responsiveText font-semibold text-[var(--ink)] truncate">
                        {grade ? grade.name : 'No grade'}
                    </p>
                    <span className="responsiveTextTable text-[var(--ink-muted)] shrink-0">
                        {rows.length} lot{rows.length === 1 ? '' : 's'}
                    </span>
                </div>
                {(!grade || grade.name !== description) && description && (
                    <p className="responsiveTextTable text-[var(--ink-muted)] truncate">{description}</p>
                )}
                {grade && (
                    <p className="responsiveTextTable mt-1">
                        <span className="text-[var(--ink-muted)]">Nominal </span>
                        <span className="tnum text-[var(--ink)]">{nominal || '—'}</span>
                    </p>
                )}

                {cols.length === 0 ? (
                    <p className="responsiveTextTable text-[var(--ink-muted)] mt-2">
                        No chemistry recorded yet. Add each lot’s analysis in its Materials Breakdown.
                    </p>
                ) : (
                    <div className="mt-2 overflow-auto max-h-64">
                        <table className="w-full responsiveTextTable">
                            <thead>
                                <tr>
                                    <th className="text-left">PO</th>
                                    <th className="text-right">MT</th>
                                    {cols.map(e => <th key={e} className="text-right">{e}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.id}>
                                        <td className="text-left whitespace-nowrap">{r.po}</td>
                                        <td className="text-right tnum whitespace-nowrap">{fmtQty(r.qnty)}</td>
                                        {cols.map(e => (
                                            <td key={e} className={`text-right tnum ${r.source === 'description' ? 'italic text-[var(--ink-muted)]' : ''}`}>
                                                {fmtEl(r.assay[e])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            {range && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={2} className="text-left font-medium">Range</td>
                                        {cols.map(e => (
                                            <td key={e} className="text-right tnum whitespace-nowrap">
                                                {range[e] ? (range[e].min === range[e].max
                                                    ? fmtEl(range[e].min)
                                                    : `${fmtEl(range[e].min)}–${fmtEl(range[e].max)}`) : ''}
                                            </td>
                                        ))}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
                {cols.length > 0 && rows.some(r => r.source === 'description') && (
                    <p className="responsiveTextTable text-[var(--ink-muted)] mt-1.5">
                        <span className="italic">Italic</span> figures come from the description (nominal), not a lot analysis.
                    </p>
                )}
            </PopoverContent>
        </Popover>
    );
}
