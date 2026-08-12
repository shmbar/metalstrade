import { useState, useContext, useEffect } from 'react';
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { v4 as uuidv4 } from 'uuid';
import { sortArr, validate, ErrDiv } from '../../../../utils/utils'
import ModalToDelete from '../../../../components/modalToProceed';
import { UserAuth } from "../../../../contexts/useAuthContext";
import { getTtl } from '../../../../utils/languages';
import Tltip from '../../../../components/tlTip';
import { CirclePlus, PenLine, Trash, Paintbrush   } from 'lucide-react';
import Avatar from '../../../../components/Avatar';


const Clients = () => {

    const { settings, updateSettings, compData } = useContext(SettingsContext);
    const [value, setValue] = useState({
        client: '', street: '', city: '', country: '', other1: '', nname: '', poc: '',
        email: '', phone: '', mobile: '', fax: '', other2: '', deleted: false
    })
    const [disabledButton, setDissablesButton] = useState(false)
    const [errors, setErrors] = useState({})
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const { uidCollection } = UserAuth();
    const ln = compData.lng


    const addItem = async () => {
        let errs = validate(value, ['client', 'nname', 'street', 'city', 'country'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true);
        if (!isNotFilled) {
            let newArr = [...settings.Client.Client, { ...value, id: uuidv4() }];
            const newObj = { ...settings.Client, Client: newArr }
            updateSettings(uidCollection, newObj, 'Client', true)
            clickClear()
        }
    };

    const updateList = () => {
        let errs = validate(value, ['client', 'nname', 'street', 'city', 'country'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true);
        if (!isNotFilled) {
            let newArr = settings.Client.Client.map((x, i) => x.id === value.id ? value : x)
            const newObj = { ...settings.Client, Client: newArr }
            updateSettings(uidCollection, newObj, 'Client', true)
        }
    }

    const clickClear = () => {
        setValue({
            client: '', street: '', city: '', country: '', other1: '', nname: '', poc: '',
            email: '', phone: '', mobile: '', fax: '', other2: '', deleted: false
        })
        setDissablesButton(false)
        setErrors({})
    }

    const SelectClient = (sup) => {
        setErrors({})
        setValue(sup);
        setDissablesButton(true)
    }

    const deleteItem = () => {
        let newArr = settings.Client.Client.map((x, i) => x.id == value.id ?
            { ...x, deleted: true } : x)
        const newObj = { ...settings.Client, Client: newArr }
        updateSettings(uidCollection, newObj, 'Client', true)
        clickClear()
        setErrors({})
    }

    const fieldRow = 'flex flex-col';
    const labelCls = 'responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)] mb-1';
    const inputCls = 'w-full h-8 px-3 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] responsiveTextTitle outline-none transition-colors focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)]';

    return (
        <div className='p-2 rounded-2xl flex flex-col md:flex-row w-full gap-4'>
            <div className="md:px-5 w-full md:w-[27%] flex-shrink-0 rounded-2xl p-2 bg-[var(--bg-subtle)]">
                <p className='flex items-center responsiveText font-medium pl-2 text-[var(--ink)] responsiveTextInput mt-2'>{getTtl('Clients', ln)}:</p>
                <ul className="flex flex-col mt-2 max-h-80 overflow-auto p-2 custom-scroll">
                    {sortArr((settings.Client?.Client || []).filter(q => !q.deleted), 'client').map((x, i) => (
                        <li key={i} onClick={() => SelectClient(x)}
                            className={`cursor-pointer flex items-center gap-x-2 py-1.5 px-3 responsiveText text-[var(--ink)] responsiveTextInput rounded-2xl hover:bg-[var(--bg-sunken)] ${value.id === x.id && 'font-medium bg-[var(--brand-soft)] text-[var(--brand)]'}`}>
                            <Avatar name={x.nname || x.client} size={20} />
                            <span className="truncate">{x.client}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className='flex flex-col w-full bg-[var(--bg-subtle)] p-4 rounded-2xl'>
                <div className='pb-2 rounded-2xl mt-1 w-full gap-4 flex flex-wrap'>
                    <Tltip direction='top' tltpText='Add new client'>
                        <button className={`supplierAddButton ${disabledButton ? 'cursor-not-allowed' : ''}`} disabled={disabledButton} onClick={addItem}>
                            <CirclePlus size={12} />  {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Update client data'>
                        <button className='supplierButton' onClick={updateList}>
                            <PenLine size={12} />
                            {getTtl('Update', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete client'>
                        <button className='supplierButton' onClick={() => setIsDeleteOpen(true)} disabled={!value.id}>
                            <Trash size={12} />{getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Clear form'>
                        <button className='supplierButton' onClick={clickClear}>
                            <Paintbrush size={12} />{getTtl('Clear', ln)}
                        </button>
                    </Tltip>
                </div>

                <div className='border border-[var(--line)] p-4 rounded-2xl mt-1 shadow-md w-full bg-[var(--bg-card)]'>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 w-full">
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>{getTtl('Name', ln)}:</label>
                                    <input type="text" className={inputCls} value={value.client} onChange={(e) => setValue({ ...value, client: e.target.value })} />
                                </div>
                                <ErrDiv field='client' errors={errors} ln={ln} />
                            </div>
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>{getTtl('street', ln)}:</label>
                                    <input type="text" className={inputCls} value={value.street} onChange={(e) => setValue({ ...value, street: e.target.value })} />
                                </div>
                                <ErrDiv field='street' errors={errors} ln={ln} />
                            </div>
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>{getTtl('country', ln)}:</label>
                                    <input type="text" className={inputCls} value={value.country} onChange={(e) => setValue({ ...value, country: e.target.value })} />
                                </div>
                                <ErrDiv field='country' errors={errors} ln={ln} />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>{getTtl('Nick Name', ln)}:</label>
                                    <input type="text" className={inputCls} value={value.nname} onChange={(e) => setValue({ ...value, nname: e.target.value })} />
                                </div>
                                <ErrDiv field='nname' errors={errors} ln={ln} />
                            </div>
                            <div className="flex flex-col">
                                <div className={fieldRow}>
                                    <label className={labelCls}>{getTtl('city', ln)}:</label>
                                    <input type="text" className={inputCls} value={value.city} onChange={(e) => setValue({ ...value, city: e.target.value })} />
                                </div>
                                <ErrDiv field='city' errors={errors} ln={ln} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('Other', ln)}:</label>
                                <input type="text" className={inputCls} value={value.other1} onChange={(e) => setValue({ ...value, other1: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className='border border-[var(--line)] p-4 rounded-2xl mt-3 shadow-md w-full bg-[var(--bg-card)]'>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 w-full">
                        <div className="space-y-4">
                            <div className={fieldRow}>
                                <label className={labelCls}>POC:</label>
                                <input type="text" className={inputCls} value={value.poc} onChange={(e) => setValue({ ...value, poc: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('cmpPhone', ln)}:</label>
                                <input type="text" className={inputCls} value={value.phone} onChange={(e) => setValue({ ...value, phone: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('Fax', ln)}:</label>
                                <input type="text" className={inputCls} value={value.fax} onChange={(e) => setValue({ ...value, fax: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('email', ln)}:</label>
                                <input type="text" className={inputCls} value={value.email} onChange={(e) => setValue({ ...value, email: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('cmpMobile', ln)}:</label>
                                <input type="text" className={inputCls} value={value.mobile} onChange={(e) => setValue({ ...value, mobile: e.target.value })} />
                            </div>
                            <div className={fieldRow}>
                                <label className={labelCls}>{getTtl('Other', ln)}:</label>
                                <input type="text" className={inputCls} value={value.other2} onChange={(e) => setValue({ ...value, other2: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
                ttl={getTtl('delConfirmation', ln)} txt={getTtl('delConfirmationTxtClient', ln)}
                doAction={deleteItem} />
        </div>
    )
};

export default Clients;
