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
        <div className=' p-2  rounded-2xl flex flex-col md:flex-row w-full gap-4 '>

            <div className=' p-4 rounded-2xl mt-1 shadow-md w-[28%] bg-[#e3f3ff]'>
                <p className='flex items-center text-sm font-medium pl-2 text-[var(--endeavour)] '>{getTtl('Suppliers', ln)}:</p>
                <ul className="flex flex-col mt-2 max-h-80 overflow-auto p-2">
                          {sortArr((settings.Supplier?.Supplier || []).filter(q => !q.deleted), 'supplier').map((x, i) => {
                        return (
                         <li
                            key={i}
                            onClick={() => SelectSupplier(x)}
                            className={`
                                whitespace-nowrap
                                cursor-pointer
                                py-2 px-4
                                text-xs 
                                rounded-xl
                                transition-all duration-200
                                text-[var(--endeavour)] 
                                ${value.id === x.id
                                ? 'bg-white shadow-sm font-medium'
                                : 'bg-transparent hover:bg-white/20'}
                            `}
                            >
                            {x.supplier}
                         </li>
                        )
                    })}
                </ul>
            </div>

            <div className='flex flex-col w-[80%] bg-[#f7f7f7]  p-5 rounded-2xl'>
                <div className='pb-4 mt-1  w-full gap-8 flex flex-wrap'>
                    <Tltip direction='top' tltpText='Add new supplier'>
                        <button className={`supplierAddButton py-1 ${disabledButton ? 'cursor-not-allowed' : ''}`} disabled={disabledButton}
                            onClick={addItem}>
                            <IoAddCircleOutline className='scale-110' />  {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Update supplier data'>
                        <button className='supplierButton py-1' disabled={!value.id}
                            onClick={updateList}>
                            <FiUpload className='scale-125 text-[var(--endeavour)]' />
                            {getTtl('Update', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete supplier'>
                        <button className='supplierButton py-1' onClick={() => setIsDeleteOpen(true)}
                            disabled={!value.id}>
                            <MdDeleteOutline className='scale-125 text-[var(--endeavour)]' />  {getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Clear form'>
                        <button className='supplierButton py-1'
                            onClick={clickClear}>
                            <RiEraserLine className='scale-125 text-[var(--endeavour)]' />{getTtl('Clear', ln)}
                        </button>
                    </Tltip>
                </div>
                <div className='border  border-[var(#E5E7EB)] p-7 rounded-2xl mt-1 shadow-md  w-full gap-4 flex flex-wrap bg-white'>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 w-full">

  {/* LEFT COLUMN */}
  <div className="space-y-6">

    <div className="flex items-center">
      <label className="text-base text-[#0c5aa6] w-[60px] text-xs">
        Name:
      </label>
      <input
        type="text"
        className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
        value={value.supplier}
        onChange={(e) => setValue({ ...value, supplier: e.target.value })}
      />
    </div>

    <div className="flex items-center gap-5">
      <label className="text-base text-[#0c5aa6] w-[40px]  text-xs">
        Street:
      </label>
      <input
        type="text"
        className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
        value={value.street}
        onChange={(e) => setValue({ ...value, street: e.target.value })}
      />
    </div>

    <div className="flex items-center gap-5">
      <label className="text-base text-[#0c5aa6] w-[40px]  text-xs">
        Country:
      </label>
      <input
        type="text"
        className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
        value={value.country}
        onChange={(e) => setValue({ ...value, country: e.target.value })}
      />
    </div>

  </div>

  {/* RIGHT COLUMN */}
  <div className="space-y-6">

    <div className="flex items-center gap-5">
      <label className="text-base text-[#0c5aa6] w-[70px] text-xs">
        Nick Name:
      </label>
      <input
        type="text"
        className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
        value={value.nname}
        onChange={(e) => setValue({ ...value, nname: e.target.value })}
      />
    </div>

    <div className="flex items-center gap-5">
      <label className="text-base text-[#0c5aa6] w-[70px] text-xs">
        City:
      </label>
      <input
        type="text"
        className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
        value={value.city}
        onChange={(e) => setValue({ ...value, city: e.target.value })}
      />
    </div>

    <div className="flex items-center gap-5">
      <label className="text-base text-[#0c5aa6] w-[70px] text-xs">
        Other:
      </label>
      <input
        type="text"
        className=" flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
        value={value.other1}
        onChange={(e) => setValue({ ...value, other1: e.target.value })}
      />
    </div>

  </div>

</div>

                </div>



             <div className='border border-[#E5E7EB] p-7 rounded-2xl mt-1 shadow-md w-full bg-white'>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 w-full">

    {/* LEFT COLUMN */}
    <div className="space-y-6">

      <div className="flex items-center">
        <label className="w-[60px] text-xs text-[#0c5aa6]">
          POC:
        </label>
        <input
          type="text"
          className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
          value={value.poc}
          onChange={(e) => setValue({ ...value, poc: e.target.value })}
        />
      </div>

      <div className="flex items-center">
        <label className="w-[60px] text-xs text-[#0c5aa6]">
          Phone:
        </label>
        <input
          type="text"
          className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
          value={value.phone}
          onChange={(e) => setValue({ ...value, phone: e.target.value })}
        />
      </div>

      <div className="flex items-center">
        <label className="w-[60px] text-xs text-[#0c5aa6]">
          Fax:
        </label>
        <input
          type="text"
          className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
          value={value.fax}
          onChange={(e) => setValue({ ...value, fax: e.target.value })}
        />
      </div>

    </div>

    {/* RIGHT COLUMN */}
    <div className="space-y-6">

      <div className="flex items-center">
        <label className="w-[70px] text-xs text-[#0c5aa6]">
          Email:
        </label>
        <input
          type="text"
          className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
          value={value.email}
          onChange={(e) => setValue({ ...value, email: e.target.value })}
        />
      </div>

      <div className="flex items-center">
        <label className="w-[70px] text-xs text-[#0c5aa6]">
          Mobile:
        </label>
        <input
          type="text"
          className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
          value={value.mobile}
          onChange={(e) => setValue({ ...value, mobile: e.target.value })}
        />
      </div>

      <div className="flex items-center">
        <label className="w-[70px] text-xs text-[#0c5aa6]">
          Other:
        </label>
        <input
          type="text"
          className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
          value={value.other2}
          onChange={(e) => setValue({ ...value, other2: e.target.value })}
        />
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
