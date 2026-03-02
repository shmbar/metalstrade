import Modal from '@components/modal.js'
import { useContext, useState, useEffect } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { IoAddCircleOutline } from 'react-icons/io5';
import CBox from '@components/comboboxWH'
import Datepicker from "react-tailwindcss-datepicker";
import { UserAuth } from "@contexts/useAuthContext";
import { Pdf } from './pdf/pdfFinal.js';
import ChkBox from '@components/checkbox';
import { VscSaveAs } from 'react-icons/vsc';
import { v4 as uuidv4 } from 'uuid';
import { VscArchive } from 'react-icons/vsc';
import { getD, loadStockData, validate, reOrderTableFinal } from '@utils/utils'
import { TbFileInvoice } from "react-icons/tb";
import { getTtl } from '@utils/languages';
import { FaFilePdf } from 'react-icons/fa';
import FinalSetRemarks from './finalSettlmentRemarks.js';
import Tltip from '@components/tlTip.js';

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
    const { uidCollection , gisAccount} = UserAuth();
    const [checkedItems, setCheckedItems] = useState([]);
    const [data, setData] = useState([]);
    const [errors, setErrors] = useState([])


    useEffect(() => {

        const loadStock = async () => {

            let stockData = valueCon.stock.length > 0 ? await loadStockData(uidCollection, 'id', valueCon.stock) : []

            stockData = stockData.map(z => z.finalqnty == null ? {
                ...z, finalqnty: z.qnty,
                finaltotal: z.total,
                descriptionText: z.descriptionText ?? z.productsData.find(k => k.id === z.description)?.description,
                unitPrcFinal: z.unitPrcFinal ?? z.unitPrc,
                remark: ''
            } : z)

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
        saveData_stocks(uidCollection, data)

    }


    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('FinalSettlmnt', ln)} w='max-w-6xl'>
            <div className='flex flex-col p-1 justify-between gap-4 max-h-[50rem] overflow-y-auto'>
                {data.map((x, i) => {
                    return (
                        <div className='grid grid-cols-12 p-1 gap-2  border border-slate-300 rounded-lg' key={i}>
                            <div className='col-span-12 md:col-span-3 flex'>
                                <div className='items-center flex pt-3 pr-2'>
                                    <ChkBox checked={checkedItems.includes(x.id)} size='h-5 w-5' onChange={() => checkItem(x.id)} />
                                </div>
                                <div className='w-full'>
                                    <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Description', ln)}:</p>
                                    <div className='flex'>
                                        <input type='text' className="number-separator input border-slate-300 h-7 text-xs shadow-lg" name='descriptionText'
                                            value={x.descriptionText} onChange={e => handleValue(e, i)} />
                                    </div>
                                </div>
                            </div>

                            <div className='col-span-12 md:col-span-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Quantity', ln)} {`(${getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')})`}</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input border-slate-300 h-7 text-xs" name='qnty'
                                        disabled defaultValue={addComma(x.qnty, false)} />
                                </div>
                            </div>
                            <div className='col-span-12 md:col-span-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('FinalQuantity', ln)} {`(${getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')})`}</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input shadow-lg h-7 text-xs " name='finalqnty'
                                        value={addComma(x.finalqnty, false)} onChange={e => handleValue(e, i)} />
                                </div>
                            </div>
                            <div className='col-span-12 md:col-span-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Advised Price:</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input h-7  shadow-lg border-slate-300 text-xs" name='unitPrc'
                                        value={addComma(x.unitPrc, true)} onChange={e => handleValue(e, i)}
                                    />
                                </div>
                            </div>

                            <div className='col-span-12 md:col-span-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>Received Price:</p>
                                <div className='flex flex-col'>
                                    <input type='text' className="number-separator input h-7 border-slate-300 text-xs shadow-lg" name='unitPrcFinal'
                                        value={addComma(x.unitPrcFinal, true)} onChange={e => handleValue(e, i)}
                                    />
                                </div>
                            </div>

                            <div className='col-span-12 md:col-span-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Total', ln)}:</p>
                                <div className='flex'>
                                    <input type='text' disabled className="number-separator input border-slate-300 h-7 text-xs" name='finaltotal'
                                        value={addComma(x.finaltotal, true, 'finaltotal')} />
                                </div>
                            </div>

                            <div className='col-span-12 md:col-span-1'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Invoice', ln)}#:</p>
                                <div className='flex'>
                                    <input type='text' disabled className="number-separator input border-slate-300 h-7 text-xs truncate" name='total'
                                        defaultValue={x?.poInvoices[0]?.inv} />
                                </div>
                            </div>

                            <div className='col-span-12 md:col-span-3'>
                                <p className='flex text-xs text-slate-600 font-medium whitespace-nowrap'>{getTtl('Remarks', ln)}:</p>
                                <div className='flex'>
                                    <input type='text' className="shadow-lg input border-slate-300 h-7 text-xs truncate" name='remark'
                                        value={x?.remark} onChange={e => handleValue(e, i)} />
                                </div>
                            </div>

                        </div>
                    )
                })}

                <div className='pt-3 '>
                    <FinalSetRemarks value={valueCon} setValue={setValueCon} />
                </div>
            </div>


            <div className="text-lg font-medium leading-5 text-gray-900 px-3 flex gap-4 flex-wrap justify-center md:justify-start ">
                <div className='flex gap-4 p-2'>
                    <Tltip direction='top' tltpText='Save/Update data'>
                        <button
                            className="blackButton py-1"
                            onClick={saveD}
                        >
                            <VscSaveAs className='scale-110' />
                            {getTtl('save', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Create PDF document'>
                        <button
                            type="button"
                            className="whiteButton"
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
                            <FaFilePdf />
                            PDF
                        </button>
                    </Tltip>
                </div>

            </div>
        </Modal>
    )
}

export default FinalSettlmentModal