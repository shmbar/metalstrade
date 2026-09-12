import { useContext } from 'react'
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { UserAuth } from "../../../../contexts/useAuthContext";
import Spinner from '../../../../components/spinner';
import CBox from '../_components/combobox.js'
import { getTtl } from '../../../../utils/languages'
import Tltip from '../../../../components/tlTip.js';
import { Button } from '@components/ui/button';
import { BtnIcon } from '@components/buttonIcons';

/* Company Details, at half the height it was (client, 2026-09-12: "nothing has been
   made compactic… it needs to be 50% smaller" — 40-50%, not as far as it will go).
 *
 * Nothing moved between sections and no field changed — the space came from how a
 * row is built:
 *   · the label sits BESIDE its field, not above it — a field row is the control's
 *     own 24px rather than 14 + 4 + 28;
 *   · the section name sits in a left rail instead of owning a heading line;
 *   · the small print is one line under its fields instead of a paragraph block;
 *   · controls stay on the standard h-8 rung — the compact h-7 took it to 65% shorter,
 *     past the 40-50% asked for, and this page is typed into rather than scanned.
 * The grid is still content-aware: a 5-character ZIP takes a ZIP's worth of width. */
const fieldCls = "w-full h-8 min-w-0 px-2.5 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] responsiveTextInput";
const labelCls = "shrink-0 responsiveTextTable text-[var(--ink-muted)] whitespace-nowrap";

// One row of the page: the section's name in the rail, its fields beside it,
// and its small print under them — a caption rather than a tooltip, because it
// explains what a field DOES and is worth reading before the field is filled in.
const Section = ({ title, hint, children, className = '' }) => (
    <div className={`grid grid-cols-1 md:grid-cols-[104px_1fr] gap-x-3 gap-y-2 px-3 py-3 ${className}`}>
        <div className="flex items-center gap-1 pt-0.5 md:pt-1">
            <span className="responsiveTextTable font-semibold text-[var(--ink)]">{title}</span>
        </div>
        <div className="grid grid-cols-12 gap-x-2.5 gap-y-2">
            {children}
            {hint && <p className="col-span-12 responsiveTextTable text-[var(--ink-muted)]">{hint}</p>}
        </div>
    </div>
);

/* label + control on one line. `span` is the 12-column width at md and up.
   `as` is a plain div for the language picker: that control is a Headless UI
   button with its own popup, and a <label> forwards clicks from anywhere inside
   it to that button — including clicks on the open option list. */
const Field = ({ label, span = 'md:col-span-4', as: Tag = 'label', children }) => (
    <Tag className={`col-span-12 ${span} flex items-center gap-1.5 min-w-0`}>
        <span className={labelCls}>{label}</span>
        {children}
    </Tag>
);

export const getLng = () => {
    return;
}

const languages = [{ lng: "English" }, { lng: "Русский" }]

const General = () => {
    const { compData, setCompData, updateCompanyData, setToast } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const ln = compData?.lng || 'English';

    // Every field writes one key on compData; this is that line, once.
    const set = (key) => (e) => setCompData({ ...(compData || {}), [key]: e.target.value });
    const val = (key) => compData?.[key] ?? '';

    return (
        <div>
            {compData && Object.keys(compData).length === 0 ?
                <Spinner />
                : <>
                    <div className='border border-[var(--line)] rounded-2xl bg-[var(--bg-card)] mt-1 overflow-hidden divide-y divide-[var(--line)]'>

                        <Section title='Company'>
                            <Field label={getTtl('cmpName', ln)} span='md:col-span-7'>
                                <input type='input' className={fieldCls} value={val('name')} onChange={set('name')} />
                            </Field>
                            <Field label={getTtl('lng', ln)} span='md:col-span-5' as='div'>
                                <CBox
                                    languages={languages}
                                    compData={compData}
                                    setCompData={setCompData}
                                    lang={languages.find(x => x.lng === (compData?.lng || "English"))}
                                />
                            </Field>
                        </Section>

                        <Section title='Address'>
                            <Field label={getTtl('street', ln)} span='md:col-span-5'>
                                <input type='input' className={fieldCls} value={val('street')} onChange={set('street')} />
                            </Field>
                            <Field label={getTtl('city', ln)} span='md:col-span-4'>
                                <input type='input' className={fieldCls} value={val('city')} onChange={set('city')} />
                            </Field>
                            <Field label={getTtl('country', ln)} span='md:col-span-3'>
                                <input type='input' className={fieldCls} value={val('country')} onChange={set('country')} />
                            </Field>
                            <Field label={getTtl('zipCode', ln)} span='md:col-span-3'>
                                <input type='input' className={fieldCls} value={val('zip')} onChange={set('zip')} />
                            </Field>
                            <Field label='Reg No.' span='md:col-span-3'>
                                <input type='input' className={fieldCls} value={val('reg')} onChange={set('reg')} />
                            </Field>
                            <Field label='VAT No.' span='md:col-span-3'>
                                <input type='input' className={fieldCls} value={val('vat')} onChange={set('vat')} />
                            </Field>
                            <Field label='EORI No.' span='md:col-span-3'>
                                <input type='input' className={fieldCls} value={val('eori')} onChange={set('eori')} />
                            </Field>
                        </Section>

                        <Section title='Online'>
                            <Field label={getTtl('cmpemail', ln)} span='md:col-span-6'>
                                <input type='input' className={fieldCls} value={val('email')} onChange={set('email')} />
                            </Field>
                            <Field label={getTtl('cmpwebsite', ln)} span='md:col-span-6'>
                                <input type='input' className={fieldCls} value={val('website')} onChange={set('website')} />
                            </Field>
                        </Section>

                        <Section title='Contact'>
                            <Field label={getTtl('cmpPhone', ln)} span='md:col-span-3'>
                                <input type='input' className={fieldCls} value={val('phone')} onChange={set('phone')} />
                            </Field>
                            <Field label={getTtl('cmpMobile', ln)} span='md:col-span-3'>
                                <input type='input' className={fieldCls} value={val('mobile')} onChange={set('mobile')} />
                            </Field>
                            <Field label='Fax' span='md:col-span-3'>
                                <input type='input' className={fieldCls} value={val('fax')} onChange={set('fax')} />
                            </Field>
                            <Field label='Person' span='md:col-span-3'>
                                <input type='input' className={fieldCls} value={val('contact')} onChange={set('contact')} />
                            </Field>
                        </Section>

                        <Section
                            title='Invoicing'
                            hint='Prepayment label replaces the word "Prepayment" on invoices. The note prints on the invoice PDF under Remarks — leave blank to omit.'
                        >
                            <Field label='Prepayment label' span='md:col-span-4'>
                                <input type='input' placeholder='Prepayment' className={fieldCls}
                                    value={val('invPrepaymentLabel')} onChange={set('invPrepaymentLabel')} />
                            </Field>
                            <Field label='Non-radioactive note' span='md:col-span-8'>
                                <textarea
                                    rows={1}
                                    placeholder='e.g. We hereby certify the goods are non-radioactive and free of contamination.'
                                    className={`${fieldCls} h-7 py-1 resize-y`}
                                    style={{ fontFamily: 'inherit' }}
                                    value={val('invNonRadioText')} onChange={set('invNonRadioText')} />
                            </Field>
                        </Section>

                        <Section
                            title='Currency'
                            hint={'EUR→USD rate converts EUR to USD for combined dashboard totals (leave blank to use each contract’s rate). Payment term: an invoice with no due date is treated as due this many days after its date (default 30) — it drives the overdue alert.'}
                        >
                            <Field label='EUR → USD rate' span='md:col-span-6'>
                                <input type='number' step='0.0001' placeholder='e.g. 1.08' className={fieldCls}
                                    value={compData?.eurUsdRate ?? ''} onChange={set('eurUsdRate')} />
                            </Field>
                            <Field label='Payment term (days)' span='md:col-span-6'>
                                <input type='number' step='1' placeholder='30' className={fieldCls}
                                    value={compData?.defaultTermDays ?? ''} onChange={set('defaultTermDays')} />
                            </Field>
                        </Section>
                    </div>

                    <div className="flex mt-2">
                        <Tltip direction='top' tltpText='Save/update company data'>
                            <Button variant='customBlue'
                                onClick={() => updateCompanyData(uidCollection)}
                            >  <BtnIcon action="save" />  {getTtl('save', ln)}</Button>
                        </Tltip>
                    </div>
                </>}
        </div >
    )
}

export default General
