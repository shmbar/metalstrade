import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { NumericFormat } from 'react-number-format';
import ChkBox from '@components/checkbox.js'
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdDelete } from 'react-icons/md';
import { getD, reOrderTableCon } from '@utils/utils.js';
import { TbFileInvoice } from "react-icons/tb";
import { TbBuildingWarehouse } from "react-icons/tb";

const ProductsTable = ({ value, setValue, currency, quantityTable, setShowPoInvModal, setShowStockModal, setToast, contractsData }) => {

    const [checkedItems, setCheckedItems] = useState([]);
    const [edit, setEdit] = useState({ status: false, id: null, header: null });
    const inputRef = useRef(null);
    const [value1, setValue1] = useState();

    useEffect(() => {
        if (edit.status) {
            inputRef.current.focus();
            const valueLength = inputRef.current.value.length;
            inputRef.current.setSelectionRange(valueLength, valueLength);
        }
    }, [edit.status]);

    const addItem = () => {
        let newArr = [
            ...value.productsData,
            { id: uuidv4(), description: '', qnty: '', unitPrc: '' },
        ];

        setValue({ ...value, productsData: newArr });
    };

    const checkItem = (i) => {
        if (checkedItems.includes(i)) {
            setCheckedItems(checkedItems.filter((x) => x !== i));
        } else {
            setCheckedItems([...checkedItems, i]);
        }
    };

    const delItem = () => {
        setValue({ ...value, productsData: value.productsData.filter((item) => !checkedItems.includes(item.id)) });
        setCheckedItems([]);
    };

    const handleDoubleClick = (obj, key) => {
        setValue1(obj[key]);
        setEdit({ status: true, id: obj['id'], header: key });
    };

    const handleKeyPress = (e) => {
        const isValidInputQnty = /^\d+(\.\d{0,3})?$/.test(e.target.value);

        if (e.key === 'Enter') {

            if (e.target.name === "qnty" && !isValidInputQnty) {
                setToast({ show: true, text: 'Please enter numbers only with at most three letters after the dot!', clr: 'fail' })
                return;
            }

            const newArr = value.productsData.map((x) =>
                x.id === edit.id ? { ...x, [edit.header]: e.target.value } : x
            );

            setValue({ ...value, productsData: newArr });
            setEdit({ status: false, id: null, header: null });
            setValue1('');
        }

        if (e.key === 'Escape') {
            setEdit({ status: false, id: null, header: null });
            setValue1('');
        }
    };
    const q = getD(quantityTable, value, 'qTypeTable');
    const c = getD(currency, value, 'cur');

    const setInput = (e) => {
        let t = e.target.value;
        t = t.indexOf(".") >= 0 && e.target.name === 'unitPrc' ? t.slice(0, t.indexOf(".") + 3) : t;
        setValue1(t)
    }

    const openInvoicesModal = () => {
        if (value.id === '') {
            setToast({ show: true, text: 'Contract must be saved first!', clr: 'fail' })
            return;
        }

        setShowPoInvModal(true)
    }

    const checkIfAlllowed = () => {
        return value.id !== '' ?
            (contractsData.find(x => x.id === value.id)?.poInvoices)?.length > 0 ? true : false :
            false
    }

    return (
        <div className="w-full justify-center flex">
            <div className="flex flex-col w-full">
                <div className=" overflow-x-auto">
                    <div className="border rounded-lg overflow-hidden">
                        <table className=" table-fixed min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 ">
                                <tr>
                                    <th scope="col" className=" w-1/12 py-1 pl-4 "></th>
                                    <th scope="col" className="w-1/12 px-1 py-1 text-left text-sm font-medium text-gray-500"  >
                                        #</th>
                                    <th scope="col" className="w-6/12 px-1 py-1 text-left text-sm font-medium text-gray-500" >
                                        Description</th>
                                    <th scope="col" className=" w-2/12 px-1 py-1 text-left text-sm font-medium text-gray-500" >
                                        <div>Quantity <span className='font-bold'>
                                            {q !== '' ? '(' + q + ')' : ''}</span></div></th>
                                    <th scope="col" className="w-2/12 px-1 py-1 text-left text-sm font-medium text-gray-500" >
                                        <div>Unit Price <span className='font-bold'>
                                            {c !== '' ? '(' + c + ')' : ''}</span></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {reOrderTableCon(value.productsData).map((obj, i) => {
                                    return (
                                        <tr key={i}>
                                            <td className="py-2 pl-4">
                                                <div className="flex items-center h-5">
                                                    <ChkBox checked={checkedItems.includes(obj.id)} size='h-5 w-5' onChange={() => checkItem(obj.id)} />
                                                </div>
                                            </td>
                                            <td className="px-1 py-2 ">
                                                <div className="flex items-center h-5 text-sm text-gray-800">
                                                    {i + 1}
                                                </div>
                                            </td>
                                            {Object.keys(obj)
                                                .slice(1)
                                                .map((key) => (
                                                    <td
                                                        key={key}
                                                        data-label={key}
                                                        className="px-1 py-1 text-sm text-gray-800 whitespace-normal
                                                       tableStyle"
                                                        onClick={() => handleDoubleClick(obj, key)}
                                                    >
                                                        {edit.status &&
                                                            edit.id === obj['id'] &&
                                                            edit.header === key ? (

                                                            <input
                                                                className="w-full border rounded-md border-slate-400 h-7 
                                focus:outline-0 focus:border-slate-600 indent-1.5 text-sm text-slate-500"
                                                                onKeyDown={handleKeyPress}
                                                                value={value1}
                                                                maxLength={70}
                                                                name={key}
                                                                onChange={(e) => setInput(e)}
                                                                ref={inputRef}
                                                            />
                                                        ) : key === 'unitPrc' ?
                                                            isNaN(obj[key] * 1) ?
                                                                obj[key] :
                                                                <NumericFormat
                                                                    value={obj[key]}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={false}
                                                                    prefix={value.cur && currency.filter(x => x.id === value.cur)[0]['symbol']}
                                                                    decimalScale='2'
                                                                    fixedDecimalScale
                                                                />
                                                            : key === 'qnty' ? (
                                                                <NumericFormat
                                                                    value={obj[key]}
                                                                    displayType="text"
                                                                    thousandSeparator
                                                                    allowNegative={true}
                                                                    decimalScale='3'
                                                                    fixedDecimalScale
                                                                />
                                                            ) : obj[key]
                                                        }
                                                    </td>
                                                ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
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
                    <div className='group relative'>
                        <button
                            className={`flex items-center justify-center text-white gap-1.5 mt-4 px-1 h-8 border border-slate-400 bg-slate-400 rounded-md 
                            text-sm text-white hover:bg-slate-500 shadow-lg
                            ${!value.productsData.map(x => x.description).some(item => item !== '') ? 'opacity-70' : ''}
                            `}
                            onClick={openInvoicesModal}
                            disabled={!value.productsData.map(x => x.description).some(item => item !== '')}
                        >
                            <TbFileInvoice className='scale-110' />
                            Invoices
                        </button>
                        <span className="absolute hidden group-hover:flex top-[50px] w-fit p-1
    bg-slate-400 rounded-md text-center text-white text-xs z-10 whitespace-nowrap -left-2">
                            Purchase Invoices</span>
                    </div>

                    <div className='group relative'>
                        <button
                            className={`flex items-center justify-center text-white gap-1.5 mt-4 px-1 h-8 border border-slate-400  bg-slate-400 rounded-md 
                            text-sm text-white hover:bg-slate-500 shadow-lg
                            ${value.poInvoices.length === 0 ? 'opacity-70' : ''}`}
                            disabled={!checkIfAlllowed()}
                            onClick={() => setShowStockModal(true)}
                        >
                            <TbBuildingWarehouse className='scale-110' />
                            Stocks
                        </button>
                        <span className="absolute hidden group-hover:flex top-[50px] w-fit p-1
    bg-slate-400 rounded-md text-center text-white text-xs z-10 whitespace-nowrap -left-2">
                            Material warehouse</span>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default ProductsTable;
