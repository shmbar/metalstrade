import Modal from '@components/modal.js'
import { useContext, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import CBox from '@components/combobox'
import Switch from '@components/switch'
import { UserAuth } from "@contexts/useAuthContext";
import dateFormat from "dateformat";

import { v4 as uuidv4 } from 'uuid';
import { VscArchive } from 'react-icons/vsc';
import { getD, loadInvoice, saveStockIn } from '@utils/utils'
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { FaFileContract } from "react-icons/fa";
import ShipTable from './shipmentsTable'
import { getTtl } from '@utils/languages';
import { useRouter } from 'next/navigation.js';
import { ContractsContext } from '@contexts/useContractsContext';
import Tltip from '@components/tlTip';
import { InvoiceContext } from '@contexts/useInvoiceContext';

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


const WHvModal = ({ isOpen, setIsOpen, item, setItem, data, setData }) => {

    const { settings, setToast, ln, setDateSelect } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [showBlock, setShowBlock] = useState(false)
    const [newItemStock, setNewItemStock] = useState({ qnty: '', stock: '' })
    const [enabledSwitch, setEnabledSwitch] = useState(true)
    const router = useRouter();
    const { setValueCon, setIsOpenCon } = useContext(ContractsContext);
    const { blankInvoice } = useContext(InvoiceContext);


    const addComma = (nStr, addSymbol) => {
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1,$2');
        }


        const symbol = item.cur !== '' ? settings.Currency.Currency.find(x => x.id === item.cur).symbol : ''
        x2 = x2.length > 3 ? x2.substring(0, 4) : x2
        return addSymbol ? (symbol + x1 + x2) : (x1 + x2);
    }


    const removeNonNumeric = (num) => num.toString().replace(/[^0-9.]/g, "");


    const handleValuePmnt = (e) => {

        if (countDecimalDigits(e.target.value) > 2) return;
        let itm = { ...item, [e.target.name]: removeNonNumeric(e.target.value) }
        if (e.target.name === 'unitPrc' && itm.qnty !== '') {
            itm = { ...itm, total: removeNonNumeric(itm.qnty) * removeNonNumeric(itm.unitPrc) }
        }

        setItem(itm)
    }

    const handleValueQnty = (e) => {

        if (countDecimalDigits(e.target.value) > 3) return;

        let itm = { ...item, [e.target.name]: removeNonNumeric(e.target.value) }
        if (e.target.name === 'qnty' && itm.unitPrc !== '') {
            itm = { ...itm, total: removeNonNumeric(itm.qnty) * removeNonNumeric(itm.unitPrc) }
        }

        setItem(itm)
    }

    const handleValueQnty1 = (e) => {

        if (countDecimalDigits(e.target.value) > 3) return;
        let itm = { ...newItemStock, [e.target.name]: removeNonNumeric(e.target.value) }
        setNewItemStock(itm)
    }

    const moveItems = () => {
        setShowBlock(!showBlock)
    }

    const moveStock = async () => {

        if (newItemStock.qnty === '' || newItemStock.stock === '') {
            setToast({ show: true, text: 'Please fill the required data!', clr: 'fail' })
            return;
        }

        if (newItemStock.qnty * 1 > item.qnty * 1) {
            setToast({ show: true, text: 'Selected weight is bigger than possible!', clr: 'fail' })
            return;
        }

        let itemOut = {
            stock: item.stock, id: uuidv4(), invoice: '', unitPrc: item.unitPrc,
            date: dateFormat(new Date(), 'dd-mmm-yyyy'), qnty: newItemStock.qnty * 1, type: "out",
            supplier: item.supplier, descriptionId: item.data[0].type === 'in' ? item.data[0].description : item.data[0].descriptionId,
            newStock: newItemStock.stock, cur: item.cur, descriptionName: item.descriptionName,
            moveType: 'out'
        }


        let newData = data.map(x => (
            x.ind === item.ind ?
                {
                    ...x, data: [...x.data, itemOut], qnty: x.qnty * 1 - newItemStock.qnty * 1,
                    total: (x.qnty * 1 - newItemStock.qnty * 1) * x.unitPrc
                } : x
        ))

        let newItem = {
            ...item, data: [...item.data, itemOut], qnty: item.qnty * 1 - newItemStock.qnty * 1,
            total: (item.qnty * 1 - newItemStock.qnty * 1) * item.unitPrc,
        }

        setItem(newItem)
        setData(newData)

        let itemIn = item.data.find(x => x.type === 'in')
        itemIn = {
            ...itemIn, id: uuidv4(), qnty: newItemStock.qnty, total: newItemStock.qnty * item.unitPrc,
            stock: newItemStock.stock, invoice: '', oldStock: item.stock, moveType: 'in',
            date: dateFormat(new Date(), 'dd-mmm-yyyy')
        }

        await saveStockIn(uidCollection, [itemOut, itemIn])

        setNewItemStock({ qnty: '', stock: '' })
        setToast({ show: true, text: 'New stock data saved!', clr: 'success' })
    }

    const moveToContracts = async () => {
        let dt = item.data.find(z => z.contractData)?.contractData
        setIsOpen(false)

        let fstDay = new Date(dt.date);
        fstDay.setDate(1);
        fstDay = dateFormat(fstDay, 'yyyy-mm-dd')

        let lstDay = new Date(dt.date);
        lstDay.setMonth(lstDay.getMonth() + 1);

        lstDay.setDate(0);
        lstDay = dateFormat(lstDay, 'yyyy-mm-dd')

        setDateSelect({
            start: fstDay,
            end: lstDay
        })
        let contract = await loadInvoice(uidCollection, 'contracts', dt)

        if (Object.keys(contract).length === 0) {

            const date1 = new Date(dt.date);
            date1.setDate(date1.getDate() - 1);
            dt.date = date1.toISOString().split("T")[0]; // Convert back to 'YYYY-MM-DD' format

            contract = await loadInvoice(uidCollection, 'contracts', dt)

            if (Object.keys(contract).length === 0) {
                setToast({ show: true, text: 'Contract can not be accessed!', clr: 'fail' })
                return;
            }

        }
       
        setValueCon(contract);
        blankInvoice();
        
        router.push("/contracts");

        setIsOpenCon(true)

    }

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('Materials Breakdown', ln)} w='max-w-4xl'>
            <div className='grid grid-cols-12 gap-4 p-2 m-2  border border-slate-300 rounded-lg'>

                <div className='col-span-12 md:col-span-5 flex flex-col'>
                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Description', ln)}:</p>
                    <input type='text' disabled value={item.descriptionName} name='descriptionName' className='input text-[13px] h-7' />
                </div>

                <div className='col-span-12 md:col-span-1 flex flex-col'>
                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Weight', ln)}</p>
                    <input type='text' disabled className="number-separator input text-[15px] h-7 text-xs" name='qnty'
                        value={addComma(item.qnty, false)} onChange={() => { }} />
                </div>
                <div className='col-span-12 md:col-span-1 flex flex-col'>
                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Price', ln)}:</p>
                    <input type='text' disabled className="number-separator input text-[15px] h-7 text-xs" name='unitPrc'
                        value={item.unitPrc ? addComma(item.unitPrc, true) : '-'} onChange={e => handleValuePmnt(e)} />
                </div>

                <div className='col-span-12 md:col-span-2 flex flex-col'>
                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Total', ln)}:</p>
                    <input type='text' disabled className="number-separator input text-[15px] h-7 text-xs" name='total'
                        value={item.total === '-' ? item.total : addComma((item.total * 1).toFixed(2), true)} />
                </div>

                <div className='col-span-12 md:col-span-3 flex flex-col'>
                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap '>{getTtl('Stock', ln)}:</p>
                    <input type='text' disabled value={getD(settings.Stocks.Stocks, item, 'stock')}
                        className='input text-[15px] h-7 text-xs truncate' />
                </div>
            </div>

            {/*----------------- Change Stock-----------*/}

            <div className={` ${showBlock ? 'flex' : 'hidden'} flex  gap-4 p-2 m-2 border border-slate-300 rounded-lg`}>
                <div className='flex flex-col'>
                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Weight', ln)}</p>
                    <input type='text' className="number-separator input text-[15px] shadow-lg h-7 text-xs w-24" name='qnty'
                        value={addComma(newItemStock.qnty, false)} onChange={e => handleValueQnty1(e)} />
                </div>
                <div className='flex flex-col'>
                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Stock', ln)}:</p>
                    <CBox data={settings.Stocks.Stocks}
                        setValue={setNewItemStock} value={newItemStock} name='stock' classes='shadow-md h-7 -mt-1' />
                </div>
                <div className=' flex items-end bottom-1 relative'>
                    <button
                        className="whiteButton w-full flex py-1.5 text-xs"
                        onClick={moveStock}
                        disabled={item.stock === newItemStock.stock}
                    >
                        <FaArrowUpRightFromSquare className='scale-110' />
                        {getTtl('Move to new Stock', ln)}
                    </button>
                </div>

            </div>




            <div className='flex gap-4 p-2 border-t'>
                <Tltip direction='top' tltpText='Move item to a diffrent stock'>
                    <button
                        className="blackButton py-1.5 text-xs"
                        onClick={moveItems}
                    >
                        <VscArchive className='scale-110' />
                        {getTtl('Change Stock', ln)}
                    </button>
                </Tltip>
                <Tltip direction='top' tltpText='View the contract for this item'>
                    <button
                        className="blackButton py-1.5 text-xs"
                        onClick={() => moveToContracts()}
                    >
                        <FaFileContract className='scale-110' />
                        {getTtl('Contract', ln)}
                    </button>
                </Tltip>
            </div>


            <div className='flex items-center p-4 pb-2 gap-2'>
                <p className='text-xs'>{!enabledSwitch ? getTtl('Hide Shipments', ln) : getTtl('Show Shipments', ln)}</p>
                <Switch enabled={enabledSwitch} setEnabled={setEnabledSwitch} />
            </div>

            {enabledSwitch && <ShipTable item={item} data={[]} />}


        </Modal>
    )
}

export default WHvModal