import { useState, useContext, useEffect } from 'react';
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { v4 as uuidv4 } from 'uuid';
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdDeleteOutline } from 'react-icons/md';
import { BiEditAlt } from 'react-icons/bi';
import { AiOutlineClear } from 'react-icons/ai';
import { validate, ErrDiv, sortArr } from '../../../../utils/utils'
import ModalToDelete from '../../../../components/modalToProceed';
import { UserAuth } from "../../../../contexts/useAuthContext";
import { getTtl } from '../../../../utils/languages';
import CBox from '../_components/stocksComb'
import Tltip from '../../../../components/tlTip';

const Stocks = () => {

    const { settings, updateSettings, compData, setCompData } = useContext(SettingsContext);
    const [value, setValue] = useState({
        stock: '', country: '', address: '', phone: '', other: '', deleted: false, sType: '', nname: ''
    })
    const [disabledButton, setDissablesButton] = useState(false)
    const [errors, setErrors] = useState({})
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const { uidCollection } = UserAuth();
    const ln = compData.lng

    useEffect(() => {
        const fetchStocks = async () => {
            if (!settings?.Stocks || !Array.isArray(settings?.Stocks?.Stocks)) {
                if (uidCollection) {
                    const { loadDataSettings } = await import('../../../../utils/utils');
                    const stocksData = await loadDataSettings(uidCollection, 'settings');
                    if (stocksData?.Stocks) {
                        updateSettings({ Stocks: stocksData.Stocks });
                    }
                }
            }
        };
        fetchStocks();
    }, [uidCollection]);

    const addItem = async () => {
        let errs = validate(value, ['stock', 'nname'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true);
        if (!isNotFilled) {
            let newArr = [...settings.Stocks.Stocks, { ...value, id: uuidv4() }];
            const newObj = { ...settings.Stocks, Stocks: newArr }
            updateSettings(uidCollection, newObj, 'Stocks', true)
            clickClear()
        }
    };

    const updateList = () => {
        let errs = validate(value, ['stock', 'nname'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true);
        if (!isNotFilled) {
            let newArr = settings.Stocks.Stocks.map((x, i) => x.id === value.id ? value : x)
            const newObj = { ...settings.Stocks, Stocks: newArr }
            updateSettings(uidCollection, newObj, 'Stocks', true)
        }
    }

    const clickClear = () => {
        setValue({
            stock: '', country: '', address: '', phone: '', other: '', deleted: false, sType: '', nname: ''
        })
        setDissablesButton(false)
        setErrors({})
    }

    const SelectStock = (sup) => {
        setErrors({})
        setValue(sup);
        setDissablesButton(true)
    }

    const deleteItem = () => {
        let newArr = settings.Stocks.Stocks.map((x, i) => x.id === value.id ?
            { ...x, deleted: true } : x)
        const newObj = { ...settings.Stocks, Stocks: newArr }
        updateSettings(uidCollection, newObj, 'Stocks', true)
        clickClear()
        setErrors({})
    }

    const fieldRow = 'flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0';
    const labelCls = 'sm:w-[100px] shrink-0 text-sm text-[#0c5aa6]';
    const inputCls = 'w-full sm:flex-1 h-8 px-5 text-xs rounded-full border border-[#E5E7EB] bg-white';

    return (
        <div className='p-4 rounded-2xl flex flex-col md:flex-row w-full gap-4'>
            <div className="md:px-5 w-full md:w-[27%] flex-shrink-0 rounded-2xl p-2 bg-[#e3f3ff]">
                <p className='flex items-center text-sm font-medium pl-2 text-[var(--endeavour)] whitespace-nowrap'>{getTtl('Stocks', ln)}:</p>
                <ul className="flex flex-col mt-1 bg-[#e3f3ff] py-2 max-h-80 overflow-auto custom-scroll">
                    {sortArr((settings?.Stocks?.Stocks ?? []).filter(x => !x.deleted), 'stock').map((x, i) => (
                        <li key={i} onClick={() => SelectStock(x)}
                            className={`cursor-pointer flex items-center gap-x-2 py-2 px-4 text-xs text-[var(--endeavour)] rounded-full hover:bg-[#dbeeff] ${value.id === x.id && 'font-medium bg-white'}`}>
                            {x.stock}
                        </li>
                    ))}
                </ul>
            </div>

            <div className='flex flex-col w-full bg-[#f7f7f7] p-4 rounded-2xl'>
                <div className='pb-2 rounded-2xl mt-1 w-full gap-4 flex flex-wrap h-fit'>
                    <Tltip direction='top' tltpText='Add new stock'>
                        <button className={`supplierAddButton py-1 ${disabledButton ? 'cursor-not-allowed' : ''}`} disabled={disabledButton} onClick={addItem}>
                            <IoAddCircleOutline className='scale-110' />   {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Update stock data'>
                        <button className='supplierButton py-1' onClick={updateList}>
                            <BiEditAlt className='scale-125' />
                            {getTtl('Update', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete stock'>
                        <button className='supplierButton py-1' onClick={() => setIsDeleteOpen(true)} disabled={!value.id}>
                            <MdDeleteOutline className='scale-125' /> {getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Clear form'>
                        <button className='supplierButton py-1' onClick={clickClear}>
                            <AiOutlineClear className='scale-125' />{getTtl('Clear', ln)}
                        </button>
                    </Tltip>
                </div>

                <div className='border border-[#E5E7EB] p-4 rounded-2xl mt-1 shadow-md w-full bg-white'>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 w-full">
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>{getTtl('Name', ln)}:</label>
                                    <input type="text" className={inputCls} value={value.stock} onChange={(e) => setValue({ ...value, stock: e.target.value })} />
                                </div>
                                <ErrDiv field='stock' errors={errors} ln={ln} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('country', ln)}:</label>
                                <input type="text" className={inputCls} value={value.country} onChange={(e) => setValue({ ...value, country: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('Address', ln)}:</label>
                                <input type="text" className={inputCls} value={value.address} onChange={(e) => setValue({ ...value, address: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('Stock type', ln)}:</label>
                                <div className="w-full sm:flex-1">
                                    <CBox value={value} setValue={setValue} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>{getTtl('Nick Name', ln)}:</label>
                                    <input type="text" className={inputCls} value={value.nname ?? ''} onChange={(e) => setValue({ ...value, nname: e.target.value })} />
                                </div>
                                <ErrDiv field='nname' errors={errors} ln={ln} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('cmpPhone', ln)}:</label>
                                <input type="text" className={inputCls} value={value.phone} onChange={(e) => setValue({ ...value, phone: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('Other', ln)}:</label>
                                <input type="text" className={inputCls} value={value.other} onChange={(e) => setValue({ ...value, other: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
                ttl={getTtl('delConfirmation', ln)} txt={getTtl('delConfirmationTxtStock', ln)}
                doAction={deleteItem} />
        </div>
    )
};

export default Stocks;
