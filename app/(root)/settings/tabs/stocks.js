import { useState, useContext, useEffect } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { v4 as uuidv4 } from 'uuid';
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdDeleteOutline } from 'react-icons/md';
import { BiEditAlt } from 'react-icons/bi';
import { AiOutlineClear } from 'react-icons/ai';
import { validate, ErrDiv, sortArr } from '@utils/utils'
import ModalToDelete from '@components/modalToProceed';

import { UserAuth } from "@contexts/useAuthContext";
import { getTtl } from '@utils/languages';
import CBox from '../_components/stocksComb'
import Tltip from '@components/tlTip';


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




    const addItem = async () => {

        //validation
        let errs = validate(value, ['stock', 'nname'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true); //all filled

        if (!isNotFilled) {
            let newArr = [
                ...settings.Stocks.Stocks, { ...value, id: uuidv4() }];
            const newObj = { ...settings.Stocks, Stocks: newArr }
            updateSettings(uidCollection, newObj, 'Stocks', true)
            clickClear()
        }

    };

    const updateList = () => {
        let errs = validate(value, ['stock', 'nname'])

        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true); //all filled

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

    return (
        <div className='border border-slate-300 p-4 rounded-lg flex flex-col md:flex-row w-full gap-4 '>
            <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md  min-w-xl'>
                <p className='flex items-center text-sm font-medium pl-2 text-slate-700 whitespace-nowrap'>{getTtl('Stocks', ln)}:</p>


                <ul className="flex flex-col mt-1 overflow-auto max-h-80 ring-1 ring-black/5 rounded-lg divide-y" >
                    {sortArr(settings.Stocks.Stocks.filter(x => !x.deleted), 'stock').map((x, i) => {
                        return (
                            <li key={i} onClick={() => SelectStock(x)}
                                className={`whitespace-nowrap cursor-pointer flex items-center gap-x-2 py-2 px-4 text-xs text-slate-800
                                ${value.id === x.id && 'font-medium bg-slate-50'}`}>
                                {x.stock}

                            </li>
                        )
                    })}
                </ul>

            </div>
            <div className='flex flex-col'>
                <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md  w-full gap-4 flex flex-wrap h-fit'>
                    <Tltip direction='top' tltpText='Add new stock'>
                        <button className={`blackButton py-1 ${disabledButton ? 'cursor-not-allowed' : ''}`} disabled={disabledButton}
                            onClick={addItem}>
                            <IoAddCircleOutline className='scale-110' />   {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Update stock data'>
                        <button className='whiteButton py-1'
                            onClick={updateList}>
                            <BiEditAlt className='scale-125' />
                            {getTtl('Update', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete stock'>
                        <button className='whiteButton py-1' onClick={() => setIsDeleteOpen(true)}
                            disabled={!value.id}>
                            <MdDeleteOutline className='scale-125' /> {getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Clear form'>
                        <button className='whiteButton py-1'
                            onClick={clickClear}>
                            <AiOutlineClear className='scale-125' />{getTtl('Clear', ln)}
                        </button>
                    </Tltip>
                </div>
                <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md  w-full gap-4 flex flex-wrap h-fit'>
                    <div className='grid grid-cols-4 flex items-center gap-4 w-full'>
                        <div className='col-span-12 md:col-span-2 w-full'>
                            <p className='text-xs'>{getTtl('Name', ln)}:</p>
                            <input type='text' className='input h-7 text-xs w-full' value={value.stock}
                                onChange={(e) => { setValue({ ...value, 'stock': e.target.value }) }} />
                            <ErrDiv field='stock' errors={errors} ln={ln} />

                        </div>
                        <div className='col-span-12 md:col-span-2 w-full'>
                            <p className='text-xs'>{getTtl('Nick Name', ln)}:</p>
                            <input type='text' className='input h-7 text-xs w-full' value={value.nname ?? ''}
                                onChange={(e) => { setValue({ ...value, 'nname': e.target.value }) }} />
                            <ErrDiv field='nname' errors={errors} ln={ln} />

                        </div>

                    </div>

                    <div className='grid grid-cols-3 flex items-center gap-4 w-full'>
                        <div className='col-span-12 md:col-span-1'>
                            <p className='text-xs'>{getTtl('country', ln)}:</p>
                            <input type='text' className='input h-7 text-xs ' value={value.country}
                                onChange={(e) => { setValue({ ...value, 'country': e.target.value }) }} />
                        </div>
                        <div className='col-span-12 md:col-span-1'>
                            <p className='text-xs'>{getTtl('Address', ln)}:</p>
                            <input type='text' className='input h-7 text-xs' value={value.address}
                                onChange={(e) => { setValue({ ...value, 'address': e.target.value }) }} />
                        </div>
                        <div className='col-span-12 md:col-span-1'>
                            <p className='text-xs'>{getTtl('cmpPhone', ln)}:</p>
                            <input type='text' className='input h-7 text-xs w-full' value={value.phone}
                                onChange={(e) => { setValue({ ...value, 'phone': e.target.value }) }} />
                        </div>
                    </div>

                    <div className='grid grid-cols-3 flex items-center gap-4 w-full'>
                        <div className='col-span-12 md:col-span-1'>
                            <p className='text-xs'>{getTtl('Other', ln)}:</p>
                            <input type='text' className='input h-7 text-xs' value={value.other}
                                onChange={(e) => { setValue({ ...value, 'other': e.target.value }) }} />
                        </div>

                        <div className='col-span-12 md:col-span-1'>
                            <p className='text-xs'>{getTtl('Stock type', ln)}:</p>
                            <CBox value={value} setValue={setValue} />
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
