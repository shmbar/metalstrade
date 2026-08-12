import { useContext, useState } from 'react'
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { UserAuth } from "../../../../contexts/useAuthContext";
import Spinner from '../../../../components/spinner';
//import Modal from '../../../../components/modalToProceed';
import CBox from '../_components/combobox.js'
import { getTtl } from '../../../../utils/languages'
import Logos from './logos.js';
import Tltip from '../../../../components/tlTip.js';
import { Button } from '@components/ui/button';
import { Save } from 'lucide-react';

// Standard form field styling (matches the app's control spec app-wide).
const fieldCls = "w-full h-8 px-3 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] responsiveTextTitle";
const sectionCls = 'responsiveTextTitle font-semibold mb-2.5 text-[var(--ink)] font-display';
const labelCls = "responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)]";


export const getLng = () => {
    return;
}

const languages = [{ lng: "English" }, { lng: "Русский" }]

const General = () => {
    const { compData, setCompData, updateCompanyData, setToast } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const ln = compData?.lng || 'English';
    // const [invNum, setInvNum] = useState('')

    //   const [isOpen, setIsOpen] = useState(false)
    // const setNum = async () => {
    //     let success = await saveDataSettings(uidCollection, 'invoiceNum', { num: invNum * 1 })
    //     success && setToast({ show: true, text: 'New number is saved!', clr: 'success' })
    // }


    return (
        <div>
            {compData && Object.keys(compData).length === 0 ?
                <Spinner />
                : <>
                    {/* One panel, sections divided by hairlines, instead of four
                        separately bordered cards. Widths are content-aware on a
                        12-column grid: a 5-character ZIP no longer occupies half
                        the page the way a rigid 2-column split forced it to. */}
                    <div className='border border-[var(--line)] rounded-2xl bg-[var(--bg-card)] mt-1 overflow-hidden'>

                        {/* Company */}
                        <div className='p-4'>
                            <p className={sectionCls}>Company</p>
                            <div className='grid grid-cols-12 gap-3'>
                                <div className='col-span-12 md:col-span-6 flex flex-col gap-1'>
                                    <p className={labelCls}>{getTtl('cmpName', ln)}</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.name || ''}
                                        onChange={e => setCompData({ ...(compData || {}), name: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-12 sm:col-span-6 md:col-span-3 flex flex-col gap-1'>
                                    <p className={labelCls}>{getTtl("lng", ln)}</p>
                                    <div className="relative w-full">
                                        <CBox
                                            languages={languages}
                                            compData={compData}
                                            setCompData={setCompData}
                                            lang={languages.find(
                                                x => x.lng === (compData?.lng || "English")
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Address & Registration */}
                        <div className='p-4 border-t border-[var(--line)]'>
                            <p className={sectionCls}>Address &amp; Registration</p>
                            <div className='grid grid-cols-12 gap-3'>
                                <div className='col-span-12 md:col-span-5 flex flex-col gap-1'>
                                    <p className={labelCls}>{getTtl('street', ln)}</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.street || ''}
                                        onChange={e => setCompData({ ...(compData || {}), street: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-6 md:col-span-3 flex flex-col gap-1'>
                                    <p className={labelCls}>{getTtl('city', ln)}</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.city || ''}
                                        onChange={e => setCompData({ ...(compData || {}), city: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-6 md:col-span-2 flex flex-col gap-1'>
                                    <p className={labelCls}>{getTtl('country', ln)}</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.country || ''}
                                        onChange={e => setCompData({ ...(compData || {}), country: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-6 md:col-span-2 flex flex-col gap-1'>
                                    <p className={labelCls}>{getTtl('zipCode', ln)}</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.zip || ''}
                                        onChange={e => setCompData({ ...(compData || {}), zip: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-6 md:col-span-4 flex flex-col gap-1'>
                                    <p className={labelCls}>Reg No.</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.reg || ''}
                                        onChange={e => setCompData({ ...(compData || {}), reg: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-6 md:col-span-4 flex flex-col gap-1'>
                                    <p className={labelCls}>VAT No.</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.vat || ''}
                                        onChange={e => setCompData({ ...(compData || {}), vat: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-12 md:col-span-4 flex flex-col gap-1'>
                                    <p className={labelCls}>EORI No.</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.eori || ''}
                                        onChange={e => setCompData({ ...(compData || {}), eori: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Online */}
                        <div className='p-4 border-t border-[var(--line)]'>
                            <p className={sectionCls}>Online</p>
                            <div className='grid grid-cols-12 gap-3'>
                                <div className='col-span-12 md:col-span-5 flex flex-col gap-1'>
                                    <p className={labelCls}>{getTtl('cmpemail', ln)}</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.email || ''}
                                        onChange={e => setCompData({ ...(compData || {}), email: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-12 md:col-span-5 flex flex-col gap-1'>
                                    <p className={labelCls}>{getTtl('cmpwebsite', ln)}</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.website || ''}
                                        onChange={e => setCompData({ ...(compData || {}), website: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className='p-4 border-t border-[var(--line)]'>
                            <p className={sectionCls}>Contact</p>
                            <div className='grid grid-cols-12 gap-3'>
                                <div className='col-span-6 md:col-span-3 flex flex-col gap-1'>
                                    <p className={labelCls}>{getTtl('cmpPhone', ln)}</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.phone || ''}
                                        onChange={e => setCompData({ ...(compData || {}), phone: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-6 md:col-span-3 flex flex-col gap-1'>
                                    <p className={labelCls}>{getTtl('cmpMobile', ln)}</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.mobile || ''}
                                        onChange={e => setCompData({ ...(compData || {}), mobile: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-6 md:col-span-3 flex flex-col gap-1'>
                                    <p className={labelCls}>Fax</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.fax || ''}
                                        onChange={e => setCompData({ ...(compData || {}), fax: e.target.value })}
                                    />
                                </div>
                                <div className='col-span-6 md:col-span-3 flex flex-col gap-1'>
                                    <p className={labelCls}>Contact Person</p>
                                    <input
                                        type='input'
                                        className={fieldCls}
                                        value={compData?.contact || ''}
                                        onChange={e => setCompData({ ...(compData || {}), contact: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* <div className=' border border-slate-300 p-4 rounded-2xl  mt-5 w-full'>
                        <Logos compData={compData} setCompData={setCompData} />
                    </div> */}
                    <div className='border border-[var(--line)] p-4 rounded-2xl bg-[var(--bg-card)] mt-5 w-full'>
                        <p className='responsiveTextTitle font-semibold mb-3 text-[var(--ink)] font-display'>Invoice wording</p>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div className='flex flex-col gap-1.5'>
                                <p className={labelCls}>Prepayment label:</p>
                                <input
                                    type='input'
                                    placeholder='Prepayment'
                                    className={fieldCls}
                                    value={compData?.invPrepaymentLabel || ''}
                                    onChange={e => setCompData({ ...(compData || {}), invPrepaymentLabel: e.target.value })}
                                />
                            </div>
                            <div className='flex flex-col gap-1.5'>
                                <p className={labelCls}>Invoice note (Non&#8209;Radioactive):</p>
                                <textarea
                                    rows={2}
                                    placeholder='e.g. We hereby certify the goods are non-radioactive and free of contamination.'
                                    className="w-full px-3 py-2 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] outline-none transition-colors focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] responsiveTextTitle resize-y"
                                    style={{ fontFamily: 'inherit' }}
                                    value={compData?.invNonRadioText || ''}
                                    onChange={e => setCompData({ ...(compData || {}), invNonRadioText: e.target.value })}
                                />
                            </div>
                        </div>
                        <p className='responsiveText text-[var(--ink-muted)] mt-3'>
                            Prepayment label replaces the word &quot;Prepayment&quot; on invoices. The note prints on the invoice PDF under Remarks — leave blank to omit.
                        </p>
                    </div>

                    <div className='border border-[var(--line)] p-4 rounded-2xl bg-[var(--bg-card)] mt-5 w-full'>
                        <p className='responsiveTextTitle font-semibold mb-3 text-[var(--ink)] font-display'>Currency &amp; Terms</p>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div className='flex flex-col gap-1.5'>
                                <p className={labelCls}>Standard EUR &rarr; USD rate:</p>
                                <input
                                    type='number'
                                    step='0.0001'
                                    placeholder='e.g. 1.08'
                                    className={fieldCls}
                                    value={compData?.eurUsdRate ?? ''}
                                    onChange={e => setCompData({ ...(compData || {}), eurUsdRate: e.target.value })}
                                />
                            </div>
                            <div className='flex flex-col gap-1.5'>
                                <p className={labelCls}>Default payment term (days):</p>
                                <input
                                    type='number'
                                    step='1'
                                    placeholder='30'
                                    className={fieldCls}
                                    value={compData?.defaultTermDays ?? ''}
                                    onChange={e => setCompData({ ...(compData || {}), defaultTermDays: e.target.value })}
                                />
                            </div>
                        </div>
                        <p className='responsiveText text-[var(--ink-muted)] mt-3'>
                            EUR&rarr;USD rate converts EUR to USD for combined dashboard totals (leave blank to use each contract&apos;s rate). Payment term: an invoice with no due date is treated as due this many days after its date (default 30) — drives the overdue alert.
                        </p>
                    </div>

                    <div className="flex mt-3 ml-3">
                        <Tltip direction='top' tltpText='Save/update company data'>
                            <Button variant='customBlue'
                                onClick={() => updateCompanyData(uidCollection)}
                            >  <Save />  {getTtl('save', ln)}</Button>
                        </Tltip>

                    </div>
                    {/*
                    <div className='flex flex-wrap gap-4 border border-slate-300 p-4 rounded-2xl  mt-5 max-w-3xl'>

                        <div className='flex flex-wrap gap-4 items-center' >
                            <p className='responsiveTextTitle font-medium whitespace-nowrap text-slate-600'>Start Invoice Number From:</p>
                            <input type='number' className='input max-w-[10rem] w-full  h-7' value={invNum}
                                onChange={(e) => setInvNum(e.target.value)} />
                        </div>


                        <button
                            className=" flex items-center justify-center text-[var(--on-brand)] gap-1.5 border p-1 px-4
         border-slate-400 bg-slate-400 rounded-lg  responsiveTextTitle text-[var(--on-brand)] hover:bg-slate-500 shadow-lg"
                            onClick={()=>setIsOpen(true)}
                        >
                            <MdOutlineSaveAs className='scale-110' />
                            Set
                        </button>

                    </div> */}
                </>}
            {/*    <Modal isDeleteOpen={isOpen} setIsDeleteOpen={setIsOpen}
                        ttl='Invoice Number' txt='To set a new number from which the next invoice will be received, please confirm to proceed.'
                        doAction={setNum} />
*/}
        </div >
    )
}

export default General
