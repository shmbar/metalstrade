import { useState, useRef, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { NumericFormat } from 'react-number-format';
import ChkBox from '@components/checkbox.js'
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdDelete } from 'react-icons/md';
import { getD, loadStockDataPerDescription, loadInvoice } from '@utils/utils.js';
import { SettingsContext } from "@contexts/useSettingsContext";
import CBox from '@components/comboboxProductSelect'
import CBox1 from '@components/comboboxStockAvailability'

import SlctOpt from '@components/invoicePrdSlct'



const cols = ['container', 'qnty', 'unitPrc', 'total', 'stock', 'stockValue']

const ProductsTable = ({ value, setValue, currency, settings, uidCollection, setDeleteProducts, materialsArr }) => {

    const [checkedItems, setCheckedItems] = useState([]);
    const [edit, setEdit] = useState({ status: false, id: null, header: null });
    const inputRef = useRef(null);
    const [value1, setValue1] = useState();
    const [percent, setPercent] = useState(false)
    const [prepayment, setPrepayment] = useState(false)
    const fnl = value.final;
    const { setToast } = useContext(SettingsContext);
    const [valueDesc, setValueDesc] = useState('')


   useEffect(() => {

        if (edit.status || percent || prepayment) {
            inputRef.current.focus();
            const valueLength = inputRef.current.value.length;
            inputRef.current.setSelectionRange(valueLength, valueLength);
        }

    }, [edit.status, percent, prepayment]);

    const addItem = () => {
        
        if (materialsArr.length===0) {
            setToast({ show: true, text: 'Contract`s materials table is empty!', clr: 'fail' })
            return;
        }

        let newArr = [
            ...value.productsDataInvoice,
            {
                id: uuidv4(), po: '', descriptionId: '', container: '', qnty: '', unitPrc: '', total: '',
                descriptionText: '', isSelection: true, stock: '', stockValue: ''
            },
        ];
        setValue({ ...value, productsDataInvoice: newArr });
    };

    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };

    const delItem = () => {

        let tmptotalAmount = value.productsDataInvoice.filter((item) => !checkedItems.includes(item.id))
            .map(x => x.total).reduce((accumulator, currentValue) => accumulator + currentValue, 0)

        setValue({
            ...value, productsDataInvoice: value.productsDataInvoice.filter((item) => !checkedItems.includes(item.id)), totalAmount: tmptotalAmount,
            totalPrepayment: value.invType === '1111' ? value.percentage !== '' ?
                value.percentage / 100 * tmptotalAmount : '' : value.totalPrepayment,
            balanceDue: (value.invType === '2222' || value.invType === '3333') ? tmptotalAmount - value.totalPrepayment :
                value.balanceDue
        });

        setDeleteProducts(checkedItems)
        setCheckedItems([]);
    };

    const handleDoubleClick = (obj, key) => {

        if (!['total', 'description', 'stock', 'stockValue'].includes(key)) {
            setValue1(obj[key]);
            setEdit({ status: true, id: obj['id'], header: key });
            setPercent(false)
            setPrepayment(false)
        }
    };

    const handleClick1 = () => {
        setPercent(true)
        setPrepayment(false)
        setEdit({ status: false, id: null, header: null });
        setValue1(value.percentage);
    }

    const handleClick2 = () => {
        setPrepayment(true)
        setPercent(false)
        setEdit({ status: false, id: null, header: null });
        setValue1(value.totalPrepayment);
    }

    const handleClick3 = (obj, name) => {
        setValueDesc(obj[name]);
        setEdit({ status: true, id: obj['id'], header: 'description' });
        setPercent(false)
        setPrepayment(false)
    }


    const handleKeyPress = (e) => {
        const isValidInputUnitPrc = /^\d+(\.\d{0,2})?$/.test(e.target.value);
        const isValidInputQnty = /^\d+(\.\d{0,3})?$/.test(e.target.value);

        if (e.key === 'Enter') {
            if (e.target.name === "unitPrc" && !isValidInputUnitPrc) {
                setToast({ show: true, text: 'Please enter numbers only!', clr: 'fail' })
                return;
            }

            if (e.target.name === "qnty" && !isValidInputQnty) {
                setToast({ show: true, text: 'Please enter numbers only with at most three digits after the dot!', clr: 'fail' })
                return;
            }


            let newArr = value.productsDataInvoice.map((x) =>
                x.id === edit.id ? { ...x, [edit.header]: e.target.value } : x
            );
            newArr = newArr.map(x => ({ ...x, total: x.qnty * x.unitPrc }))

            let tmptotalAmount = newArr.map(x => x.total)
                .reduce((accumulator, currentValue) => accumulator + currentValue, 0)

            setValue({
                ...value, productsDataInvoice: newArr, totalAmount: tmptotalAmount,
                totalPrepayment: value.invType === '1111' ? value.percentage !== '' ?
                    value.percentage / 100 * tmptotalAmount : '' : value.totalPrepayment,
                balanceDue: (value.invType === '2222' || value.invType === '3333') ? tmptotalAmount - value.totalPrepayment :
                    value.balanceDue
            });
            setEdit({ status: false, id: null, header: null });
            setValue1('');
        }

        if (e.key === 'Escape') {
            setEdit({ status: false, id: null, header: null });
            setValue1('');
        }
    };

    const handleKeyPress1 = (e) => {

        const isValidInputPerc = /^\d+(\.\d{0,2})?$/.test(e.target.value);

        if (e.key === 'Enter') {

            if (!isValidInputPerc) {
                setToast({ show: true, text: 'Please enter numbers only!', clr: 'fail' })
                return;
            }

            setValue({
                ...value, percentage: e.target.value,
                totalPrepayment: e.target.value / 100 * value.totalAmount
            });
            setPercent(false);
            setValue1('');
        }

        if (e.key === 'Escape') {
            setPercent(false);
            setValue1('');
        }
    };

    const handleKeyPress2 = (e) => {
        const isValidInputPrep = /^\d+(\.\d{0,2})?$/.test(e.target.value);

        if (e.key === 'Enter') {

            if (!isValidInputPrep) {
                setToast({ show: true, text: 'Please enter numbers only!', clr: 'fail' })
                return;
            }

            setValue({
                ...value, totalPrepayment: e.target.value, balanceDue: value.totalAmount - e.target.value
            });
            setPrepayment(false);
            setValue1('');
        }

        if (e.key === 'Escape') {
            setPrepayment(false);
            setValue1('');
        }
    };

    const handleKeyPress3 = (e) => {

        if (e.key === 'Enter') {
            let newArr = value.productsDataInvoice.map((x) =>
                x.id === edit.id ? { ...x, descriptionText: valueDesc } : x
            );
            setValue({ ...value, productsDataInvoice: newArr });

            setEdit({ status: false, id: null, header: null });
            setValueDesc('');
        }


        if (e.key === 'Escape') {
            setPrepayment(false);
            setValueDesc('');
        }
    }


    const c = fnl ? value.cur.cur : getD(currency, value, 'cur');
    const contTitle = fnl ? value.shpType : value.shpType === '323' ? 'Container No' :
        value.shpType === '434' ? 'Truck No' :
            value.shpType === '565' ? 'Container pls' : 'Flight No'
    const currentCur = fnl ? value.cur.sym : value.cur && currency.find(x => x.id === value.cur)['symbol']

    const setInput = (e) => {
        let t = e.target.value;
        t = t.indexOf(".") >= 0 && e.target.name === 'unitPrc' ? t.slice(0, t.indexOf(".") + 3) : t;
        setValue1(t)
    }



    const selectOrEdit = (val, i) => {

        let itm = value.productsDataInvoice[i]
        itm = { ...itm, isSelection: val === '1' ? false : true }

        if (val === '1') {

            // avoid initial editing =>    setEdit({ status: true, id: value.productsDataInvoice[i]['id'], header: 'description' });
            setValueDesc(materialsArr.find(x => x.id === value.productsDataInvoice[i].descriptionId)['description']);
            itm = {
                ...itm,
                descriptionText: materialsArr.find(x => x.id === value.productsDataInvoice[i].descriptionId)['description']
            }
        }

        let newArr = [...value.productsDataInvoice]
        newArr[i] = itm
        setValue({ ...value, productsDataInvoice: newArr });
    } 

    return (
        <div className="w-full justify-center flex">
            <div className="flex flex-col w-full">
                <div className=" overflow-x-auto">
                    <div className="border rounded-lg overflow-hidden">
                        <table id='my-table' className=" table-fixed min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 ">
                                <tr>
                                    <th scope="col" className=" w-0/12 py-1 px-6"></th>
                                    <th scope="col" className="w-0/12 pr-1 py-1 text-left text-sm font-medium text-gray-500"  >
                                        #</th>
                                    <th scope="col" className="w-1/12 py-1 px-1 text-left text-sm font-medium text-gray-500"  >
                                        PO#</th>
                                    <th scope="col" className="w-4/12 px-1 py-1 text-left text-sm font-medium text-gray-500" >
                                        Description</th>
                                    <th scope="col" className="w-2/12 px-1 py-1 text-left text-sm font-medium text-gray-500" >
                                        {contTitle}</th>
                                    <th scope="col" className=" w-1/12 px-1 py-1 text-left text-sm font-medium text-gray-500" >
                                        Quantity MT</th>
                                    <th scope="col" className="w-1/12 px-1 py-1 text-left text-sm font-medium text-gray-500" >
                                        <div className='table-caption'>Unit Price <span className='text-xs'>
                                            {c !== '' ? '(' + c + ')' : ''}</span></div></th>
                                    <th scope="col" className="w-1/12 px-1 py-1 text-left text-sm font-medium text-gray-500" >
                                        <div>Total <span className='text-xs'>
                                            {c !== '' ? '(' + c + ')' : ''}</span></div></th>
                                    <th scope="col" className=" w-2/12 px-1 py-1 text-left text-sm font-medium text-gray-500 border-l" >
                                        Stock</th>
                                    <th scope="col" className=" w-1/12 px-1 py-1 text-left text-sm font-medium text-gray-500" >
                                        Available Quantity (MT)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {value.productsDataInvoice.map((obj, i) => {
                                    return (
                                        <tr key={i}>
                                            <td className="py-2 pl-4">
                                                <div className="flex items-center h-5">
                                                    <ChkBox checked={checkedItems.includes(obj.id)} size='h-5 w-5' onChange={() => checkItem(obj.id)} />
                                                </div>
                                            </td>
                                            <td className="px-1 py-2">
                                                <div className="flex items-center h-5 text-sm text-gray-800">
                                                    {i + 1}
                                                </div>
                                            </td>
                                            <td
                                                data-label='po'
                                                className="px-1 py-1 text-sm text-gray-800 whitespace-normal"
                                                onClick={() => !fnl && handleDoubleClick(obj, 'po')}
                                            >
                                                {edit.status &&
                                                    edit.id === obj['id'] &&
                                                    edit.header === 'po' ? (

                                                    <input
                                                        className="w-full border rounded-md border-slate-400 h-7 
                                focus:outline-0 focus:border-slate-600 indent-1.5 text-sm text-slate-500"
                                                        onKeyDown={handleKeyPress}
                                                        value={value1}
                                                        maxLength={15}
                                                        name='po'
                                                        onChange={(e) => setInput(e)}
                                                        ref={inputRef}
                                                    />
                                                ) : obj['po']
                                                }
                                            </td>
                                            <td
                                                data-label='description'
                                                className="px-1 py-1 text-sm text-gray-800 whitespace-normal"
                                            >
                                                <div className='flex items-center gap-1'>
                                                    {obj.isSelection ?
                                                        <CBox data={materialsArr} setValue={setValue} value={value}
                                                            indx={i} name='descriptionId' classes='shadow-md'
                                                            uidCollection={uidCollection} disabled={fnl}/>
                                                        :
                                                        <div className='w-full'
                                                            onClick={() => !fnl && handleClick3(obj, 'descriptionText')}
                                                        >
                                                            {edit.status &&
                                                                edit.id === obj['id'] &&
                                                                edit.header === 'description' ?
                                                                <input
                                                                    className="w-full border rounded-md border-slate-400 h-7 
                                focus:outline-0 focus:border-slate-600 indent-1.5 text-sm text-slate-500"
                                                                    onKeyDown={handleKeyPress3}
                                                                    value={valueDesc}
                                                                    maxLength={80}
                                                                    name='description'
                                                                    onChange={(e) => setValueDesc(e.target.value)}
                                                                    ref={inputRef}
                                                                />
                                                                :
                                                                obj['descriptionText']
                                                            }
                                                        </div>
                                                    }
                                                    <div className={`${obj.descriptionId === '' ? 'hidden' : 'flex'}`}>
                                                        <SlctOpt isSelection={value.productsDataInvoice[i].isSelection}
                                                            selectOrEdit={selectOrEdit} indx={i} /> 
                                                    </div>
                                                </div>

                                            </td>


                                            {cols.map((key) => (
                                                <td
                                                    key={key}
                                                    data-label={key}
                                                    className={`px-1 py-1 text-sm text-gray-800 whitespace-normal
                                                    ${key === 'stock' ? 'border-l' : ''}`}
                                                    onClick={() => !fnl && handleDoubleClick(obj, key)}
                                                >
                                                    {edit.status &&
                                                        edit.id === obj['id'] &&
                                                        edit.header === key ? (

                                                        <input
                                                            className="w-full border rounded-md border-slate-400 h-7 
                                focus:outline-0 focus:border-slate-600 indent-1.5 text-sm text-slate-500"
                                                            onKeyDown={handleKeyPress}
                                                            value={value1}
                                                            maxLength={key === 'container' ? 17 : 100}
                                                            name={key}
                                                            onChange={(e) => setInput(e)}
                                                            ref={inputRef}
                                                        />
                                                    ) :
                                                        key === 'unitPrc' || key === 'total' ? (
                                                            <NumericFormat
                                                                value={obj[key]}
                                                                displayType="text"
                                                                thousandSeparator
                                                                allowNegative={true}
                                                                prefix={currentCur}
                                                                decimalScale='2'
                                                                fixedDecimalScale
                                                            />
                                                        ) : key === 'qnty' ? (
                                                            <div>
                                                                <NumericFormat
                                                                    value={obj[key]}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={false}
                                                                    decimalScale='3'
                                                                    fixedDecimalScale
                                                                />
                                                            </div>
                                                        ) : key === 'stock' ? (
                                                            <CBox1 data={settings.Stocks.Stocks}
                                                                setValue={setValue} value={value} name='stock'
                                                                dt={value.productsDataInvoice} indx={i} classes='shadow-md h-7'
                                                                disabled={obj.descriptionId === '' || fnl} uidCollection={uidCollection} />
                                                        ) : key === 'stockValue' ? (
                                                            <NumericFormat
                                                                value={obj[key]}
                                                                displayType="text"
                                                                thousandSeparator
                                                                allowNegative={true}
                                                                decimalScale={obj[key] === 0 ? 0 : 3}
                                                                fixedDecimalScale
                                                            />
                                                        ) :
                                                            obj[key]
                                                    }
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                                <tr >
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="px-1 py-2 text-xs text-slate-600 whitespace-nowrap border-t border-slate-500">
                                        Total Amount:
                                    </td>
                                    <td className="px-1 py-2 border-t border-slate-500"></td>
                                    <td className="px-1 py-2 text-sm text-slate-800 whitespace-nowrap border-t border-slate-500">
                                        <NumericFormat
                                            value={value.totalAmount}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative={false}
                                            prefix={currentCur}
                                            decimalScale='2'
                                            fixedDecimalScale
                                        />
                                    </td>
                                    <td className="py-2 pl-4 border-l"></td>
                                    <td className="py-2 pl-4"></td>
                                </tr>

                                {(value.invType === '1111' || value.invType === 'Invoice') && <tr >
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="py-2 pl-4"></td>
                                    <td className="px-1 py-2 text-xs text-slate-600 whitespace-nowrap ">
                                        Prepayment:
                                    </td>
                                    <td className="px-1 py-2 text-sm text-slate-800 whitespace-nowrap" onClick={() => !fnl && handleClick1()}>
                                        {percent ?
                                            <input
                                                className="w-full border rounded-md border-slate-400 h-7 
                focus:outline-0 focus:border-slate-600 indent-1.5 text-sm text-slate-500"
                                                onKeyDown={handleKeyPress1}
                                                value={value1}
                                                onChange={(e) =>
                                                    setValue1(e.target.value)
                                                }
                                                ref={inputRef}
                                            />
                                            :
                                            <NumericFormat
                                                value={value.percentage}
                                                displayType="text"
                                                allowNegative={false}
                                                suffix={'%'}
                                                fixedDecimalScale
                                            />
                                        }
                                    </td>
                                    <td className="px-1 py-2 text-sm text-slate-800 whitespace-nowrap">
                                        <NumericFormat
                                            value={value.totalPrepayment}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative={false}
                                            prefix={currentCur}
                                            decimalScale='2'
                                            fixedDecimalScale
                                        />
                                    </td>
                                    <td className="py-2 pl-4 border-l"></td>
                                    <td className="py-2 pl-4"></td>
                                </tr>}

                                {((value.invType === '2222' || value.invType === 'Credit Note') ||
                                    (value.invType === '3333' || value.invType === 'Final Invoice')) && <tr >
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="px-1 py-2 text-xs text-slate-600 whitespace-nowrap ">
                                            Prepaid Amount:
                                        </td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="px-1 py-2 text-sm text-slate-800 whitespace-nowrap" onClick={() => !fnl && handleClick2()}>
                                            {prepayment ?
                                                <input
                                                    className="w-full border rounded-md border-slate-400 h-7 
                focus:outline-0 focus:border-slate-600 indent-1.5 text-sm text-slate-500"
                                                    onKeyDown={handleKeyPress2}
                                                    value={value1}
                                                    onChange={(e) =>
                                                        setValue1(e.target.value)
                                                    }
                                                    ref={inputRef}
                                                />
                                                :
                                                <NumericFormat
                                                    value={value.totalPrepayment}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={currentCur}
                                                    decimalScale='2'
                                                    fixedDecimalScale
                                                />
                                            }
                                        </td>
                                        <td className="py-2 pl-4 border-l"></td>
                                        <td className="py-2 pl-4"></td>
                                    </tr>
                                }
                                {((value.invType === '2222' || value.invType === 'Credit Note') ||
                                    (value.invType === '3333' || value.invType === 'Final Invoice')) && <tr >
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="px-1 py-2 text-xs text-slate-600 whitespace-nowrap font-medium">
                                            Balance Due:
                                        </td>
                                        <td className="py-2 pl-4"></td>
                                        <td className="px-1 py-2 text-sm text-slate-800 whitespace-nowrap">
                                            <NumericFormat
                                                value={value.balanceDue}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={currentCur}
                                                decimalScale='2'
                                                fixedDecimalScale
                                            />

                                        </td>
                                        <td className="py-2 pl-4 border-l"></td>
                                        <td className="py-2 pl-4"></td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
                {!fnl &&
                    <div className="flex gap-5 ">
                        <div className='group relative'>
                            <button
                                className=" flex items-center justify-center text-white gap-1.5 mt-4 w-20 h-8 border
                             border-slate-400 bg-slate-400 rounded-md text-sm text-white hover:bg-slate-500 shadow-lg"
                                onClick={() => addItem()}
                            >
                                <IoAddCircleOutline className='scale-110' />
                                Add
                            </button>
                            <span className="absolute hidden group-hover:flex top-[50px] w-fit p-1
    bg-slate-400 rounded-md text-center text-white text-xs z-10 whitespace-nowrap -left-0.5">
                                Add product</span>
                        </div>
                        <div className='group relative'>
                            <button
                                className="flex items-center justify-center text-white gap-1.5 mt-4 w-20 h-8 border border-slate-400 bg-slate-400 rounded-md 
                            text-sm text-white hover:bg-slate-500 shadow-lg"
                                onClick={() => delItem()}
                            >
                                <MdDelete className='scale-110' />
                                Delete
                            </button>
                            <span className="absolute hidden group-hover:flex top-[50px] w-fit p-1
    bg-slate-400 rounded-md text-center text-white text-xs z-10 whitespace-nowrap -left-2">
                                Delete product</span>
                        </div>

                    </div>
                }
            </div>
        </div>
    );
}

export default ProductsTable;
