import Modal from '@components/modal.js'
import { useContext, useState, useEffect } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { IoAddCircleOutline } from 'react-icons/io5';
import CBox from '@components/comboboxWH'
import Datepicker from "react-tailwindcss-datepicker";
import { UserAuth } from "@contexts/useAuthContext";

import ChkBox from '@components/checkbox';
import { VscSaveAs } from 'react-icons/vsc';
import { v4 as uuidv4 } from 'uuid';
import { VscArchive } from 'react-icons/vsc';
import { getD, loadStockData, validate } from '@utils/utils'
import { TbFileInvoice } from "react-icons/tb";
import { getTtl } from '@utils/languages';

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


const PoInvModal = ({ isOpen, setIsOpen, setShowPoInvModal }) => {

    const { valueCon, setValueCon, saveData_stocks } = useContext(ContractsContext);
    const { settings, setToast, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [checkedItems, setCheckedItems] = useState([]);
    const [data, setData] = useState([]);
    const [errors, setErrors] = useState([])

    const handleValue = (e, i) => {
        let itm = valueCon.poInvoices[i]
        itm = { ...itm, [e.target.name]: e.target.value }
        let newObj = [...valueCon.poInvoices]
        newObj[i] = itm;
        setValueCon({ ...valueCon, poInvoices: newObj })
    }

    useEffect(() => {

        const loadStock = async () => {
            let stockData = valueCon.stock.length > 0 ? await loadStockData(uidCollection, 'id', valueCon.stock) : []
            setData(stockData)
        }

        loadStock()
    }, [])

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
        x2 = x2.length > 3 && item === 'total' ? x2.substring(0, 3) : x2
        return addSymbol ? (symbol + x1 + x2) : (x1 + x2);
    }


    const removeNonNumeric = (num) => num.toString().replace(/[^0-9.\-]/g, "");


    const handleValuePmnt = (e, i) => {

        if (countDecimalDigits(e.target.value) > 2) return;

        let itm = data[i]
        itm = { ...itm, [e.target.name]: removeNonNumeric(e.target.value) }

        if (e.target.name === 'unitPrc' && itm.qnty !== '') {
            itm = { ...itm, total: removeNonNumeric(itm.qnty) * removeNonNumeric(itm.unitPrc) }
        }

        let newObj = [...data]
        newObj[i] = itm;
        setData(newObj)
    }

    const handleValueQnty = (e, i) => {

        if (countDecimalDigits(e.target.value) > 3) return;

        let itm = data[i]
        itm = { ...itm, [e.target.name]: removeNonNumeric(e.target.value) }

        if (e.target.name === 'qnty' && itm.unitPrc !== '') {
            itm = { ...itm, total: removeNonNumeric(itm.qnty) * removeNonNumeric(itm.unitPrc) }
        }

        let newObj = [...data]
        newObj[i] = itm;
        setData(newObj)
    }

    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };

    let newStock = {
        id: uuidv4(), description: '', qnty: '', unitPrc: '', total: '', poInvoice: '', stock: ''
    }

    const addItem = () => {
        setData([...data, newStock])
    }

    const deleteItems = () => {

        let delItems = data.filter((item) => !checkedItems.includes(item.id));
        setData(delItems)

        setCheckedItems([]);
    }

    const saveD = () => {

        if (data.length >= valueCon.stock.length) { //add new item
            let errs = []
            let isNotFilled = false
            for (let i = 0; i < data.length; i++) {
                errs[i] = validate(data[i], ['description', 'qnty', 'unitPrc', 'poInvoice', 'indDate', 'stock'])
                isNotFilled = Object.values(errs[i]).includes(true); //all filled
            }
            setErrors(errs)
            if (isNotFilled) {
                setToast({ show: true, text: 'Some fields are missing!', clr: 'fail' })
                return;
            }
        }

        saveData_stocks(uidCollection, data)
    }

    const handleDateChange = (e, i) => {
        let newObj = [...data]
        newObj = newObj.map((x, ind) => i === ind ? { ...x, 'indDate': e } : x)
        setData(newObj)
    }

    const openInvoicesModal=()=>{
        setIsOpen(false)
        setShowPoInvModal(true)
    }
    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('Materials Breakdown', ln)} w='max-w-7xl'>
            <div className='flex flex-col p-1 justify-between gap-2'>
                {data.map((x, i) => {

                    return (
                        <div className='grid grid-cols-12 p-1 gap-4 flex border border-slate-300 rounded-lg' key={i}>
                            <div className='col-span-12 md:col-span-3 flex'>
                                <div className='items-center flex pt-3 pr-2'>
                                    <ChkBox checked={checkedItems.includes(x.id)} size='h-5 w-5' onChange={() => checkItem(x.id)} />
                                </div>
                                <div className='w-full'>
                                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Description', ln)}:</p>
                                    <div className='flex flex-col'>
                                        <CBox data={valueCon.productsData.map(x => ({ id: x.id, description: x.description }))}
                                            setValue={setData} value={valueCon} dt={data} indx={i} name='description' classes='shadow-md h-7' />
                                    </div>
                                </div>

                            </div>

                            <div className='col-span-12 md:col-span-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Quantity', ln)} {`(${getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')})`}</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input text-[15px] shadow-lg h-7 text-xs" name='qnty'
                                        value={addComma(x.qnty, false)} onChange={e => handleValueQnty(e, i)} />
                                </div>
                            </div>
                            <div className='col-span-12 md:col-span-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Price', ln)}:</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input text-[15px] shadow-lg h-7 text-xs" name='unitPrc'
                                        value={addComma(x.unitPrc, true)} placeholder="text"
                                        onChange={e => handleValuePmnt(e, i)} />
                                </div>
                            </div>

                            <div className='col-span-12 md:col-span-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Total', ln)}:</p>
                                <div className='flex'>
                                    <input type='text' disabled className="number-separator input text-[15px] border-slate-300 h-7 text-xs" name='total'
                                        value={addComma(x.total, true, 'total')} onChange={e => handleValue(e, i)} />
                                </div>
                            </div>

                            <div className='col-span-12 md:col-span-2'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('PurchaseInv', ln)}#:</p>
                                <div className='flex flex-col'>
                                    <CBox data={valueCon.poInvoices.map(x => ({ id: x.id, poInvoice: x.inv }))}
                                        setValue={setData} value={valueCon} dt={data} indx={i} name='poInvoice' classes='shadow-md h-7' />
                                </div>
                            </div>

                            <div className='col-span-12 md:col-span-2'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Arrival Date', ln)}:</p>
                                <div className='flex flex-col'>
                                    <Datepicker useRange={false}
                                        asSingle={true}
                                        value={x.indDate}
                                        popoverDirection='down'
                                        onChange={e => handleDateChange(e, i)}
                                        displayFormat={"DD-MMM-YYYY"}
                                        inputClassName='input w-full text-[15px] shadow-lg h-7 text-xs'
                                    />
                                </div>
                            </div>



                            <div className='col-span-12 md:col-span-2'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Stock', ln)}:</p>
                                <div className='flex flex-col'>
                                    <CBox data={settings.Stocks.Stocks}
                                        setValue={setData} value={valueCon} dt={data} indx={i} name='stock' classes='shadow-md h-7' />
                                </div>
                            </div>


                        </div>
                    )
                })}


            </div>
            <div className='flex gap-4 p-2 border-t'>
            <button
                    className="blackButton py-1"
                    onClick={saveD}
                >
                    <VscSaveAs className='scale-110' />
                    {getTtl('save', ln)}
                </button>
                <button
                    className="whiteButton py-1"
                    onClick={addItem}
                >
                    <IoAddCircleOutline className='scale-110' />
                    {getTtl('Add', ln)}
                </button>
              

                <button
                    className="whiteButton py-1"
                    onClick={deleteItems}
                >
                    <VscArchive className='scale-110' />
                    {getTtl('Delete', ln)}
                </button>
                <button
                    className="whiteButton py-1"
                    onClick={openInvoicesModal}
                >
                    <TbFileInvoice className='scale-110' />
                    {getTtl('Invoices', ln)} 
                </button>
            </div>
        </Modal>
    )
}

export default PoInvModal