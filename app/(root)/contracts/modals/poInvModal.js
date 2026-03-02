'use client'
import Modal from '@components/modal.js'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdPayments } from 'react-icons/md';
import { UserAuth } from "@contexts/useAuthContext";

import ChkBox from '@components/checkbox';
import { VscSaveAs } from 'react-icons/vsc';
import { v4 as uuidv4 } from 'uuid';
import { VscArchive } from 'react-icons/vsc';
import { TbArrowMoveRight } from 'react-icons/tb';
import { getTtl } from '@utils/languages';
import Datepicker from "react-tailwindcss-datepicker";
import { CirclePlus, CircleMinus } from 'lucide-react';


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


const PoInvModal = ({ isOpen, setIsOpen, setShowStockModal }) => {

    const { valueCon, setValueCon, saveData_payments, contractsData } = useContext(ContractsContext);
    const { settings, setToast, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [checkedItems, setCheckedItems] = useState([]);
    const [expand, setExpand] = useState(false)

    useEffect(() => {
        if (!valueCon?.poInvoices?.length) return;

        const arr = valueCon.poInvoices.map((item) => {
            
            if (item.payments == null) {
                const pmntPerc = item.invValue !== '' ? ((parseFloat(item.pmnt) / parseFloat(item.invValue) * 100)).toFixed(1) : 0;
                const pmnt = { pmntId: uuidv4(), pmntDate: null, pmntPerc, pmnt: item.pmnt, };
                return { ...item, payments: [pmnt] };
            }
            return item;
        });
        setValueCon({ ...valueCon, poInvoices: arr });
    }, []);




    const addComma = (nStr, addSymbol) => {
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1,$2');
        }


        const symbol = valueCon.cur !== '' ? settings.Currency.Currency.find(x => x.id === valueCon.cur).symbol : ''
        x2 = x2.length > 3 ? x2.substring(0, 3) : x2
        return addSymbol ? (symbol + x1 + x2) : (x1 + x2);
    }


    const removeNonNumeric = (num) => {
        return num
            .toString()
            .replace(/[^0-9.-]/g, '')        // Keep digits, dot, and minus
            .replace(/(?!^)-/g, '')          // Remove any minus signs that aren't at the start
            .replace(/(\..*?)\..*/g, '$1');  // Remove all but the first dot
    };

    const handleValue = (e, x) => {

        setValueCon(prev => ({
            ...prev,
            poInvoices: prev.poInvoices.map(item => {
                if (item.id !== x.id) return item;

                let newObj = {
                    ...item, [e.target.name]: e.target.name === 'inv' ?
                        e.target.value : removeNonNumeric(e.target.value),
                    payments: item.payments.map(z => ({ ...z, pmnt: removeNonNumeric(e.target.value) * z.pmntPerc / 100 }))
                };

                let tmp = newObj.payments.reduce((t, obj) => t + (parseFloat(obj.pmnt) || 0), 0)
                let amnt = e.target.name === 'inv' ? item.invValue : removeNonNumeric(e.target.value)

                return {
                    ...newObj, pmnt: tmp, blnc: amnt - tmp
                };
            })


        }));
    }

    const handleDateChange = (e, x, y) => {
        setValueCon(prev => ({
            ...prev,
            poInvoices: prev.poInvoices.map((item) =>
                item.id === x.id ? {
                    ...item, payments: item.payments.map(z => z.pmntId === y.pmntId ?
                        { ...z, pmntDate: e } : z)
                } : item
            )
        }));
    };

    const handleValuePerc = (e, x, y) => {
        const isValidNumberWithOneDot = (str) => /^[0-9]*\.?[0-9]*$/.test(str);

        if (!isValidNumberWithOneDot(e.target.value)) return;
        if (e.target.value.length > 4) return;



        setValueCon(prev => ({
            ...prev,
            poInvoices: prev.poInvoices.map(item => {
                if (item.id !== x.id) return item;

                const payments = item.payments.map(z =>
                    z.pmntId === y.pmntId
                        ? { ...z, [e.target.name]: e.target.value, pmnt: (item.invValue * e.target.value) / 100 }
                        : z
                );

                let tmp = payments.reduce((t, obj) => t + (parseFloat(obj.pmnt) || 0), 0)

                return {
                    ...item,
                    payments,
                    pmnt: tmp,
                    blnc: parseFloat(item.invValue) - tmp
                };
            })
        }));
    }

    const handleValuePmnt = (e, x, y) => {

        //    if (e.target.name === 'pmnt' && countDecimalDigits(e.target.value) > 4) return;
        //   if (e.target.name !== 'pmnt' && countDecimalDigits(e.target.value) > 2) return;
        if (countDecimalDigits(e.target.value) > 2) return;

        setValueCon(prev => ({
            ...prev,
            poInvoices: prev.poInvoices.map(item => {
                if (item.id !== x.id) return item;

                const payments = item.payments.map(z =>
                    z.pmntId === y.pmntId
                        ? {
                            ...z, [e.target.name]: removeNonNumeric(e.target.value),
                            pmntPerc: parseFloat((removeNonNumeric(e.target.value) * 100 / item.invValue).toFixed(2))
                        } : z
                );

                let tmp = payments.reduce((t, obj) => t + (parseFloat(obj.pmnt) || 0), 0)

                return {
                    ...item,
                    payments,
                    pmnt: tmp,
                    blnc: parseFloat(item.invValue) - tmp
                };
            })
        }));

    }


    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };



    const addInvoice = () => {

        let newPmnt = {
            id: uuidv4(), pmnt: '', inv: '', invValue: '', invRef: [], blnc: '',
            payments: [{ pmntId: uuidv4(), pmntDate: null, pmntPerc: '', pmnt: '' }]
        }

        let pmntArr = [...valueCon.poInvoices, newPmnt]
        setValueCon({ ...valueCon, poInvoices: pmntArr })

    }

    const deleteItems = () => {

        let isExit = false

        checkedItems.forEach(id => {
            let tmpInvRef = valueCon.poInvoices.find(z => z.id === id).invRef
            if (tmpInvRef.length >= 1) {
                isExit = true
            }
        })

        if (isExit) {
            setToast({
                show: true,
                text: 'This invoice is relayed to customer invoice!', clr: 'fail'
            })
            return;
        }

        let delItems = valueCon.poInvoices.filter((item) => !checkedItems.includes(item.id));
        setValueCon({ ...valueCon, poInvoices: delItems });

        setCheckedItems([]);
    }

    const checkIfAlllowed = () => {
        return (contractsData.find(x => x.id === valueCon.id).poInvoices).length > 0 ? true : false
    }

    const switchToStocks = () => {

        if (checkIfAlllowed()) {
            setIsOpen(false)
            setShowStockModal(true)
        } else {
            setToast({
                show: true,
                text: 'There are no saved invoices!', clr: 'fail'
            })
        }
    }

    const expandDiv = (id) => {
        expand !== id ? setExpand(id) : setExpand(null)
    }

    const addPaymnt = (x) => {
        let newArr = valueCon.poInvoices.map((item) => {
            if (item.id === x.id) {
                const pmnt = { pmntId: uuidv4(), pmntDate: null, pmntPerc: '', pmnt: '', };
                return { ...item, payments: [...item.payments, pmnt] };
            }
            return item;
        });

        setValueCon({ ...valueCon, poInvoices: newArr });
    }

    const deletePayment = (x, y) => {
        let newArr = valueCon.poInvoices.map((item) => {
            if (item.id === x.id) {
                let newPmntArr = item.payments.filter(z => z.pmntId !== y.pmntId);

                let tmp = newPmntArr.reduce((t, obj) => t + (parseFloat(obj.pmnt) || 0), 0)
                return { ...item, payments: newPmntArr, pmnt: tmp, blnc: parseFloat(item.invValue) - tmp };
            }
            return item;
        });
        setValueCon({ ...valueCon, poInvoices: newArr });
    }


    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('POInvoices', ln)} w='max-w-5xl'>
            <div className='flex flex-col p-1 justify-between gap-2'>
                {valueCon.poInvoices.map((x, i) => {

                    return (
                        <div className='flex gap-4 p-1  border border-slate-300 rounded-lg flex-col' key={x.id}>
                            <div className=''>
                                <div className='flex items-center'>
                                    <div className='items-center flex pt-3 pr-2'>
                                        <ChkBox checked={checkedItems.includes(x.id)} size='size-5' onChange={() => checkItem(x.id)} />
                                    </div>
                                    {expand !== x.id ?
                                        <CirclePlus className='mt-3 text-slate-500 mr-2 cursor-pointer' onClick={() => expandDiv(x.id)} />
                                        :
                                        <CircleMinus className='mt-3 text-slate-500 mr-2 cursor-pointer' onClick={() => expandDiv(x.id)} />
                                    }
                                    <div className='gap-3 flex'>
                                        <div className=''>
                                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'> {getTtl('PurchaseInv', ln)}#:</p>
                                            <input type='text' className="number-separator input text-[15px] h-7  shadow-lg text-xs" name='inv'
                                                value={x.inv} onChange={e => handleValue(e, x)} />
                                        </div>
                                        <div className=''>
                                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('InvoiceValue', ln)}:</p>
                                            <input type='text' className="number-separator input text-[15px] h-7 shadow-lg text-xs" name='invValue'
                                                value={addComma(x.invValue, true)} onChange={e => handleValue(e, x)} />
                                        </div>
                                        <div className=''>
                                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>
                                                Total Payment:
                                            </p>
                                            <input type='text' className="number-separator input border-slate-300 text-[15px] h-7 text-xs" name='pmnt'
                                                value={addComma(x.pmnt, true)} disabled />
                                        </div>
                                        <div className=''>
                                            <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Balance', ln)}:</p>
                                            <div className='flex pr-3'>
                                                <input type='text' disabled className="number-separator input border-slate-300 text-[15px] h-7 text-xs" name='blnc'
                                                    value={addComma(x.blnc, true)} />
                                                <div className='group relative'>
                                                    <TbArrowMoveRight className={`scale-[2.5] text-slate-500 ml-4 mt-1 cursor-pointer `}
                                                        onClick={switchToStocks} />
                                                    <span className="absolute hidden group-hover:flex top-[30px] w-fit p-1
    bg-slate-400 rounded-md text-center text-white text-xs z-10 whitespace-nowrap -left-2">
                                                        {getTtl('Stocks', ln)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <div className={`w-full transition-all duration-300 ease-in-out ${expand === x.id
                                ? 'opacity-100 max-h-[1000px] py-1 pointer-events-auto'  // expanded: visible, big height, interactable
                                : 'opacity-0 max-h-0 py-0 pointer-events-none overflow-hidden' // collapsed: hidden, no pointer events
                                }`}
                            >
                                {x.payments?.map((y, k) => {
                                    return (
                                        <div key={k}>
                                            <div className='p-1 pl-28 flex items-center gap-6 flex-wrap'>
                                                <p className='text-sm text-slate-500'>Payment #{k + 1}:</p>

                                                <div className='md:max-w-36 pt-2 md:pt-0'>
                                                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Payment Date', ln)}:</p>
                                                    <div className='flex flex-col'>
                                                        <Datepicker useRange={false}
                                                            asSingle={true}
                                                            value={y.pmntDate}
                                                            popoverDirection='down'
                                                            onChange={e => handleDateChange(e, x, y)}
                                                            displayFormat={"DD-MMM-YYYY"}
                                                            inputClassName='input w-full text-[15px] shadow-lg h-7 text-xs'
                                                        />
                                                    </div>
                                                </div>

                                                <div className=''>
                                                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Payment %:</p>
                                                    <div className='flex'>
                                                        <input type='text' className="number-separator input text-[15px] h-7  shadow-lg text-xs w-20" name='pmntPerc'
                                                            value={y.pmntPerc} onChange={e => handleValuePerc(e, x, y)} />
                                                        <span className='relative right-6 text-slate-600 items-center flex'>%</span>
                                                    </div>
                                                </div>

                                                <div className=''>
                                                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>
                                                        {getTtl('Payment', ln)}:
                                                    </p>
                                                    <div className='flex'>
                                                        <input type='text' className="number-separator input text-[15px] shadow-lg h-7 text-xs w-28" name='pmnt'
                                                            value={addComma(y.pmnt, true)} onChange={e => handleValuePmnt(e, x, y)} />
                                                    </div>
                                                </div>

                                                <button
                                                    className="whiteButton py-1 mt-3.5 text-slate-500"
                                                    onClick={() => deletePayment(x, y)}
                                                >
                                                    <VscArchive className='scale-110' />
                                                    Delete payment
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div className='flex gap-4 p-2 border-t'>

                                    <button
                                        className="whiteButton py-1"
                                        onClick={() => addPaymnt(x)}
                                    >
                                        <IoAddCircleOutline className='scale-110' />
                                        Add Payment
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}

            </div>
            <div className='flex gap-4 p-2 border-t'>
                <button
                    className="blackButton py-1"
                    onClick={() => saveData_payments(uidCollection)}
                >
                    <VscSaveAs className='scale-110' />
                    {getTtl('save', ln)}
                </button>
                <button
                    className="whiteButton py-1"
                    onClick={addInvoice}
                >
                    <IoAddCircleOutline className='scale-110' />
                    Add Invoice
                </button>


                <button
                    className="whiteButton py-1"
                    onClick={deleteItems}
                >
                    <VscArchive className='scale-110' />
                    Delete Invoice
                </button>
            </div>
        </Modal>
    )
}

export default PoInvModal