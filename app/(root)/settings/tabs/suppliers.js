import { useState, useContext, useEffect } from 'react';
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { v4 as uuidv4 } from 'uuid';
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdDeleteOutline } from 'react-icons/md';
import { validate, ErrDiv, sortArr } from '../../../../utils/utils'
import ModalToDelete from '../../../../components/modalToProceed';
import { UserAuth } from "../../../../contexts/useAuthContext";
import { getTtl } from '../../../../utils/languages';
import Tltip from '../../../../components/tlTip';
import { FiUpload } from 'react-icons/fi';
import { RiEraserLine } from 'react-icons/ri';

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
        let errs = validate(value, ['supplier', 'street', 'city', 'country', 'nname'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true);
        if (!isNotFilled) {
            let newArr = [...settings.Supplier.Supplier, { ...value, id: uuidv4() }];
            const newObj = { ...settings.Supplier, Supplier: newArr }
            updateSettings(uidCollection, newObj, 'Supplier', true)
            clickClear()
        }
    };

    const updateList = () => {
        let errs = validate(value, ['supplier', 'street', 'city', 'country', 'nname'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true);
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

    const fieldRow = 'flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0';
    const labelCls = 'sm:w-[80px] shrink-0 responsiveText text-[var(--endeavour)]';
    const inputCls = 'w-full sm:flex-1 h-[26px] px-5 responsiveText rounded-full border border-[#E5E7EB] bg-white';

    return (
        <div className='p-2 rounded-2xl flex flex-col md:flex-row w-full gap-4'>
            <div className='p-4 rounded-2xl mt-1 shadow-md w-full md:w-[28%] bg-[#e3f3ff]'>
                <p className='flex items-center responsiveText font-medium pl-2 text-[var(--endeavour)]'>{getTtl('Suppliers', ln)}:</p>
                <ul className="flex flex-col mt-2 max-h-80 overflow-auto p-2 custom-scroll">
                    {sortArr((settings.Supplier?.Supplier || []).filter(q => !q.deleted), 'supplier').map((x, i) => (
                        <li key={i} onClick={() => SelectSupplier(x)}
                            className={`cursor-pointer flex items-center gap-x-2 py-2 px-4 responsiveText text-[var(--endeavour)] rounded-full hover:bg-[#dbeeff] ${value.id === x.id && 'font-medium bg-white'}`}>
                            {x.supplier}
                        </li>
                    ))}
                </ul>
            </div>

            <div className='flex flex-col w-full bg-[#f7f7f7] p-4 rounded-2xl'>
                <div className='pb-4 mt-1 w-full gap-4 flex flex-wrap'>
                    <Tltip direction='top' tltpText='Add new supplier'>
                        <button className={`supplierAddButton ${disabledButton ? 'cursor-not-allowed' : ''}`} disabled={disabledButton} onClick={addItem}>
                            <IoAddCircleOutline className='scale-110' />  {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Update supplier data'>
                        <button className='supplierButton' onClick={updateList}>
                            <FiUpload className='scale-125 text-[var(--endeavour)]' />
                            {getTtl('Update', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete supplier'>
                        <button className='supplierButton' onClick={() => setIsDeleteOpen(true)} disabled={!value.id}>
                            <MdDeleteOutline className='scale-125 text-[var(--endeavour)]' />  {getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Clear form'>
                        <button className='supplierButton' onClick={clickClear}>
                            <RiEraserLine className='scale-125 text-[var(--endeavour)]' />{getTtl('Clear', ln)}
                        </button>
                    </Tltip>
                </div>

                <div className='border border-[#E5E7EB] p-4 rounded-2xl mt-1 shadow-md w-full bg-white'>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 w-full">
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>Name:</label>
                                    <input type="text" className={inputCls} value={value.supplier} onChange={(e) => setValue({ ...value, supplier: e.target.value })} />
                                </div>
                                <ErrDiv field='supplier' errors={errors} ln={ln} />
                            </div>
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>Street:</label>
                                    <input type="text" className={inputCls} value={value.street} onChange={(e) => setValue({ ...value, street: e.target.value })} />
                                </div>
                                <ErrDiv field='street' errors={errors} ln={ln} />
                            </div>
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>Country:</label>
                                    <input type="text" className={inputCls} value={value.country} onChange={(e) => setValue({ ...value, country: e.target.value })} />
                                </div>
                                <ErrDiv field='country' errors={errors} ln={ln} />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>Nick Name:</label>
                                    <input type="text" className={inputCls} value={value.nname} onChange={(e) => setValue({ ...value, nname: e.target.value })} />
                                </div>
                                <ErrDiv field='nname' errors={errors} ln={ln} />
                            </div>
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>City:</label>
                                    <input type="text" className={inputCls} value={value.city} onChange={(e) => setValue({ ...value, city: e.target.value })} />
                                </div>
                                <ErrDiv field='city' errors={errors} ln={ln} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>Other:</label>
                                <input type="text" className={inputCls} value={value.other1} onChange={(e) => setValue({ ...value, other1: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className='border border-[#E5E7EB] p-4 rounded-2xl mt-3 shadow-md w-full bg-white'>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 w-full">
                        <div className="space-y-4">
                            <div className={fieldRow}>
                                <label className={labelCls}>POC:</label>
                                <input type="text" className={inputCls} value={value.poc} onChange={(e) => setValue({ ...value, poc: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>Phone:</label>
                                <input type="text" className={inputCls} value={value.phone} onChange={(e) => setValue({ ...value, phone: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>Fax:</label>
                                <input type="text" className={inputCls} value={value.fax} onChange={(e) => setValue({ ...value, fax: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className={fieldRow}>
                                <label className={labelCls}>Email:</label>
                                <input type="text" className={inputCls} value={value.email} onChange={(e) => setValue({ ...value, email: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>Mobile:</label>
                                <input type="text" className={inputCls} value={value.mobile} onChange={(e) => setValue({ ...value, mobile: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>Other:</label>
                                <input type="text" className={inputCls} value={value.other2} onChange={(e) => setValue({ ...value, other2: e.target.value })} />
                            </div>
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
