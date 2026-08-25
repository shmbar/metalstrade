'use client';
import { useState } from 'react';
import {
    FormulaCard,
    ElementTable,
    Field,
    ReadOnlyField,
    ResultRow,
    TileInput,
    TileNote,
    Legend,
    inputCell,
    computedCell,
    fmt,
} from './parts';

/* FeNiCr: same anatomy as Stainless — one composition, two ways of pricing it.
   Both cards come out of the single SideCard below, so the pair is identical by
   construction; see the note at the top of parts.js.

   The 900 lines of commented-out pre-2026-08 markup that used to sit above this
   are gone; git has them if they are ever wanted. */

const ELEMENTS = ['Ni', 'Cr', 'Mo', 'Fe'];

const Fenicr = ({ value, handleChange }) => {
    const [focusedField, setFocusedField] = useState(null);
    const f = value?.fenicr ?? {};
    const g = value?.general ?? {};

    const n = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

    const fe = (100 - n(f.ni) - n(f.cr) - n(f.mo)).toFixed(2);

    const solidsPrice =
        n(f.ni) * n(g.nilme) * n(f.formulaNiCost) / 10000 +
        n(f.cr) * n(f.crPrice) / 100 +
        n(f.mo) * n(f.moPrice) / 100 +
        n(fe) * n(f.fePrice) / 100;

    const solidsPrice1 =
        n(f.ni) * n(g.nilme) / 100 * n(f.formulaNiPrice) / 100 +
        n(f.cr) / 100 * n(g.chargeCrLb) * n(g.mt) * n(f.crPriceArgus) / 100 +
        n(f.mo) / 100 * (n(g.MoOxideLb) * n(f.moPriceArgus) * n(g.mt) / 100) +
        n(fe) * n(f.fePrice1) / 100;

    const set = (name, v) => handleChange({ target: { name, value: v } }, 'fenicr');
    const commit = (name, raw) => {
        const num = parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) set(name, num.toFixed(2));
    };

    const pctCell = (name) => (
        <input
            type="text"
            className={inputCell}
            name={name}
            value={(f[name] ?? '') + '%'}
            onChange={(e) => set(name, e.target.value.replace('%', ''))}
            onBlur={(e) => commit(name, e.target.value.replace('%', ''))}
        />
    );

    const moneyCell = (name) => (
        <input
            type="text"
            className={inputCell}
            name={name}
            value={focusedField === name ? (f[name] ?? '') : fmt(n(f[name]).toFixed(2))}
            onFocus={() => setFocusedField(name)}
            onChange={(e) => set(name, e.target.value)}
            onBlur={(e) => {
                setFocusedField(null);
                commit(name, e.target.value);
            }}
        />
    );

    const calc = (text) => <div className={computedCell}>{text}</div>;

    /* The turnings discount, which was a bare 0.92 (Cost) / 0.9 (Sales) in the
       source with nothing on screen saying so — so the figure could not be
       checked or changed without a deploy (Zak, 2026-08-25). Each side reads
       from state and falls back to the number that was hard-coded on THAT side,
       so saved data quotes exactly what it did before until someone edits it.
       The 92/90 split is why the fallback is per-side rather than one constant. */
    const turnPct = (name, fallback) => {
        const v = f[name];
        return v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? fallback : Number(v);
    };
    const turnCell = (name, fallback) => (
        <TileInput
            name={name}
            value={turnPct(name, fallback).toFixed(2) + '%'}
            onChange={(e) => set(name, e.target.value.replace('%', ''))}
            onBlur={(e) => commit(name, e.target.value.replace('%', ''))}
        />
    );
    const euroNote = <TileNote>{fmt(n(g.euroRate).toFixed(2)) + ' / €'}</TileNote>;

    const niCost = n(g.nilme) * n(f.formulaNiCost) / 100;
    const niSales = n(g.nilme) * n(f.formulaNiPrice) / 100;
    const perLb = (mtPrice) => (n(g.mt) ? fmt((mtPrice / n(g.mt)).toFixed(2)) + ' / lb' : '');

    return value.fenicr != null ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SideCard
                title="Cost"
                subtitle="Purchase-side composition and pricing"
                composition={[pctCell('ni'), pctCell('cr'), pctCell('mo'), calc(fe + '%')]}
                prices={[calc(fmt(niCost.toFixed(2))), moneyCell('crPrice'), moneyCell('moPrice'), moneyCell('fePrice')]}
                fields={
                    <>
                        <Field label="Ni LME" hint={perLb(niCost)}>
                            <ReadOnlyField value={fmt(n(g.nilme).toFixed(2))} />
                        </Field>
                        <Field label="Formula × Ni">{pctCell('formulaNiCost')}</Field>
                    </>
                }
                results={[
                    { label: 'Solids ($/MT)', value: fmt(solidsPrice.toFixed(2)) },
                    {
                        label: 'Turnings ($/MT)',
                        value: fmt((solidsPrice * turnPct('turningsCost', 92) / 100).toFixed(2)),
                        note: turnCell('turningsCost', 92),
                    },
                    {
                        label: 'Price / Euro (€/MT)',
                        value: fmt((solidsPrice / n(g.euroRate)).toFixed(2), '€'),
                        note: euroNote,
                    },
                ]}
            />

            <SideCard
                title="Sales"
                subtitle="Sales-side composition and pricing"
                composition={[calc((f.ni ?? '') + '%'), calc((f.cr ?? '') + '%'), calc((f.mo ?? '') + '%'), calc(fe + '%')]}
                prices={[
                    calc(fmt(niSales.toFixed(2))),
                    calc(fmt((n(g.chargeCrLb) * n(g.mt) * n(f.crPriceArgus) / 100).toFixed(2))),
                    calc(fmt((n(g.MoOxideLb) * n(f.moPriceArgus) * n(g.mt) / 100).toFixed(2))),
                    moneyCell('fePrice1'),
                ]}
                /* Cr Argus and Mo Argus drive the two Cr/Mo prices above. The
                   2026-08-08 redesign dropped both inputs but kept the maths
                   reading them, so those prices were being set by numbers
                   nobody could reach any more. */
                fields={
                    <>
                        <Field label="Ni LME" hint={perLb(niSales)}>
                            <ReadOnlyField value={fmt(n(g.nilme).toFixed(2))} />
                        </Field>
                        <Field label="Formula × Ni">{pctCell('formulaNiPrice')}</Field>
                        <Field label="Cr Argus">{pctCell('crPriceArgus')}</Field>
                        <Field label="Mo Argus">{pctCell('moPriceArgus')}</Field>
                    </>
                }
                /* 90 here against the Cost side's 92 — the turnings discount has
                   always differed between the two sides on this tab. It is on
                   screen now, so the client can settle it either way. */
                results={[
                    { label: 'Solids ($/MT)', value: fmt(solidsPrice1.toFixed(2)) },
                    {
                        label: 'Turnings ($/MT)',
                        value: fmt((solidsPrice1 * turnPct('turningsPrice', 90) / 100).toFixed(2)),
                        note: turnCell('turningsPrice', 90),
                    },
                    {
                        label: 'Price / Euro (€/MT)',
                        value: fmt((solidsPrice1 / n(g.euroRate)).toFixed(2), '€'),
                        note: euroNote,
                    },
                ]}
            />
        </div>
    ) : null;
};

const SideCard = ({ title, subtitle, composition, prices, fields, results }) => (
    <FormulaCard title={title} subtitle={subtitle} aside={<Legend />}>
        <div className="flex flex-wrap items-start gap-3">
            <div className="shrink-0">
                <ElementTable
                    columns={ELEMENTS}
                    rows={[
                        { label: 'Composition', unit: '%', cells: composition },
                        { label: 'Price', unit: '$ / MT', cells: prices },
                    ]}
                />
            </div>
            {/* Capped columns, not stretched ones: when this block wraps under the
                    table on a narrower window the controls stay control-sized instead
                    of growing to 290px to hold "56.00%". */}
            <div className="flex-1 min-w-[218px] grid grid-cols-[repeat(2,minmax(0,112px))] gap-x-3 gap-y-2">{fields}</div>
        </div>
        <ResultRow tiles={results} />
    </FormulaCard>
);

export default Fenicr;
