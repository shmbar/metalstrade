'use client';
import { useState } from 'react';
import {
    FormulaCard,
    ElementTable,
    Field,
    ResultRow,
    Legend,
    inputCell,
    computedCell,
    fmt,
} from './parts';

/* SuperAlloys prices one composition two ways, like the other two tabs — but it
   used to say so nowhere. Cost and Sales sat side by side inside a single card
   titled "Cost", with no headings of their own, in `w-fit` result boxes that
   each sized themselves to whatever figure they happened to hold. That is the
   tab where "the Cost box and the Sales box are unequal size" was literally
   true. They are two real cards now, off the same component as FeNiCr and
   Stainless.

   The 640 lines of commented-out pre-2026-08 markup that used to sit above this
   are gone; git has them if they are ever wanted. */

const ELEMENTS = ['ni', 'cr', 'mo', 'nb', 'co', 'w', 'hf', 'ta', 'fe'];
const LABELS = ['Ni', 'Cr', 'Mo', 'Nb', 'Co', 'W', 'Hf', 'Ta', 'Fe'];
/* Ni is the LME price per pound and Mo is the Mo Oxide quote, both off the bar
   at the top of the page — read-only here. The rest are typed. */
const PRICE_FIELDS = ['niPrice', 'crPrice', 'MoOxideLb', 'nbPrice', 'coPrice', 'wPrice', 'hfPrice', 'taPrice', 'fePrice'];

const SupperAlloys = ({ value, handleChange }) => {
    const [focusedField, setFocusedField] = useState(null);
    const a = value?.supperalloys ?? {};
    const g = value?.general ?? {};

    const n = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

    const fe = (100 - n(a.ni) - n(a.cr) - n(a.mo) - n(a.nb) - n(a.co) - n(a.w) - n(a.hf) - n(a.ta)).toFixed(2);

    /* Unchanged from before the rework, deliberately — two things in it look
       wrong but both change what the page quotes, so they are Zak's call to
       make with the client, not a side effect of a layout fix:
         · the Mo term reads supperalloys.moPrice, while the Mo cell on screen
           shows the Mo Oxide quote from the top bar. Nothing writes moPrice,
           so Mo currently contributes nothing.
         · Fe is priced in the table but left out of the sum. */
    const solidsPrice =
        n(a.ni) * (n(g.nilme) / n(g.mt || 1)) / 100 +
        n(a.cr) * n(a.crPrice) / 100 +
        n(a.mo) * n(a.moPrice) / 100 +
        n(a.nb) * n(a.nbPrice) / 100 +
        n(a.co) * n(a.coPrice) / 100 +
        n(a.w) * n(a.wPrice) / 100 +
        n(a.hf) * n(a.hfPrice) / 100 +
        n(a.ta) * n(a.taPrice) / 100;

    const set = (name, v) => handleChange({ target: { name, value: v } }, 'supperalloys');
    const commit = (name, raw) => {
        const num = parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) set(name, num.toFixed(2));
    };

    const pctCell = (name) => (
        <input
            type="text"
            className={inputCell}
            name={name}
            value={(a[name] ?? '') + '%'}
            onChange={(e) => set(name, e.target.value.replace('%', ''))}
            onBlur={(e) => commit(name, e.target.value.replace('%', ''))}
        />
    );

    const moneyCell = (name) => (
        <input
            type="text"
            className={inputCell}
            name={name}
            value={focusedField === name ? (a[name] ?? '') : fmt(n(a[name]).toFixed(2))}
            onFocus={() => setFocusedField(name)}
            onChange={(e) => set(name, e.target.value)}
            onBlur={(e) => {
                setFocusedField(null);
                commit(name, e.target.value);
            }}
        />
    );

    const calc = (text) => <div className={computedCell}>{text}</div>;

    const composition = ELEMENTS.map((el) => (el === 'fe' ? calc(fe + '%') : pctCell(el)));
    const prices = PRICE_FIELDS.map((field) => {
        if (field === 'niPrice') return calc(fmt((n(g.nilme) / n(g.mt || 1)).toFixed(2)));
        if (field === 'MoOxideLb') return calc(fmt(n(g.MoOxideLb).toFixed(2)));
        return moneyCell(field);
    });

    const side = (formulaField) => {
        const base = solidsPrice * n(a[formulaField]) / 100;
        return [
            { label: 'Solids price', value: fmt(base.toFixed(2)) },
            { label: 'Price per MT', value: fmt((base * n(g.mt)).toFixed(2)) },
            { label: 'Price / Euro', value: fmt((base / n(g.euroRate || 1)).toFixed(2), '€') },
        ];
    };

    return value.supperalloys != null ? (
        <div className="flex flex-col gap-4">
            <FormulaCard title="Composition" subtitle="One alloy, priced per pound — shared by both sides below" aside={<Legend />}>
                <ElementTable
                    columns={LABELS}
                    rows={[
                        { label: 'Composition', unit: '%', cells: composition },
                        { label: 'Price', unit: '$ / lb', cells: prices },
                    ]}
                />
            </FormulaCard>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SideCard title="Cost" subtitle="What the alloy costs to buy" formula={pctCell('formulaIntsCost')} results={side('formulaIntsCost')} />
                <SideCard title="Sales" subtitle="What the alloy sells for" formula={pctCell('formulaIntsPrice')} results={side('formulaIntsPrice')} />
            </div>
        </div>
    ) : null;
};

const SideCard = ({ title, subtitle, formula, results }) => (
    <FormulaCard title={title} subtitle={subtitle}>
        <div className="w-44">
            <Field label="Formula intrinsic">{formula}</Field>
        </div>
        <ResultRow tiles={results} />
    </FormulaCard>
);

export default SupperAlloys;
