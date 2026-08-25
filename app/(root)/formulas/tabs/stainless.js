'use client';
import { useState } from 'react';
import {
    FormulaCard,
    ElementTable,
    Field,
    ReadOnlyField,
    ResultRow,
    Legend,
    inputCell,
    computedCell,
    fmt,
} from './parts';

/* Stainless: Cost and Sales share a composition, and differ only in how each
   element gets priced. Both cards are rendered by ONE component (SideCard, at
   the bottom of this file) so they cannot end up different sizes — see the note
   at the top of parts.js for what the client was actually seeing.

   The 580 lines of commented-out pre-2026-08 markup that used to sit above this
   are gone; git has them if they are ever wanted. */

const ELEMENTS = ['Ni', 'Cr', 'Mo', 'Fe'];

const Stainless = ({ value, handleChange }) => {
    const [focusedField, setFocusedField] = useState(null);
    const s = value?.stainless ?? {};
    const g = value?.general ?? {};

    const n = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

    /* Fe is the balance of the alloy. The price maths used to read a SAVED
       stainless.fe while the table showed this computed one, so changing Ni
       moved the percentage on screen and left the Solids price on the old
       figure. Nothing can edit fe, so the two only ever drift apart. One
       source now — the number you can see. */
    const fe = (100 - n(s.ni) - n(s.cr) - n(s.mo)).toFixed(2);

    const solidsPrice =
        n(s.ni) * n(g.nilme) * n(s.formulaNiCost) / 10000 +
        n(s.cr) * n(s.crPrice) / 100 +
        n(s.mo) * n(s.moPrice) / 100 +
        n(fe) * n(s.fePrice) / 100;

    const solidsPrice1 =
        n(s.ni) * n(g.nilme) / 100 * n(s.formulaNiPrice) / 100 +
        n(s.cr) / 100 * n(g.chargeCrLb) * n(g.mt) * n(s.crPriceArgus) / 100 +
        n(s.mo) / 100 * (n(g.MoOxideLb) * n(s.moPriceArgus) * n(g.mt) / 100) +
        n(fe) * n(s.fePrice1) / 100;

    const set = (name, v) => handleChange({ target: { name, value: v } }, 'stainless');
    const commit = (name, raw) => {
        const num = parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) set(name, num.toFixed(2));
    };

    /* A percentage you type. */
    const pctCell = (name) => (
        <input
            type="text"
            className={inputCell}
            name={name}
            value={(s[name] ?? '') + '%'}
            onChange={(e) => set(name, e.target.value.replace('%', ''))}
            onBlur={(e) => commit(name, e.target.value.replace('%', ''))}
        />
    );

    /* A price you type — plain digits while it has focus, formatted once it
       doesn't. */
    const moneyCell = (name) => (
        <input
            type="text"
            className={inputCell}
            name={name}
            value={focusedField === name ? (s[name] ?? '') : fmt(n(s[name]).toFixed(2))}
            onFocus={() => setFocusedField(name)}
            onChange={(e) => set(name, e.target.value)}
            onBlur={(e) => {
                setFocusedField(null);
                commit(name, e.target.value);
            }}
        />
    );

    const calc = (text) => <div className={computedCell}>{text}</div>;

    /* Ni priced off the LME, per side. Also the basis for the $/lb hint. */
    const niCost = n(g.nilme) * n(s.formulaNiCost) / 100;
    const niSales = n(g.nilme) * n(s.formulaNiPrice) / 100;
    const perLb = (mtPrice) => (n(g.mt) ? fmt((mtPrice / n(g.mt)).toFixed(2)) + ' / lb' : '');

    return value.stainless != null ? (
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
                        <Field label="Cr / lb">
                            <ReadOnlyField value={n(g.mt) ? fmt((n(s.crPrice) / n(g.mt)).toFixed(2)) : '$0'} />
                        </Field>
                        <Field label="Mo / lb">
                            <ReadOnlyField value={n(g.mt) ? fmt((n(s.moPrice) / n(g.mt)).toFixed(2)) : '$0'} />
                        </Field>
                    </>
                }
                results={[
                    { label: 'Solids price', value: fmt(solidsPrice.toFixed(2)) },
                    { label: 'Turnings price', value: fmt((solidsPrice * 0.92).toFixed(2)) },
                    { label: 'Price / Euro', value: fmt((solidsPrice / n(g.euroRate)).toFixed(2), '€') },
                ]}
            />

            <SideCard
                title="Sales"
                subtitle="Sales-side composition and pricing"
                composition={[calc((s.ni ?? '') + '%'), calc((s.cr ?? '') + '%'), calc((s.mo ?? '') + '%'), calc(fe + '%')]}
                prices={[
                    calc(fmt(niSales.toFixed(2))),
                    calc(fmt((n(g.chargeCrLb) * n(g.mt) * n(s.crPriceArgus) / 100).toFixed(2))),
                    calc(fmt((n(g.MoOxideLb) * n(s.moPriceArgus) * n(g.mt) / 100).toFixed(2))),
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
                results={[
                    { label: 'Solids price', value: fmt(solidsPrice1.toFixed(2)) },
                    { label: 'Turnings price', value: fmt((solidsPrice1 * 0.92).toFixed(2)) },
                    { label: 'Price / Euro', value: fmt((solidsPrice1 / n(g.euroRate)).toFixed(2), '€') },
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

export default Stainless;
