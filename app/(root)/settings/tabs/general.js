import { useContext, useEffect, useRef } from 'react'
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { UserAuth } from "../../../../contexts/useAuthContext";
import Spinner from '../../../../components/spinner';
import CBox from '../_components/combobox.js'
import { getTtl } from '../../../../utils/languages'
import { Button } from '@components/ui/button';
import { BtnIcon } from '@components/buttonIcons';

/* Company Details, laid out to the client's mockup (2026-09-17, "ims-settings-fixed").
 *
 * What the mockup fixed about the previous version, and is kept here:
 *   · the card is capped at 920px — full-width rows put the last field half a
 *     screen from the first;
 *   · every field sits on ONE 12-column grid with its label ABOVE it, so inputs
 *     start on grid lines and line up row to row (a label beside its field moved
 *     each input by the label's own width);
 *   · width says what goes in: ZIP and Reg No. are short, Street and Name long;
 *   · small print sits under the field it explains, one hint per field — not two
 *     explanations joined in a distant line;
 *   · the non-radioactive example is a hint, not a placeholder that disappears on
 *     the first keystroke;
 *   · Website lives with Email under Contact; Payment term lives under Invoicing;
 *   · the save bar sticks to the bottom of the card.
 * Kept from the compact version: the app's own spacing and control height, and
 * the section name in a left rail. Fax stays (the mockup dropped it) because the
 * Annex VII PDF prints it — a value that prints must stay editable.
 *
 * Labels above fields cost height — this is taller than the label-beside version
 * (2026-09-12) and shorter than the original; the trade was the client's call. */
const fieldCls = "w-full h-8 min-w-0 px-2.5 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] responsiveTextInput placeholder:text-[var(--ink-muted)]";
const labelCls = "responsiveTextTable font-semibold text-[var(--ink-secondary)] leading-tight";
const hintCls = "responsiveTextTable text-[var(--ink-muted)] leading-snug";

// One band of the card: the section's name and one line on what it is for in the
// rail, its fields on the shared 12-column grid beside it.
const Section = ({ title, note, children }) => (
    <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-0">
            <span className="block responsiveTextTable font-semibold text-[var(--ink)]">{title}</span>
            {note && <span className={`block ${hintCls} mt-0.5`}>{note}</span>}
        </div>
        <div className="grid grid-cols-12 gap-x-3 gap-y-2 items-start">
            {children}
        </div>
    </div>
);

/* Label over control, hint under it. `span` is the 12-column width at md and up;
   below md every field is full width. `as` is a plain div for the language
   picker: that control is a Headless UI button with its own popup, and a <label>
   forwards clicks from anywhere inside it to that button — including clicks on
   the open option list. */
const Field = ({ label, span = 'md:col-span-4', hint, as: Tag = 'label', children }) => (
    <Tag className={`col-span-12 ${span} flex flex-col gap-1 min-w-0`}>
        <span className={labelCls}>{label}</span>
        {children}
        {hint && <span className={hintCls}>{hint}</span>}
    </Tag>
);

export const getLng = () => {
    return;
}

const languages = [{ lng: "English" }, { lng: "Русский" }]

// Has the company record arrived? The context starts as { lng } alone.
const loaded = (d) => d && Object.keys(d).some((k) => k !== 'lng');

const General = () => {
    const { compData, setCompData, updateCompanyData } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const ln = compData?.lng || 'English';

    // The last saved record, for Discard. Taken when the record first arrives and
    // again after each successful save — an unsaved edit is whatever differs. A
    // workspace with no record yet never gets one, and Discard just stays off.
    const saved = useRef(null);
    useEffect(() => {
        if (saved.current === null && loaded(compData)) saved.current = compData;
    }, [compData]);
    const dirty = saved.current !== null && JSON.stringify(saved.current) !== JSON.stringify(compData);

    // Every field writes one key on compData; this is that line, once.
    const set = (key) => (e) => setCompData({ ...(compData || {}), [key]: e.target.value });
    const val = (key) => compData?.[key] ?? '';

    const save = async () => {
        if (await updateCompanyData(uidCollection)) saved.current = compData;
    };
    const discard = () => { if (saved.current) setCompData(saved.current); };

    // `autoComplete` names the field to the browser, so its own saved addresses
    // and contact details are offered as you type — no service or key involved.
    const text = (key, autoComplete, extra = {}) => (
        <input type="text" className={fieldCls} autoComplete={autoComplete} value={val(key)} onChange={set(key)} {...extra} />
    );

    return (
        <div>
            {!compData ?
                <Spinner />
                : <div className='max-w-[920px] border border-[var(--line)] rounded-2xl bg-[var(--bg-card)] mt-1 divide-y divide-[var(--line)]'>

                    <Section title='Company' note='Legal identity used across all documents.'>
                        <Field label={getTtl('cmpName', ln)} span='md:col-span-8'>
                            {text('name', 'organization')}
                        </Field>
                        <Field label={getTtl('lng', ln)} span='md:col-span-4' as='div'>
                            <CBox
                                languages={languages}
                                compData={compData}
                                setCompData={setCompData}
                                lang={languages.find(x => x.lng === (compData?.lng || "English"))}
                            />
                        </Field>
                    </Section>

                    <Section title='Address & registration' note='Registered address and tax identifiers.'>
                        <Field label={getTtl('street', ln)} span='md:col-span-6'>
                            {text('street', 'street-address')}
                        </Field>
                        <Field label={getTtl('city', ln)} span='md:col-span-4'>
                            {text('city', 'address-level2')}
                        </Field>
                        <Field label={getTtl('zipCode', ln)} span='md:col-span-2'>
                            {text('zip', 'postal-code')}
                        </Field>
                        <Field label={getTtl('country', ln)} span='md:col-span-4'>
                            {text('country', 'country-name')}
                        </Field>
                        <Field label='Reg no.' span='md:col-span-2'>
                            {text('reg', 'off')}
                        </Field>
                        <Field label='VAT no.' span='md:col-span-3'>
                            {text('vat', 'off')}
                        </Field>
                        <Field label='EORI no.' span='md:col-span-3'>
                            {text('eori', 'off')}
                        </Field>
                    </Section>

                    <Section title='Contact' note='How counterparties reach you; printed on documents.'>
                        <Field label={getTtl('cmpemail', ln)} span='md:col-span-6'>
                            {text('email', 'email', { inputMode: 'email' })}
                        </Field>
                        <Field label={getTtl('cmpwebsite', ln)} span='md:col-span-6'>
                            {text('website', 'url')}
                        </Field>
                        <Field label={getTtl('cmpPhone', ln)} span='md:col-span-3'>
                            {text('phone', 'tel', { inputMode: 'tel' })}
                        </Field>
                        <Field label={getTtl('cmpMobile', ln)} span='md:col-span-3'>
                            {text('mobile', 'tel', { inputMode: 'tel', placeholder: 'Optional' })}
                        </Field>
                        {/* Annex VII prints a fax line, so the field stays. */}
                        <Field label='Fax' span='md:col-span-3'>
                            {text('fax', 'off', { placeholder: 'Optional' })}
                        </Field>
                        <Field label='Contact person' span='md:col-span-3'>
                            {text('contact', 'name', { placeholder: 'Optional' })}
                        </Field>
                    </Section>

                    <Section title='Invoicing' note='Defaults applied to every invoice you issue.'>
                        <Field label='Prepayment label' span='md:col-span-5' hint='Replaces the word "Prepayment" on invoices.'>
                            {text('invPrepaymentLabel', 'off', { placeholder: 'Prepayment' })}
                        </Field>
                        <Field label='Payment term (days)' span='md:col-span-4'
                            hint='Fallback due date for invoices without one — drives the overdue alert.'>
                            <input type='number' step='1' placeholder='30' className={fieldCls}
                                value={compData?.defaultTermDays ?? ''} onChange={set('defaultTermDays')} />
                        </Field>
                        <Field label='Non-radioactive note' span='md:col-span-12'
                            hint='Prints on the invoice PDF under Remarks. Example: "We hereby certify the goods are non-radioactive and free of contamination."'>
                            <textarea
                                rows={2}
                                placeholder='Leave blank to omit from invoices'
                                className={`${fieldCls} h-auto py-1.5 resize-y`}
                                style={{ fontFamily: 'inherit' }}
                                value={val('invNonRadioText')} onChange={set('invNonRadioText')} />
                        </Field>
                    </Section>

                    <Section title='Currency' note='Cross-currency display on the dashboard.'>
                        <Field label='EUR → USD rate' span='md:col-span-4'
                            hint="Combined dashboard totals only. Blank = each contract's own rate.">
                            <input type='number' step='0.0001' placeholder='1.08' className={fieldCls}
                                value={compData?.eurUsdRate ?? ''} onChange={set('eurUsdRate')} />
                        </Field>
                    </Section>

                    {/* Sticks to the bottom of the scroller, so Save is in reach from any
                        field. Needs the card free of overflow-hidden — that would make the
                        card the sticky's own scroller and pin nothing. */}
                    <div className="sticky bottom-0 rounded-b-2xl bg-[var(--bg-card)] px-4 py-2.5 flex items-center justify-end gap-2">
                        <button type="button" className="whiteButton" onClick={discard} disabled={!dirty}
                            title="Put back the last saved values">
                            <BtnIcon action="undo" /> Discard changes
                        </button>
                        <Button variant='customBlue' onClick={save} title='Save company details'>
                            <BtnIcon action="save" /> {getTtl('save', ln)}
                        </Button>
                    </div>
                </div>}
        </div >
    )
}

export default General
