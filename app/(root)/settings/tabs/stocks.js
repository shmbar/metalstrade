import { useState, useContext, useEffect } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { v4 as uuidv4 } from 'uuid';
import { validate, ErrDiv, sortArr } from '@utils/utils'
import ModalToDelete from '@components/modalToProceed';

import { UserAuth } from "@contexts/useAuthContext";
import { getTtl } from '@utils/languages';

import { Selector } from '@components/selectors/selectShad.js';
import Buttons from './buttons';


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


    const handleChange = (e, name) => {
        setValue(prev => {
            return { ...prev, [name]: e }
        })
    }

    const types = [{ id: 'Warehouse', sType: "Warehouse" }, { id: "Virtual", sType: "Virtual" }]

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
                <Buttons disabledButton={disabledButton}
                    addItem={addItem} updateList={updateList} setIsDeleteOpen={setIsDeleteOpen}
                    clickClear={clickClear} ln={ln} value={value} />
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
                            <Selector arr={types} value={value}
                                onChange={(e) => handleChange(e, 'sType')}
                                name='sType'
                                classes='h-7 mb-0.5'
                            />
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
