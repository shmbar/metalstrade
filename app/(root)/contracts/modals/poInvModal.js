import Modal from '@components/modal.js'
import { useContext, useState, useEffect } from 'react'
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
    const { settings, setToast } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [checkedItems, setCheckedItems] = useState([]);


    const handleValue = (e, i) => {
        let itm = valueCon.poInvoices[i]
        itm = { ...itm, [e.target.name]: e.target.value }
        let newObj = [...valueCon.poInvoices]
        newObj[i] = itm;
        setValueCon({ ...valueCon, poInvoices: newObj })
    }


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


    const removeNonNumeric = (num) => num.toString().replace(/[^0-9.]/g, "");


    const handleValuePmnt = (e, i) => {

        if (countDecimalDigits(e.target.value) > 2) return;

        let itm = valueCon.poInvoices[i]
        itm = { ...itm, [e.target.name]: removeNonNumeric(e.target.value) }


        if (itm.invValue != '' && itm.pmnt !== '') {
            itm = { ...itm, blnc: removeNonNumeric(itm.invValue) - removeNonNumeric(itm.pmnt) }
        }

        let newObj = [...valueCon.poInvoices]
        newObj[i] = itm;
        setValueCon({ ...valueCon, poInvoices: newObj })
    }

    const setPrepPayment = (i) => {
        let itm = valueCon.poInvoices[i]
        itm = {
            ...itm, pmnt: itm.invValue, blnc: 0
        }
        let newObj = [...valueCon.poInvoices]
        newObj[i] = itm;
        setValueCon({ ...valueCon, poInvoices: newObj })
    }

    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };

    let newPmnt = {
        id: uuidv4(), pmnt: '', inv: '', invValue: '', invRef: [], blnc: ''
    }

    const addItem = () => {
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


    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title='Purchase Invoices' w='max-w-3xl'>
            <div className='flex flex-col p-1 justify-between gap-2'>
                {valueCon.poInvoices.map((x, i) => {

                    return (
                        <div className='grid grid-cols-12 gap-4 p-1 flex border border-slate-300 rounded-lg' key={i}>
                            <div className='col-span-12 md:col-span-3 flex'>
                                <div className='items-center flex pt-3 pr-2'>
                                    <ChkBox checked={checkedItems.includes(x.id)} size='h-5 w-5' onChange={() => checkItem(x.id)} />
                                </div>
                                <div className='w-full'>
                                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Purchase Inv#:</p>
                                    <input type='text' className="number-separator input text-[15px] h-7  shadow-lg text-xs" name='inv'
                                        value={x.inv} onChange={e => handleValue(e, i)} />
                                </div>

                            </div>

                            <div className='col-span-12 md:col-span-3'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Invoice Value:</p>
                                <input type='text' className="number-separator input text-[15px] h-7 shadow-lg text-xs" name='invValue'
                                    value={addComma(x.invValue, true)} onChange={e => handleValuePmnt(e, i)} />
                            </div>

                            <div className='col-span-12 md:col-span-3'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>
                                    {x.pmnt === x.invValue ? 'Payment' : 'Prepayment'}:<span className='ml-1 text-[0.7rem]'> {isNaN(x.pmnt / x.invValue) ? '-' : (x.pmnt / x.invValue * 100).toFixed(1)}%</span>
                                </p>
                                <div className='flex'>
                                    <input type='text' className="number-separator input text-[15px] shadow-lg h-7 text-xs" name='pmnt'
                                        value={addComma(x.pmnt, true)} onChange={e => handleValuePmnt(e, i)} />
                                    <button className='relative right-6 '>
                                        <MdPayments className='scale-125 text-slate-500' onClick={() => setPrepPayment(i)} />
                                    </button>
                                </div>
                            </div>
                            <div className='col-span-12 md:col-span-3 '>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Balance:</p>
                                <div className='flex pr-3'>
                                    <input type='text' disabled className="number-separator input border-slate-300 text-[15px] h-7 text-xs" name='blnc'
                                        value={addComma(x.blnc, true)} />
                                    <div className='group relative'>
                                        <TbArrowMoveRight className={`scale-[2.5] text-slate-500 ml-4 mt-1 cursor-pointer `}
                                            onClick={switchToStocks} />
                                        <span className="absolute hidden group-hover:flex top-[30px] w-fit p-1
    bg-slate-400 rounded-md text-center text-white text-xs z-10 whitespace-nowrap -left-2">
                                            Stocks</span>

                                    </div>

                                </div>

                            </div>


                        </div>
                    )
                })}

            </div>
            <div className='flex gap-4 p-2 border-t'>
                <button
                    className=" flex items-center justify-center text-white gap-1.5 py-1 w-20  border
                             border-slate-400 bg-slate-400 rounded-md text-xs text-white hover:bg-slate-500 shadow-lg"
                    onClick={addItem}
                >
                    <IoAddCircleOutline className='scale-110' />
                    Add
                </button>
                <button
                    className=" flex items-center justify-center text-white gap-1.5 py-1 w-20  border
                             border-slate-400 bg-slate-400 rounded-md text-xs text-white hover:bg-slate-500 shadow-lg"
                    onClick={() => saveData_payments(uidCollection)}
                >
                    <VscSaveAs className='scale-110' />
                    Save
                </button>

                <button
                    className=" flex items-center justify-center text-white gap-1.5 py-1 w-20  border
                            border-slate-400 bg-slate-400 rounded-md text-xs text-white hover:bg-neutral-500 shadow-lg"
                    onClick={deleteItems}
                >
                    <VscArchive className='scale-110' />
                    Delete
                </button>
            </div>
        </Modal>
    )
}

export default PoInvModal