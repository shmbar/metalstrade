import Modal from '@components/modal.js'
import { useContext, useState, useEffect } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { UserAuth } from "@contexts/useAuthContext";
import { Pdf } from './pdf/pdfFinal.js';
import ChkBox from '@components/checkbox';
import { getD, loadStockData, validate, reOrderTableFinal } from '@utils/utils'
import { getTtl } from '@utils/languages';
import FinalSetRemarks from './finalSettlmentRemarks.js';
import Tltip from '@components/tlTip.js';
import { Save, FileText, Plus, X } from "lucide-react"
import { Button } from '@components/ui/button.jsx';

function countDecimalDigits(inputString) {

    const match = inputString.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!match) return 0;

    const decimalPart = match[1] || '';
    const exponentPart = match[2] || '';

    // Combine the decimal and exponent parts
    const combinedPart = decimalPart + exponentPart;

    // Remove leading zeros
    const trimmedPart = combinedPart.replace(/^0+/, '');

    return trimmedPart.length;
}


const FinalSettlmentModal = ({ isOpen, setIsOpen, setShowPoInvModal }) => {

    const { valueCon, setValueCon, saveData_stocks } = useContext(ContractsContext);
    const { settings, setToast, ln, compData } = useContext(SettingsContext);
    const { uidCollection, gisAccount } = UserAuth();
    const [checkedItems, setCheckedItems] = useState([]);
    const [data, setData] = useState([]);
    const [errors, setErrors] = useState([])
    // Final-settlement draft. When ON, the edits are stashed in each lot's `fsDraftData`
    // and the live fields (finalqnty/unitPrcFinal/finaltotal) stay at their last-confirmed
    // values — so cashflow & stocks ignore the in-progress settlement until it's confirmed.
    // `confirmedMap` keeps those confirmed values by lot id so a draft save can restore them.
    const [isDraft, setIsDraft] = useState(false)
    const [confirmedMap, setConfirmedMap] = useState({})


    useEffect(() => {

        const loadStock = async () => {

            let stockData = valueCon.stock.length > 0 ? await loadStockData(uidCollection, 'id', valueCon.stock) : []

            const confirmed = {}
            stockData = stockData.map(z => {
                // Last-confirmed (live) values — what cashflow/stocks currently read. Same
                // defaulting as before: an unsettled lot falls back to its received qnty/total.
                const base = {
                    finalqnty: z.finalqnty ?? z.qnty,
                    finaltotal: z.finaltotal ?? z.total,
                    unitPrc: z.unitPrc,
                    unitPrcFinal: z.unitPrcFinal ?? z.unitPrc,
                    descriptionText: z.descriptionText ?? z.productsData.find(k => k.id === z.description)?.description,
                    remark: z.remark ?? ''
                }
                confirmed[z.id] = base
                // Values shown in the form: the held draft edits if present, else confirmed.
                const working = (z.fsDraft && z.fsDraftData) ? { ...base, ...z.fsDraftData } : base
                return { ...z, ...working }
            })

            setConfirmedMap(confirmed)
            setIsDraft(stockData.some(z => z.fsDraft))
            setData(stockData)
        }

        loadStock()
    }, [isOpen])


    const handleValue = (e, i) => {

        //    if (countDecimalDigits(e.target.value) > 3) return;

        let itm = data[i]
        if (e.target.name !== 'remark' && e.target.name !== 'descriptionText') {  //final quantity
            itm = {
                ...itm, [e.target.name]: removeNonNumeric(e.target.value),
                //     finaltotal: removeNonNumeric(e.target.value) * removeNonNumeric(itm.unitPrc)
            }
        } else {
            itm = { ...itm, [e.target.name]: e.target.value }
        }

        itm = { ...itm, finaltotal: removeNonNumeric(itm.finalqnty) * removeNonNumeric(itm.unitPrcFinal) }
        let newObj = [...data]
        newObj[i] = itm;
        setData(newObj)
    }



    const addComma = (nStr, addSymbol, item) => {
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1,$2');
        }


        const symbol = valueCon.cur !== '' ? settings.Currency.Currency.find(x => x.id === valueCon.cur).symbol : ''
        x2 = x2.length > 3 && item === 'finaltotal' ? x2.substring(0, 3) : x2
        return addSymbol ? (symbol + x1 + x2) : (x1 + x2);
    }


    const removeNonNumeric = (num) => num.toString().replace(/[^0-9.\-]/g, "");


    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };


    const saveD = () => {
        const payload = data.map(x => {
            const base = confirmedMap[x.id] || {}
            if (isDraft) {
                // Hold the edits aside; keep the live fields at their confirmed values so the
                // settlement stays out of cashflow & stocks until Draft is turned off.
                return {
                    ...x,
                    finalqnty: base.finalqnty, finaltotal: base.finaltotal,
                    unitPrc: base.unitPrc, unitPrcFinal: base.unitPrcFinal,
                    descriptionText: base.descriptionText, remark: base.remark,
                    fsDraft: true,
                    fsDraftData: {
                        finalqnty: x.finalqnty, finaltotal: x.finaltotal,
                        unitPrc: x.unitPrc, unitPrcFinal: x.unitPrcFinal,
                        descriptionText: x.descriptionText, remark: x.remark
                    }
                }
            }
            // Confirm ("make it original"): the edited values become live; clear the draft.
            return { ...x, fsDraft: false, fsDraftData: null }
        })
        saveData_stocks(uidCollection, payload)
    }

    // ---- Live settlement summary + custom calculation lines (persisted on the contract) ----
    const numv = (v) => parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, '')) || 0;
    const calcs = valueCon.fsCalcs || [];
    const setCalcs = (next) => setValueCon({ ...valueCon, fsCalcs: next });
    const newId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const addCalc = () => setCalcs([...calcs, { id: newId(), label: '', amount: '' }]);
    const updateCalc = (id, field, val) => setCalcs(calcs.map(c => c.id === id ? { ...c, [field]: field === 'amount' ? removeNonNumeric(val) : val } : c));
    const removeCalc = (id) => setCalcs(calcs.filter(c => c.id !== id));
    const sumQty = data.reduce((s, r) => s + numv(r.finalqnty), 0);
    const sumTotal = data.reduce((s, r) => s + numv(r.finaltotal), 0);
    const calcsTotal = calcs.reduce((s, c) => s + numv(c.amount), 0);
    const grandTotal = sumTotal + calcsTotal;
    const money = (n) => addComma((Math.round((Number(n) || 0) * 100) / 100).toFixed(2), true);

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('FinalSettlmnt', ln)} w='max-w-6xl'>
            <div className='flex flex-col p-1 justify-between gap-4 max-h-[50rem] overflow-y-auto'>
                {isDraft &&
                    <div className='rounded-xl px-3 py-2 responsiveTextTable font-medium' style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309' }}>
                        Draft mode — these settlement figures are held back and won’t affect cashflow or stocks until you turn off Draft and save.
                    </div>
                }
                {data.map((x, i) => {
                    return (
                        <div className='grid grid-cols-12 p-1 gap-2 border border-[#b8ddf8] rounded-2xl bg-[#f4f9ff]' key={i}>
                            <div className='col-span-3 flex'>
                                <div className='items-center flex pt-3 pr-2'>
                                    <ChkBox checked={checkedItems.includes(x.id)} size='h-5 w-5' onChange={() => checkItem(x.id)} />
                                </div>
                                <div className='w-full'>
                                    <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Description', ln)}:</p>
                                    <div className='flex'>
                                        <input type='text' className="number-separator input border-slate-300 h-7 responsiveTextTable shadow-lg" name='descriptionText' style={{ fontFamily: 'inherit' }}
                                            value={x.descriptionText} onChange={e => handleValue(e, i)} />
                                    </div>
                                </div>
                            </div>

                            <div className='col-span-1'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Quantity', ln)} {`(${getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')})`}</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input border-slate-300 h-7 responsiveTextTable" name='qnty'
                                        disabled defaultValue={addComma(x.qnty, false)} />
                                </div>
                            </div>
                            <div className='col-span-1'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('FinalQuantity', ln)} {`(${getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')})`}</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input shadow-lg h-7 responsiveTextTable " name='finalqnty' style={{ fontFamily: 'inherit' }}
                                        value={addComma(x.finalqnty, false)} onChange={e => handleValue(e, i)} />
                                </div>
                            </div>
                            <div className='col-span-1'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >Advised Price:</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input h-7  shadow-lg border-slate-300 responsiveTextTable" name='unitPrc'
                                        value={addComma(x.unitPrc, true)} onChange={e => handleValue(e, i)}
                                    />
                                </div>
                            </div>

                            <div className='col-span-1'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >Received Price:</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input h-7 border-slate-300 responsiveTextTable shadow-lg" name='unitPrcFinal' style={{ fontFamily: 'inherit' }}
                                        value={addComma(x.unitPrcFinal, true)} onChange={e => handleValue(e, i)}
                                    />
                                </div>
                            </div>

                            <div className='col-span-1'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Total', ln)}:</p>
                                <div className='flex'>
                                    <input type='text' disabled className="number-separator input border-slate-300 h-7 responsiveTextTable" name='finaltotal'
                                        value={addComma(x.finaltotal, true, 'finaltotal')} />
                                </div>
                            </div>

                            <div className='col-span-1'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Invoice', ln)}#:</p>
                                <div className='flex'>
                                    <input type='text' disabled className="number-separator input border-slate-300 h-7 responsiveTextTable truncate" name='total'
                                        defaultValue={x?.poInvoices[0]?.inv} />
                                </div>
                            </div>

                            <div className='col-span-3'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Remarks', ln)}:</p>
                                <div className='flex'>
                                    <input type='text' className="shadow-lg input border-slate-300 h-7 responsiveTextTable truncate" name='remark' style={{ fontFamily: 'inherit' }}
                                        value={x?.remark} onChange={e => handleValue(e, i)} />
                                </div>
                            </div>

                        </div>
                    )
                })}

                <div className='pt-3 '>
                    <FinalSetRemarks value={valueCon} setValue={setValueCon} />
                </div>

                {/* Live settlement summary — totals update as you edit; add custom lines for splits/adjustments */}
                <div className='border border-[#b8ddf8] rounded-2xl bg-white p-3'>
                    <div className='flex items-center justify-between mb-2'>
                        <span className='responsiveText font-semibold text-[var(--chathams-blue)]'>Settlement summary</span>
                        <button type='button' onClick={addCalc} className='flex items-center gap-1 rounded-full px-3 h-7 text-white hover:opacity-90' style={{ fontSize: '0.66rem', background: 'var(--endeavour)' }}>
                            <Plus className='w-3 h-3' /> Add calculation
                        </button>
                    </div>
                    <div className='flex flex-col gap-1.5'>
                        <div className='flex items-center justify-between responsiveTextTable'>
                            <span className='text-[var(--regent-gray)]'>Total final quantity</span>
                            <span className='font-medium text-[var(--chathams-blue)]'>{addComma(sumQty.toFixed(3), false)} {getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')}</span>
                        </div>
                        <div className='flex items-center justify-between responsiveTextTable'>
                            <span className='text-[var(--regent-gray)]'>Items total ({data.length})</span>
                            <span className='font-medium text-[var(--chathams-blue)]'>{money(sumTotal)}</span>
                        </div>
                        {calcs.map(c => (
                            <div key={c.id} className='flex items-center gap-2'>
                                <input type='text' placeholder='Label (e.g. Half balance)' value={c.label} onChange={e => updateCalc(c.id, 'label', e.target.value)}
                                    className='input h-7 responsiveTextTable border-slate-300 flex-1 shadow-sm' style={{ fontFamily: 'inherit' }} />
                                <Tltip direction='top' tltpText='Set to half of the items total'>
                                    <button type='button' onClick={() => updateCalc(c.id, 'amount', (sumTotal / 2).toFixed(2))} className='rounded-md px-2 h-7 border border-[#d8e8f5] text-[var(--endeavour)] font-medium hover:bg-[#dbeeff]' style={{ fontSize: '0.7rem' }}>½</button>
                                </Tltip>
                                <input type='text' placeholder='Amount' value={c.amount} onChange={e => updateCalc(c.id, 'amount', e.target.value)}
                                    className='input h-7 responsiveTextTable border-slate-300 w-28 text-right shadow-sm' style={{ fontFamily: 'inherit' }} />
                                <button type='button' onClick={() => removeCalc(c.id)} className='text-[var(--regent-gray)] hover:text-red-500'><X className='w-3.5 h-3.5' /></button>
                            </div>
                        ))}
                        <div className='flex items-center justify-between border-t border-[#dbeeff] pt-2 mt-1'>
                            <span className='responsiveText font-semibold text-[var(--chathams-blue)]'>Settlement total</span>
                            <span className='responsiveText font-bold text-[var(--endeavour)]'>{money(grandTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>


            <div className="px-3 flex gap-4 flex-wrap items-center justify-start">
                <div className='flex gap-3 items-center p-2'>
                    <Tltip direction='top' tltpText={isDraft
                        ? 'Draft ON — saving keeps this settlement out of cashflow & stocks until you turn Draft off and save.'
                        : 'Draft OFF — saving applies this settlement to cashflow & stocks (original).'}>
                        <div className='flex items-center gap-2 px-3 h-8 rounded-full border cursor-pointer'
                            style={{ background: isDraft ? '#fffbeb' : '#f8fbff', borderColor: isDraft ? '#fde68a' : '#d8e8f5' }}
                            onClick={() => setIsDraft(!isDraft)}>
                            <ChkBox checked={isDraft} size='h-5 w-5' onChange={() => setIsDraft(!isDraft)} />
                            <span className='responsiveTextTable font-medium' style={{ color: isDraft ? '#b45309' : 'var(--chathams-blue)' }}>Draft</span>
                        </div>
                    </Tltip>
                    <Tltip direction='top' tltpText={isDraft ? 'Save as draft (held back)' : 'Save & apply (original)'}>
                        <Button
                            className='h-8 px-3'
                            onClick={saveD}
                        >
                            <Save />
                            {isDraft ? 'Save as Draft' : getTtl('save', ln)}
                        </Button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Create PDF document'>
                        <Button
                            variant='outline'
                            className='h-8 px-3'
                            onClick={() => Pdf(valueCon,
                                reOrderTableFinal(data.filter(z => checkedItems.includes(z.id))).map(({ ['id']: _, ...rest }) => rest).map(obj => Object.values(obj))
                                    .map((values, index) => {
                                        const number = values[2]//.toFixed(3);
                                        const number1 = values[3]//.toFixed(3);
                                        const number2 = values[4];
                                        const number3 = values[5];
                                        const text = values[0];

                                        const formattedNumber = number === '0' ? '' : new Intl.NumberFormat('en-US', {
                                            minimumFractionDigits: 3
                                        }).format(number);

                                        const formattedNumber1 = number1 === '0' ? '' : new Intl.NumberFormat('en-US', {
                                            minimumFractionDigits: 3
                                        }).format(number1);


                                        const formattedNumber2 = isNaN(number1 * 1) ? number1 :
                                            new Intl.NumberFormat('en-US', {
                                                style: 'currency',
                                                currency: valueCon.cur !== '' ? getD(settings.Currency.Currency, valueCon, 'cur') :
                                                    'USD',
                                                minimumFractionDigits: 2
                                            }).format(number2);

                                        const formattedNumber3 = isNaN(number1 * 1) ? number1 :
                                            new Intl.NumberFormat('en-US', {
                                                style: 'currency',
                                                currency: valueCon.cur !== '' ? getD(settings.Currency.Currency, valueCon, 'cur') :
                                                    'USD',
                                                minimumFractionDigits: 2
                                            }).format(number3);

                                        return [index + 1, text,
                                        values[1], formattedNumber, formattedNumber1, formattedNumber2, formattedNumber3];
                                    })
                                , settings, compData, data.filter(z => checkedItems.includes(z.id)), gisAccount)
                            }
                        >
                            <FileText />
                            PDF
                        </Button>
                    </Tltip>
                </div>

            </div>
        </Modal>
    )
}

export default FinalSettlmentModal