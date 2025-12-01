import { useContext, useState } from 'react'
import Datepicker from "react-tailwindcss-datepicker";
import { SettingsContext } from "@contexts/useSettingsContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdPayments } from 'react-icons/md';
import { ContractsContext } from "@contexts/useContractsContext";
import dateFormat from "dateformat";
import { UserAuth } from "@contexts/useAuthContext";

import ChkBox from '@components/checkbox';
import { VscSaveAs } from 'react-icons/vsc';
import { v4 as uuidv4 } from 'uuid';
import { VscArchive } from 'react-icons/vsc';
import { usePathname } from 'next/navigation';
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';

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


const Payments = ({ showPayments }) => {

    const { valueInv, setValueInv, saveData_payments } = useContext(InvoiceContext);
    const { settings, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [checkedItems, setCheckedItems] = useState([]);
    const { contractsData, setContractsData, valueCon } = useContext(ContractsContext);
    const pathName = usePathname();


    const handleValueDate = (e, i) => {
        let itm = valueInv.payments[i]
        itm = { ...itm, date: e }
        let newObj = valueInv.payments
        newObj[i] = itm;
        setValueInv({ ...valueInv, payments: newObj })
    }


    const addComma = (nStr) => {
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1,$2');
        }


        const symbol = valueInv.final ? valueInv.cur.sym :
            valueInv.cur !== '' ? settings.Currency.Currency.find(x => x.id === valueInv.cur).symbol : ''
        x2 = x2.length > 3 ? x2.substring(0, 3) : x2
        return (symbol + x1 + x2);
    }


    const removeNonNumeric = (num) => num.toString().replace(/[^0-9.-]/g, "");


    const handleValue = (e, i) => {

        if (countDecimalDigits(e.target.value) > 2) return;

        let itm = valueInv.payments[i]
        itm = { ...itm, [e.target.name]: removeNonNumeric(e.target.value) }
        let newObj = valueInv.payments
        newObj[i] = itm;
        setValueInv({ ...valueInv, payments: newObj })
    }

    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };

    let newPmnt = { id: uuidv4(), date: { startDate: null, endDate: null }, pmnt: '', cur: '' }

    const addItem = () => {
        let pmntArr = [...valueInv.payments, newPmnt]
        setValueInv({ ...valueInv, payments: pmntArr })

    }

    const deleteItems = () => {
        let delItems = valueInv.payments.filter((item) => !checkedItems.includes(item.id));
        setValueInv({ ...valueInv, payments: delItems });

        setCheckedItems([]);
    }

    const setPrepPayment = () => {
  
        let itm = valueInv.payments[0]
        itm = {
            ...itm, pmnt: valueInv.invType === '1111' ? valueInv.totalPrepayment : valueInv.balanceDue
        }
        let newObj = valueInv.payments
        newObj[0] = itm;
        setValueInv({ ...valueInv, payments: newObj })
    }

    const saveD = () => {
        saveData_payments(uidCollection)
        if (pathName === '/contractsreview' || pathName === '/invoicesreview') { //only for contractsreview table
            let tmpValue = { ...valueCon, lstSaved: dateFormat(new Date(), "dd-mmm-yyyy, HH:MM") }
            let tmpArr = contractsData.map((k) => (k.id === valueCon.id ? tmpValue : k));
            setContractsData(tmpArr)
        }
    }

    return (

        <div className={`z-10 relative mt-2 border border-slate-300 rounded-lg 
        ${showPayments ? 'flex animated-div' : 'hidden'}`}>
            <div className=' flex gap-3 p-2 w-full'>

                <div className=' p-2 h-fit'>
                    <p className='text-sm font-medium'>{getTtl('Payments', ln)}:</p>

                    {valueInv.payments.map((x, i) => {
                        return (
                            <div className='pt-2 gap-4 flex' key={i}>
                                <div className='items-center flex pt-3'>
                                    <ChkBox checked={checkedItems.includes(x.id)} size='h-5 w-5' onChange={() => checkItem(x.id)} />
                                </div>
                                <div>
                                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Date', ln)}:</p>
                                    <Datepicker useRange={false}
                                        asSingle={true}
                                        value={x.date}
                                        popoverDirection='up'
                                        onChange={e => handleValueDate(e, i)}
                                        displayFormat={"DD-MMM-YYYY"}
                                        inputClassName='input w-full text-[15px] shadow-lg h-7 text-xs z-20'
                                    />
                                </div>
                                <div >
                                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Actual Payment', ln)}:</p>
                                    <div className='flex'>
                                        <input type='text' className="number-separator input text-[15px] shadow-lg h-[1.84rem] -mt-[0.03rem] text-xs" name='pmnt'
                                            value={addComma(x.pmnt)} onChange={e => handleValue(e, i)} />
                                        {i === 0 && <button className='relative right-6 '>
                                            <MdPayments className='scale-125 text-slate-500' onClick={setPrepPayment} />
                                        </button>}
                                    </div>
                                </div>

                            </div>
                        )
                    })}



                    <div className='flex gap-4 m-2 pt-2'>
                        <Tltip direction='top' tltpText='Save/Update payment'>
                            <button
                                className="blackButton py-1 font-light"
                                onClick={saveD}
                            >
                                <VscSaveAs className='scale-110' />
                                {getTtl('save', ln)}
                            </button>
                        </Tltip>
                        <Tltip direction='top' tltpText='Add new payment'>
                            <button
                                className="whiteButton py-1"
                                onClick={addItem}
                            >
                                <IoAddCircleOutline className='scale-110' />
                                {getTtl('Add', ln)}
                            </button>
                        </Tltip>
                        <Tltip direction='top' tltpText='Delete this payment'>
                            <button
                                className=" whiteButton py-1"
                                onClick={deleteItems}
                            >
                                <VscArchive className='scale-110' />
                                {getTtl('Delete', ln)}
                            </button>
                        </Tltip>
                    </div>
                </div>
            </div>
        </div >


    )
}

export default Payments;