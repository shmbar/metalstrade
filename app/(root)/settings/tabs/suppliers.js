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
import Tltip from '@components/tlTip';

const Suppliers = () => {

    const { settings, updateSettings, compData } = useContext(SettingsContext);
    const [value, setValue] = useState({
        supplier: '', street: '', city: '', country: '', other1: '', nname: '', poc: '',
        email: '', phone: '', mobile: '', fax: '', other2: '', deleted: false
    })
    const [disabledButton, setDissablesButton] = useState(false)
    const [errors, setErrors] = useState({})
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const { uidCollection } = UserAuth();
    const ln = compData.lng


    const addItem = async () => {

        //validation
        let errs = validate(value, ['supplier', 'street', 'city', 'country', 'nname'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true); //all filled

        if (!isNotFilled) {
            let newArr = [
                ...settings.Supplier.Supplier, { ...value, id: uuidv4() }];
            const newObj = { ...settings.Supplier, Supplier: newArr }
            updateSettings(uidCollection, newObj, 'Supplier', true)
            clickClear()
        }

    };

    const updateList = () => {
        let errs = validate(value, ['supplier', 'street', 'city', 'country', 'nname'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true); //all filled

        if (!isNotFilled) {
            let newArr = settings.Supplier.Supplier.map((x, i) => x.id === value.id ? value : x)
            const newObj = { ...settings.Supplier, Supplier: newArr }
            updateSettings(uidCollection, newObj, 'Supplier', true)
        }
    }

    const clickClear = () => {
        setValue({
            supplier: '', street: '', city: '', country: '', other1: '', nname: '', poc: '',
            email: '', phone: '', mobile: '', fax: '', other2: '', deleted: false
        })
        setDissablesButton(false)
        setErrors({})
    }

    const SelectSupplier = (sup) => {
        setErrors({})
        setValue(sup);
        setDissablesButton(true)
    }


    const deleteItem = () => {
        let newArr = settings.Supplier.Supplier.map((x, i) => x.id === value.id ?
            { ...x, deleted: true } : x)
        const newObj = { ...settings.Supplier, Supplier: newArr }
        updateSettings(uidCollection, newObj, 'Supplier', true)
        clickClear()
        setErrors({})
    }

    return (
        <div className='border border-slate-300 p-4 rounded-lg flex flex-col md:flex-row w-full gap-4 '>

            <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md  min-w-xl'>
                <p className='flex items-center text-sm font-medium pl-2 text-slate-700'>{getTtl('Suppliers', ln)}:</p>
                <ul className="flex flex-col mt-1 overflow-auto max-h-80 ring-1 ring-black/5 rounded-lg divide-y" >
                    {sortArr(settings.Supplier.Supplier.filter(q => !q.deleted), 'supplier').map((x, i) => {
                        return (
                            <li key={i} onClick={() => SelectSupplier(x)}
                                className={`whitespace-nowrap cursor-pointer flex items-center gap-x-2 py-2 px-4 text-xs text-slate-800
                                ${value.id === x.id && 'font-medium bg-slate-50'}`}>
                                {x.supplier}

                            </li>
                        )
                    })}
                </ul>
            </div>

            <div className='flex flex-col md:w-7/12'>
                <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md  w-full gap-4 flex flex-wrap'>
                    <Tltip direction='top' tltpText='Add new supplier'>
                        <button className={`blackButton py-1 ${disabledButton ? 'cursor-not-allowed' : ''}`} disabled={disabledButton}
                            onClick={addItem}>
                            <IoAddCircleOutline className='scale-110' />  {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Update supplier data'>
                        <button className='whiteButton py-1'
                            onClick={updateList}>
                            <BiEditAlt className='scale-125' />
                            {getTtl('Update', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete supplier'>
                        <button className='whiteButton py-1' onClick={() => setIsDeleteOpen(true)}
                            disabled={!value.id}>
                            <MdDeleteOutline className='scale-125' />  {getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Clear form'>
                        <button className='whiteButton py-1'
                            onClick={clickClear}>
                            <AiOutlineClear className='scale-125' />{getTtl('Clear', ln)}
                        </button>
                    </Tltip>
                </div>
                <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md  w-full gap-4 flex flex-wrap'>
                    <div className='grid md:max-lg:grid-cols-1  sm:grid-cols-2 grid-rows-3 gap-2 w-full'>
                        <div className='cols-span-12 lg:cols-span-1'>
                            <p className='text-xs'>{getTtl('Name', ln)}:</p>
                            <input type='text' className='input h-7 text-xs' value={value.supplier}
                                onChange={(e) => { setValue({ ...value, 'supplier': e.target.value }) }} />
                            <ErrDiv field='supplier' errors={errors} ln={ln} />
                        </div>
                        <div className='cols-span-12 lg:cols-span-1'>
                            <p className='text-xs'>{getTtl('Nick Name', ln)}:</p>
                            <input type='text' className='input h-7 text-xs ' value={value.nname}
                                onChange={(e) => { setValue({ ...value, 'nname': e.target.value }) }} />
                            <ErrDiv field='nname' errors={errors} ln={ln} />
                        </div>
                        <div className='cols-span-12 md:cols-span-1'>
                            <p className='text-xs'>{getTtl('street', ln)}:</p>
                            <input type='text' className='input h-7 text-xs ' value={value.street}
                                onChange={(e) => { setValue({ ...value, 'street': e.target.value }) }} />
                            <ErrDiv field='street' errors={errors} ln={ln} />
                        </div>
                        <div className='cols-span-12 md:cols-span-1'>
                            <p className='text-xs '>{getTtl('city', ln)}:</p>
                            <input type='text' className='input h-7 text-xs ' value={value.city}
                                onChange={(e) => { setValue({ ...value, 'city': e.target.value }) }} />
                            <ErrDiv field='city' errors={errors} ln={ln} />
                        </div>
                        <div className='cols-span-12 md:cols-span-1'>
                            <p className='text-xs '>{getTtl('country', ln)}:</p>
                            <input type='text' className='input h-7 text-xs' value={value.country}
                                onChange={(e) => { setValue({ ...value, 'country': e.target.value }) }} />
                            <ErrDiv field='country' errors={errors} ln={ln} />
                        </div>
                        <div className='cols-span-12 md:cols-span-1'>
                            <p className='text-xs'>{getTtl('Other', ln)}:</p>
                            <input type='text' className='input h-7 text-xs' value={value.other1}
                                onChange={(e) => { setValue({ ...value, 'other1': e.target.value }) }} />
                        </div>
                    </div>

                </div>



                <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md  w-full gap-4 flex flex-wrap h-fit'>
                    <div className='grid md:max-lg:grid-cols-1  sm:grid-cols-2 grid-rows-3 gap-2 w-full'>
                        <div className='cols-span-12 lg:cols-span-1'>
                            <p className='text-xs'>POC:</p>
                            <input type='text' className='input h-7 text-xs' value={value.poc}
                                onChange={(e) => { setValue({ ...value, 'poc': e.target.value }) }} />
                        </div>
                        <div className='cols-span-12 lg:cols-span-1'>
                            <p className='text-xs'>{getTtl('email', ln)}:</p>
                            <input type='text' className='input h-7 text-xs' value={value.email}
                                onChange={(e) => { setValue({ ...value, 'email': e.target.value }) }} />
                        </div>
                        <div className='cols-span-12 lg:cols-span-1'>
                            <p className='text-xs'>{getTtl('cmpPhone', ln)}:</p>
                            <input type='text' className='input h-7 text-xs' value={value.phone}
                                onChange={(e) => { setValue({ ...value, 'phone': e.target.value }) }} />
                        </div>
                        <div className='cols-span-12 lg:cols-span-1'>
                            <p className='text-xs'>{getTtl('cmpMobile', ln)}:</p>
                            <input type='text' className='input h-7 text-xs' value={value.mobile}
                                onChange={(e) => { setValue({ ...value, 'mobile': e.target.value }) }} />
                        </div>
                        <div className='cols-span-12 lg:cols-span-1'>
                            <p className='text-xs'>{getTtl('Fax', ln)}:</p>
                            <input type='text' className='input h-7 text-xs ' value={value.fax}
                                onChange={(e) => { setValue({ ...value, 'fax': e.target.value }) }} />
                        </div>
                        <div className='cols-span-12 lg:cols-span-1'>
                            <p className='text-xs'>{getTtl('Other', ln)}:</p>
                            <input type='text' className='input h-7 text-xs' value={value.other2}
                                onChange={(e) => { setValue({ ...value, 'other2': e.target.value }) }} />
                        </div>
                    </div>
                </div>

            </div>
            <ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
                ttl={getTtl('delConfirmation', ln)} txt={getTtl('delConfirmationTxtSup', ln)}
                doAction={deleteItem} />


        </div>
    )
};

export default Suppliers;
