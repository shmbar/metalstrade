import Modal from '@components/modal.js'
import { useContext, useState, useEffect } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import Datepicker from "react-tailwindcss-datepicker";
import { UserAuth } from "@contexts/useAuthContext";

import ChkBox from '@components/checkbox';
import { v4 as uuidv4 } from 'uuid';
import { getD, loadStockData, validate } from '@utils/utils'
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';
import { Selector } from '@components/selectors/selectShad.js';
import { Button } from '@components/ui/button.jsx';
import {  Save, CirclePlus, ScrollText, Trash, } from "lucide-react";



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

            stockData = stockData.sort((a, b) => {
                const dateA = a.indDate?.endDate ? new Date(a.indDate.endDate).getTime() : Infinity;
                const dateB = b.indDate?.endDate ? new Date(b.indDate.endDate).getTime() : Infinity;
                return dateA - dateB;
            })

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

        // if (countDecimalDigits(e.target.value) > 2) return;

        let itm = data[i]
        itm = { ...itm, [e.target.name]: removeNonNumeric(e.target.value) }

        if (e.target.name === 'unitPrc' && itm.qnty !== '') {
            itm = {
                ...itm,
                total: removeNonNumeric(itm.qnty) === '0' ? removeNonNumeric(itm.unitPrc) :
                    Math.round(removeNonNumeric(itm.qnty) * removeNonNumeric(itm.unitPrc) * 100) / 100
            }
        }

        let newObj = [...data]
        newObj[i] = itm;
        setData(newObj)
    }

    const handleValueQnty = (e, i) => {

        //   if (countDecimalDigits(e.target.value) > 3) return;

        let itm = data[i]
        itm = { ...itm, [e.target.name]: removeNonNumeric(e.target.value) }

        if (e.target.name === 'qnty' && itm.unitPrc !== '') {
            itm = {
                ...itm, total:
                    Math.round(removeNonNumeric(itm.qnty) * removeNonNumeric(itm.unitPrc) * 100) / 100
            }
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

    const checkItemSP = (i) => {
        setData(data.map(z => z.id === i ? { ...z, spInv: z.spInv ? !z.spInv : true } : z));
    };
    const checkItemDrft = (i) => {
        setData(data.map(z => z.id === i ? { ...z, draft: z.draft ? !z.draft : true } : z));
    };

    const handleValue1 = (e, i) => {
        setData(data.map((z, index) => index === i ? { ...z, [e.target.name]: e.target.value } : z));
    }

    let newStock = {
        id: uuidv4(), description: '', qnty: '', unitPrc: '', total: '', poInvoice: '', indDate: null, stock: '',
        spInv: false, compName: '', status: '', client: ''
    }

    const addItem = () => {
        setData([...data, newStock])
    }

    const deleteItems = () => {

        let delItems = data.filter((item) => !checkedItems.includes(item.id));
        setData(delItems)

        setCheckedItems([]);
    }

    const saveD = async () => {

        if (data.length >= valueCon.stock.length) { //add new item
            let errs = []
            let isNotFilled = false
            for (let i = 0; i < data.length; i++) {
                let tmp = { ...data[i] }
                if (tmp.spInv) {
                    tmp = { ...tmp, indDate: tmp?.indDate?.startDate ?? null }
                }
                errs[i] = validate(tmp, ['description', 'qnty', 'unitPrc', 'poInvoice', 'indDate', 'stock'])
                isNotFilled = Object.values(errs[i]).includes(true); //all filled
            }

            setErrors(errs)
            const hasTrueValue = errs.some(item => Object.values(item).includes(true));
            if (hasTrueValue) {
                setToast({ show: true, text: 'Some fields are missing!', clr: 'fail' })
                return;
            }
        }

        saveData_stocks(uidCollection, data)

    }

    const handleDateChange = (e, i) => {
        setData(prev =>
            prev.map((x, ind) => ind === i ? { ...x, indDate: e } : x)
        );
    };

    const openInvoicesModal = () => {
        setIsOpen(false)
        setShowPoInvModal(true)
    }

    const statusArr = [{ id: 'sold', status: 'Sold' }, { id: 'unsold', status: 'Unsold' }]


    const handleChange = (e, name, indx) => {
        if (name === 'description') {
            const current = data[indx];

            // unit price
            let unitPrc = valueCon.productsData.find(q => q.id === e)?.unitPrc ?? 0;

            unitPrc = isNaN(Number(unitPrc)) ? 0 : Number(unitPrc);

            // calculate total
            const qnty = current.qnty;
            let total = current.total;

            if (unitPrc !== "" && qnty !== "") {
                total = qnty === "0" ? unitPrc : unitPrc * Number(qnty);
            }

            const updatedItem = { ...current, [name]: e, unitPrc, total, };

            setData(prev =>
                prev.map((item, i) => (i === indx ? updatedItem : item))
            );

        } else if (name === 'poInvoice' || name === 'stock' || name === 'status' || name === 'client') {
            setData(prev =>
                prev.map((item, i) =>
                    i === indx ? { ...item, [name]: e } : item
                )
            );
        }
    }

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('Materials Breakdown', ln)}
            w={data.map(z => z.spInv).includes(true) ? 'max-w-[1660px]' : 'max-w-[1540px]'}>
            <div className='flex flex-col p-1 justify-between gap-2 '>
                {data.map((x, i) => {

                    return (
                        <div className='flex flex-wrap p-1 gap-2 border-2 border-[#b8ddf8] rounded-2xl bg-[#f4f9ff]' key={x.id}>
                            <div className='flex'>
                                <div className='items-center flex pt-3 pr-2'>
                                    <ChkBox checked={checkedItems.includes(x.id)} size='h-5 w-5' onChange={() => checkItem(x.id)} />
                                </div>
                                <div className='md:max-w-52 w-full pt-2 md:pt-0'>
                                    <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Description', ln)}:</p>
                                    <div className='flex flex-col w-36'>
                                        <Selector
                                            arr={valueCon.productsData} value={data[i]}
                                            onChange={(e) => handleChange(e, 'description', i)}
                                            name='description' classes='h-7'
                                        />
                                    </div>
                                </div>
                            </div>



                            <div className='md:max-w-24 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Quantity', ln)} {`(${getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')})`}</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input shadow-lg h-7 responsiveTextTable" name='qnty' style={{ fontFamily: 'inherit' }}
                                        value={addComma(x.qnty, false)} onChange={e => handleValueQnty(e, i)} />
                                </div>
                            </div>
                            <div className='md:max-w-24 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Price', ln)}:</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input shadow-lg h-7 responsiveTextTable" name='unitPrc' style={{ fontFamily: 'inherit' }}
                                        value={addComma(x.unitPrc, true)} placeholder="text"
                                        onChange={e => handleValuePmnt(e, i)} />
                                </div>
                            </div>

                            <div className='md:max-w-24 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Total', ln)}:</p>
                                <div className='flex'>
                                    <input type='text' disabled className="number-separator input border-slate-300 h-7 responsiveTextTable" name='total'
                                        value={addComma(x.total, true, 'total')} onChange={e => handleValue(e, i)} />
                                </div>
                            </div>

                            <div className='md:max-w-36 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('PurchaseInv', ln)}#:</p>
                                <div className='flex flex-col w-36'>
                                    <Selector
                                        arr={valueCon.poInvoices.map(x => ({ id: x.id, poInvoice: x.inv }))}
                                        value={data[i]}
                                        onChange={(e) => handleChange(e, 'poInvoice', i)}
                                        name='poInvoice' classes='h-7'
                                    />
                                </div>
                            </div>

                            <div className='md:max-w-36 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Arrival Date', ln)}:</p>
                                <div className='flex flex-col'>
                                    <Datepicker useRange={false}
                                        asSingle={true}
                                        value={x.indDate}
                                        popoverDirection='down'
                                        onChange={e => handleDateChange(e, i)}
                                        displayFormat={"DD-MMM-YYYY"}
                                        inputClassName='input w-full shadow-lg h-7 responsiveTextTable'
                                    />
                                </div>
                            </div>



                            <div className='md:max-w-44 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Stock', ln)}:</p>
                                <div className='flex flex-col w-36'>
                                    <Selector
                                        arr={settings.Stocks.Stocks}
                                        value={data[i]}
                                        onChange={(e) => handleChange(e, 'stock', i)}
                                        name='stock' classes='h-7'
                                        secondaryName='nname'
                                    />
                                </div>
                            </div>

                            <div className='md:max-w-28 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Status', ln)}</p>
                                <div className='flex flex-col w-24'>
                                    <Selector
                                        arr={statusArr}
                                        value={data[i]}
                                        onChange={(e) => handleChange(e, 'status', i)}
                                        name='status' classes='h-7'
                                    />
                                </div>
                            </div>

                            <div className='md:max-w-24 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >Sales Po#</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input shadow-lg h-7 responsiveTextTable truncate" name='salesPo' style={{ fontFamily: 'inherit' }}
                                        value={x.salesPo} placeholder="Sales Po#"
                                        onChange={e => handleValue1(e, i)} />
                                </div>
                            </div>

                            <div className='md:max-w-40 pt-2 md:pt-0'>
                                <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >{getTtl('Consignee', ln)}</p>
                                <div className='flex flex-col w-40'>
                                    <Selector
                                        arr={settings.Client.Client}
                                        value={data[i]}
                                        onChange={(e) => handleChange(e, 'client', i)}
                                        name='client' classes='h-7'
                                        secondaryName='nname'
                                    />
                                </div>
                            </div>
                            <Tltip direction='left' tltpText='Draft'>
                                <div className='items-center flex pt-3 pl-1'>
                                    <ChkBox checked={x.draft ?? false} size='h-5 w-5' onChange={() => checkItemDrft(x.id)} />
                                </div>
                            </Tltip >
                            <Tltip direction='left' tltpText='Misc Inv'>
                                <div className='items-center flex pt-3 pl-1'>
                                    <ChkBox checked={x.spInv ?? false} size='h-5 w-5' onChange={() => checkItemSP(x.id)} />
                                </div>
                            </Tltip >
                            {x.spInv &&
                                <div className='md:max-w-28 pt-2 md:pt-0'>
                                    <p className='flex responsiveTextTable font-medium whitespace-nowrap text-[var(--chathams-blue)]' >Comp. Name</p>
                                    <div className='flex flex-col'>
                                        <input type='text' className="number-separator input shadow-lg h-7 responsiveTextTable truncate"
                                            name='compName' style={{ fontFamily: 'inherit' }} value={x.compName} onChange={e => handleValue1(e, i)} />
                                    </div>
                                </div>
                            }

                        </div>
                    )
                })}


            </div>
            <div className='flex gap-4 p-2 border-t'>
                <Button
                    className="h-8 px-3"
                    onClick={saveD}
                >
                    <Save />
                    {getTtl('save', ln)}
                </Button>
                <Button
                    className="h-8 px-3"
                    variant='outline'
                    onClick={addItem}
                >
                    <CirclePlus />
                    {getTtl('Add', ln)}
                </Button>

                <Button
                    className="h-8 px-3"
                    variant='outline'
                    onClick={deleteItems}
                >
                    <Trash />
                    {getTtl('Delete', ln)}
                </Button>
                <Button
                    className="h-8 px-3"
                    variant='outline'
                    onClick={openInvoicesModal}
                >
                    <ScrollText />
                    {getTtl('Invoices', ln)}
                </Button>
            </div>
        </Modal>
    )
}

export default PoInvModal