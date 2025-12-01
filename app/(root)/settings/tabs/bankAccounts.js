import { useState, useContext, useEffect } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { v4 as uuidv4 } from 'uuid';
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdDeleteOutline } from 'react-icons/md';
import { BiEditAlt } from 'react-icons/bi';
import { AiOutlineClear } from 'react-icons/ai';
import { validate, ErrDiv } from '@utils/utils'
import ModalToDelete from '@components/modalToProceed';
import CBox from '@components/combobox.js'
import { UserAuth } from "@contexts/useAuthContext";
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';

const BankAccount = () => {

    const { settings, updateSettings, compData } = useContext(SettingsContext);
    const [value, setValue] = useState({
        bankNname: '',
        bankName: '', cur: '', swiftCode: '', iban: '', corrBank: '',
        corrBankSwift: '', other: '', deleted: false
    })
    const [disabledButton, setDissablesButton] = useState(false)
    const [errors, setErrors] = useState({})
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const { uidCollection } = UserAuth();
    const ln = compData.lng


    const addItem = async () => {

        //validation
        let errs = validate(value, ['bankName', 'bankNname', 'cur', 'swiftCode', 'iban', 'corrBank', 'corrBankSwift'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true); //all filled

        if (!isNotFilled) {
            let newArr = [
                ...settings['Bank Account']['Bank Account'], { ...value, id: uuidv4() }];
            const newObj = { ...settings['Bank Account'], 'Bank Account': newArr }
            updateSettings(uidCollection, newObj, 'Bank Account', true)
            clickClear()
        }

    };

    const updateList = () => {
        let errs = validate(value, ['bankName', 'bankNname', 'cur', 'swiftCode', 'iban', 'corrBank', 'corrBankSwift'])

        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true); //all filled

        if (!isNotFilled) {
            let newArr = settings['Bank Account']['Bank Account'].map((x, i) => x.id === value.id ? value : x)
            const newObj = { ...settings['Bank Account'], 'Bank Account': newArr }
            updateSettings(uidCollection, newObj, 'Bank Account', true)
        }
    }

    const clickClear = () => {
        setValue({
            bankName: '', bankNname: '', cur: '', swiftCode: '', iban: '', corrBank: '', corrBankSwift: '', other: '',
            deleted: false
        })
        setDissablesButton(false)
        setErrors({})
    }

    const SelectBank = (sup) => {
        setErrors({})
        setValue(sup);
        setDissablesButton(true)
    }

    const deleteItem = () => {
        let newArr = settings['Bank Account']['Bank Account'].map((x, i) => x.id === value.id ?
            { ...x, deleted: true } : x)
        const newObj = { ...settings['Bank Account'], 'Bank Account': newArr }
        updateSettings(uidCollection, newObj, 'Bank Account', true)
        clickClear()
        setErrors({})
    }


    return (
        <div className='border border-slate-300 p-4 rounded-lg flex flex-col md:flex-row w-full gap-4 '>
            <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md  min-w-xl'>
                <p className='flex items-center text-sm font-medium pl-2 text-slate-700 whitespace-nowrap'>{getTtl('Bank Account', ln)}:</p>


                <ul className="flex flex-col mt-1 overflow-auto max-h-80 ring-1 ring-black/5 rounded-lg divide-y" >
                    {settings['Bank Account']['Bank Account'].filter(x => !x.deleted).map((x, i) => {
                        return (
                            <li key={i} onClick={() => SelectBank(x)}
                                className={`whitespace-nowrap cursor-pointer flex items-center gap-x-2 py-2 px-4 text-xs text-slate-800
                                ${value.id === x.id && 'font-medium bg-slate-50'}`}>
                                {x.bankNname}

                            </li>
                        )
                    })}
                </ul>

            </div>
            <div className='flex flex-col'>
                <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md  w-full gap-4 flex flex-wrap h-fit'>
                    <Tltip direction='top' tltpText='Add new bank'>
                        <button className={`blackButton py-1 ${disabledButton ? 'cursor-not-allowed' : ''}`} disabled={disabledButton}
                            onClick={addItem}>
                            <IoAddCircleOutline className='scale-110' />   {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Update bank data'>
                        <button className='whiteButton py-1'
                            onClick={updateList}>
                            <BiEditAlt className='scale-125' />
                            {getTtl('Update', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete bank'>
                        <button className='whiteButton py-1' onClick={() => setIsDeleteOpen(true)}
                            disabled={!value.id}>
                            <MdDeleteOutline className='scale-125' />{getTtl('Delete', ln)}
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
                            <p className='text-xs'>{getTtl('Bank', ln)}:</p>
                            <input type='text' className='input h-7 text-xs w-full' value={value.bankName}
                                onChange={(e) => { setValue({ ...value, 'bankName': e.target.value }) }}
                                maxLength="47" />
                            <ErrDiv field='bankName' errors={errors} ln={ln} />

                        </div>
                        <div className='col-span-12 md:col-span-1 w-full'>
                            <p className='text-xs'>{getTtl('BankNickName', ln)}:</p>
                            <input type='text' className='input h-7 text-xs w-full' value={value.bankNname}
                                onChange={(e) => { setValue({ ...value, 'bankNname': e.target.value }) }} />
                            <ErrDiv field='bankNname' errors={errors} ln={ln} />

                        </div>
                        <div className='col-span-12 md:col-span-1'>
                            <p className='text-xs relative -bottom-1'>{getTtl('Currency', ln)}:</p>
                            <div style={{ height: '35px' }}>
                                <CBox data={settings.Currency.Currency} setValue={setValue} value={value} name='cur' />
                            </div>
                            <div className='relative -top-1'>
                                <ErrDiv field='cur' errors={errors} ln={ln} />
                            </div>
                        </div>
                    </div>

                    <div className='grid grid-cols-3 flex items-center gap-4 w-full'>
                        <div className='col-span-12 md:col-span-1'>
                            <p className='text-xs'>{getTtl('Note', ln)} #1:</p>
                            <input type='text' className='input h-7 text-xs ' value={value.swiftCode}
                                onChange={(e) => { setValue({ ...value, 'swiftCode': e.target.value }) }}
                                maxLength="45" />
                            <ErrDiv field='swiftCode' errors={errors} ln={ln} />
                        </div>
                        <div className='col-span-12 md:col-span-1'>
                            <p className='text-xs'>{getTtl('Note', ln)} #2:</p>
                            <input type='text' className='input h-7 text-xs' value={value.iban}
                                onChange={(e) => { setValue({ ...value, 'iban': e.target.value }) }}
                                maxLength="47" />
                            <ErrDiv field='iban' errors={errors} ln={ln} />

                        </div>
                        <div className='col-span-12 md:col-span-1'>
                            <p className='text-xs'>{getTtl('Note', ln)} #3:</p>
                            <input type='text' className='input h-7 text-xs w-full' value={value.corrBank}
                                onChange={(e) => { setValue({ ...value, 'corrBank': e.target.value }) }}
                                maxLength="47" />
                            <ErrDiv field='corrBank' errors={errors} ln={ln} />

                        </div>
                    </div>

                    <div className='grid grid-cols-3 flex items-center gap-4 w-full'>
                        <div className='col-span-12 md:col-span-2 w-full'>
                            <p className='text-xs'>{getTtl('Note', ln)} #4:</p>
                            <input type='text' className='input h-7 text-xs' value={value.corrBankSwift}
                                onChange={(e) => { setValue({ ...value, 'corrBankSwift': e.target.value }) }}
                                maxLength="47" />
                            <ErrDiv field='corrBankSwift' errors={errors} ln={ln} />
                        </div>
                        <div className='col-span-12 md:col-span-1'>
                            <p className='text-xs'>{getTtl('Other', ln)}:</p>
                            <input type='text' className='input h-7 text-xs' value={value.other}
                                onChange={(e) => { setValue({ ...value, 'other': e.target.value }) }} />
                        </div>
                    </div>


                </div>
            </div>
            <ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
                ttl={getTtl('delConfirmation', ln)} txt={getTtl('delConfirmationTxtBank', ln)}
                doAction={deleteItem} />
        </div>
    )
};

export default BankAccount;
