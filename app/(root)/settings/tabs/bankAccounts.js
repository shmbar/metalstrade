import { useState, useContext, useEffect } from 'react';
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { v4 as uuidv4 } from 'uuid';
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdDeleteOutline } from 'react-icons/md';
import { BiEditAlt } from 'react-icons/bi';
import { AiOutlineClear } from 'react-icons/ai';
import { validate, ErrDiv } from '../../../../utils/utils'
import ModalToDelete from '../../../../components/modalToProceed';
import CBox from '../../../../components/combobox.js'
import { UserAuth } from "../../../../contexts/useAuthContext";
import { getTtl } from '../../../../utils/languages';
import Tltip from '../../../../components/tlTip';

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
        <div className=' p-4 rounded-2xl flex flex-col md:flex-row w-full gap-4 '>

    <div className="md:px-5 w-[27%] flex-shrink-0 rounded-2xl p-2
                          bg-[#e3f3ff]">
                     <p className='flex items-center text-sm font-medium pl-2 text-[var(--endeavour)] whitespace-nowrap'>{getTtl('Bank Account', ln)}:</p>

                      <ul
                        className="
                          flex flex-col overflow-auto mt-1
                          bg-[#e3f3ff]
                          py-2
                        "
                      >
                         {(settings['Bank Account']?.['Bank Account'] || []).filter(x => !x.deleted).map((x, i) => {
                        return (
                            <li key={i} onClick={() => SelectBank(x)}
                                className={`whitespace-nowrap cursor-pointer flex items-center gap-x-2 py-2 px-4 text-xs text-[var(--endeavour)] rounded-full
                                ${value.id === x.id && 'font-medium bg-white'}`}>
                                {x.bankNname}

                            </li>
                        )
                    })}
                      </ul>
                    </div>
            <div className='flex flex-col  w-[88%] bg-[#f7f7f7]  p-5 rounded-2xl'>
                <div className='pb-2 rounded-2xl mt-1 w-full gap-4 flex flex-wrap h-fit'>
                    <Tltip direction='top' tltpText='Add new bank'>
                        <button className={`supplierAddButton py-1 ${disabledButton ? 'cursor-not-allowed' : ''}`} disabled={disabledButton}
                            onClick={addItem}>
                            <IoAddCircleOutline className='scale-110' />   {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Update bank data'>
                        <button className='supplierButton py-1' disabled={!value.id}
                            onClick={updateList}>
                            <BiEditAlt className='scale-125 text-[var(--endeavour)]' />
                            {getTtl('Update', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete bank'>
                        <button className='supplierButton py-1' onClick={() => setIsDeleteOpen(true)}
                            disabled={!value.id}>
                            <MdDeleteOutline className='scale-125 text-[var(--endeavour)]' />{getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Clear form'>
                        <button className='supplierButton py-1'
                            onClick={clickClear}>
                            <AiOutlineClear className='scale-125 text-[var(--endeavour)]' />{getTtl('Clear', ln)}
                        </button>
                    </Tltip>
                </div>
               <div className='border border-[#E5E7EB] p-6 rounded-2xl mt-1 shadow-md w-full bg-white'>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 w-full">

                    {/* LEFT COLUMN */}
                    <div className="space-y-6">

                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <label className="w-[90px] text-xs text-[#0c5aa6]">{getTtl('Bank', ln)}:</label>
                            <input type="text" className="flex-1 h-8 px-5 text-xs rounded-full border border-[#E5E7EB] bg-white" value={value.bankName} onChange={(e) => setValue({ ...value, bankName: e.target.value })} maxLength="47" />
                        </div>
                        <ErrDiv field='bankName' errors={errors} ln={ln} />
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <label className="w-[90px] text-xs text-[#0c5aa6]">{getTtl('Note', ln)} #1:</label>
                            <input type="text" className="flex-1 h-8 px-5 text-xs rounded-full border border-[#E5E7EB] bg-white" value={value.swiftCode} onChange={(e) => setValue({ ...value, swiftCode: e.target.value })} maxLength="45" />
                        </div>
                        <ErrDiv field='swiftCode' errors={errors} ln={ln} />
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <label className="w-[90px] text-xs text-[#0c5aa6]">{getTtl('Note', ln)} #2:</label>
                            <input type="text" className="flex-1 h-8 px-5 text-xs rounded-full border border-[#E5E7EB] bg-white" value={value.iban} onChange={(e) => setValue({ ...value, iban: e.target.value })} maxLength="47" />
                        </div>
                        <ErrDiv field='iban' errors={errors} ln={ln} />
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <label className="w-[90px] text-xs text-[#0c5aa6]">{getTtl('Note', ln)} #4:</label>
                            <input type="text" className="flex-1 h-8 px-5 text-xs rounded-full border border-[#E5E7EB] bg-white" value={value.corrBankSwift} onChange={(e) => setValue({ ...value, corrBankSwift: e.target.value })} maxLength="47" />
                        </div>
                        <ErrDiv field='corrBankSwift' errors={errors} ln={ln} />
                    </div>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">

                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <label className="w-[110px] text-xs text-[#0c5aa6]">{getTtl('BankNickName', ln)}:</label>
                            <input type="text" className="flex-1 h-8 px-5 text-xs rounded-full border border-[#E5E7EB] bg-white" value={value.bankNname} onChange={(e) => setValue({ ...value, bankNname: e.target.value })} />
                        </div>
                        <ErrDiv field='bankNname' errors={errors} ln={ln} />
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <label className="w-[110px] text-xs text-[#0c5aa6]">{getTtl('Currency', ln)}:</label>
                            <div className="flex-1">
                                <div className="flex items-center h-8 px-4 rounded-full border border-[#E5E7EB] bg-white transition focus-within:border-[#0A5DB8] focus-within:ring-2 focus-within:ring-[#0A5DB8]/20">
                                    <CBox data={settings.Currency?.Currency || []} setValue={setValue} value={value} name="cur" className="w-full bg-transparent border-none rounded-none shadow-none text-xs" />
                                </div>
                            </div>
                        </div>
                        <ErrDiv field='cur' errors={errors} ln={ln} />
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <label className="w-[110px] text-xs text-[#0c5aa6]">{getTtl('Note', ln)} #3:</label>
                            <input type="text" className="flex-1 h-8 px-5 text-xs rounded-full border border-[#E5E7EB] bg-white" value={value.corrBank} onChange={(e) => setValue({ ...value, corrBank: e.target.value })} maxLength="47" />
                        </div>
                        <ErrDiv field='corrBank' errors={errors} ln={ln} />
                    </div>

                    <div className="flex items-center">
                        <label className="w-[110px] text-xs text-[#0c5aa6]">
                        {getTtl('Other', ln)}:
                        </label>
                        <input
                        type="text"
                        className="flex-1 h-8 px-5 text-xs rounded-full border border-[#E5E7EB] bg-white"
                        value={value.other}
                        onChange={(e) => setValue({ ...value, other: e.target.value })}
                        />
                    </div>

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
