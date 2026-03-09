import { useState, useContext, useEffect } from 'react';
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { v4 as uuidv4 } from 'uuid';
import { IoAddCircleOutline } from 'react-icons/io5';
import { MdDeleteOutline } from 'react-icons/md';
import { BiEditAlt } from 'react-icons/bi';
import { AiOutlineClear } from 'react-icons/ai';
import { sortArr, validate, ErrDiv } from '../../../../utils/utils'
import ModalToDelete from '../../../../components/modalToProceed';
import { UserAuth } from "../../../../contexts/useAuthContext";
import { getTtl } from '../../../../utils/languages';
import Tltip from '../../../../components/tlTip';

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

        //validation
        let errs = validate(value, ['client', 'nname', 'street', 'city', 'country'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true); //all filled

        if (!isNotFilled) {
            let newArr = [
                ...settings.Client.Client, { ...value, id: uuidv4() }];
            const newObj = { ...settings.Client, Client: newArr }
            updateSettings(uidCollection, newObj, 'Client', true)
            clickClear()
        }

    };

    const updateList = () => {
        let errs = validate(value, ['client', 'nname', 'street', 'city', 'country'])
        setErrors(errs)
        const isNotFilled = Object.values(errs).includes(true); //all filled

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




    return (
        <div className='p-2 rounded-2xl flex flex-col md:flex-row w-full gap-4 '>
              <div className="md:px-5 w-[27%] flex-shrink-0 rounded-2xl p-2
                          bg-[#e3f3ff]">
                                <p className='flex items-center text-sm font-medium pl-2 text-[var(--endeavour)] mt-2'>{getTtl('Clients', ln)}:</p>

                      <ul
                        className="
                          flex flex-col overflow-auto mt-1
                          
                          py-2
                        "
                      >
                         {sortArr((settings.Client?.Client || []).filter(q => !q.deleted), 'client').map((x, i) => {
                        return (
                            <li key={i} onClick={() => SelectClient(x)}
                                className={`whitespace-nowrap cursor-pointer flex items-center gap-x-2 py-2 px-4 text-xs text-[var(--endeavour)]    rounded-full

                                ${value.id === x.id && 'font-medium bg-white'}`}>
                                {x.client}

                            </li>
                        )
                    })}
                      </ul>
            </div>
           
            <div className='flex flex-col   w-[88%] bg-[#f7f7f7]  p-5 rounded-2xl'>
                <div className='pb-2 rounded-2xl mt-1   w-full gap-4 flex flex-wrap'>
                    <Tltip direction='top' tltpText='Add new client'>
                        <button className={`supplierAddButton py-1 ${disabledButton ? 'cursor-not-allowed' : ''}`} disabled={disabledButton}
                            onClick={addItem}>
                            <IoAddCircleOutline className='scale-110' />  {getTtl('Add', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Update client data'>
                        <button className='supplierButton py-1'
                            onClick={updateList}>
                            <BiEditAlt className='scale-125' />
                            {getTtl('Update', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Delete client'>
                        <button className='supplierButton py-1' onClick={() => setIsDeleteOpen(true)}
                            disabled={!value.id}>
                            <MdDeleteOutline className='scale-125' />{getTtl('Delete', ln)}
                        </button>
                    </Tltip>
                    <Tltip direction='top' tltpText='Clear form'>
                        <button className='supplierButton py-1'
                            onClick={clickClear}>
                            <AiOutlineClear className='scale-125' />{getTtl('Clear', ln)}
                        </button>
                    </Tltip>
                </div>
               <div className='border border-[#E5E7EB] p-6 rounded-2xl mt-1 shadow-md w-full bg-white'>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 w-full">

    {/* LEFT COLUMN */}
    <div className="space-y-6">

      <div className="flex flex-col">
        <div className="flex items-center">
          <label className="w-[70px] text-xs text-[#0c5aa6]">{getTtl('Name', ln)}:</label>
          <input type="text" className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white" value={value.client} onChange={(e) => setValue({ ...value, client: e.target.value })} />
        </div>
        <ErrDiv field='client' errors={errors} ln={ln} />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center">
          <label className="w-[70px] text-xs text-[#0c5aa6]">{getTtl('street', ln)}:</label>
          <input type="text" className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white" value={value.street} onChange={(e) => setValue({ ...value, street: e.target.value })} />
        </div>
        <ErrDiv field='street' errors={errors} ln={ln} />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center">
          <label className="w-[70px] text-xs text-[#0c5aa6]">{getTtl('country', ln)}:</label>
          <input type="text" className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white" value={value.country} onChange={(e) => setValue({ ...value, country: e.target.value })} />
        </div>
        <ErrDiv field='country' errors={errors} ln={ln} />
      </div>

    </div>

    {/* RIGHT COLUMN */}
    <div className="space-y-6">

      <div className="flex flex-col">
        <div className="flex items-center">
          <label className="w-[80px] text-xs text-[#0c5aa6]">{getTtl('Nick Name', ln)}:</label>
          <input type="text" className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white" value={value.nname} onChange={(e) => setValue({ ...value, nname: e.target.value })} />
        </div>
        <ErrDiv field='nname' errors={errors} ln={ln} />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center">
          <label className="w-[80px] text-xs text-[#0c5aa6]">{getTtl('city', ln)}:</label>
          <input type="text" className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white" value={value.city} onChange={(e) => setValue({ ...value, city: e.target.value })} />
        </div>
        <ErrDiv field='city' errors={errors} ln={ln} />
      </div>

      <div className="flex items-center">
        <label className="w-[80px] text-xs text-[#0c5aa6]">
          {getTtl('Other', ln)}:
        </label>
        <input
          type="text"
          className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
          value={value.other1}
          onChange={(e) => setValue({ ...value, other1: e.target.value })}
        />
      </div>

    </div>

  </div>

</div>

               <div className='border border-[#E5E7EB] p-6 rounded-2xl mt-1 shadow-md w-full bg-white'>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 w-full">

    {/* LEFT COLUMN */}
    <div className="space-y-6">

      <div className="flex items-center">
        <label className="w-[70px] text-xs text-[#0c5aa6]">
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
        <label className="w-[70px] text-xs text-[#0c5aa6]">
          {getTtl('cmpPhone', ln)}:
        </label>
        <input
          type="text"
          className="flex-1 h-8 px-5 text-sm rounded-full border border-gray-300 bg-white"
          value={value.phone}
          onChange={(e) => setValue({ ...value, phone: e.target.value })}
        />
      </div>

      <div className="flex items-center">
        <label className="w-[70px] text-xs text-[#0c5aa6]">
          {getTtl('Fax', ln)}:
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
          {getTtl('email', ln)}:
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
          {getTtl('cmpMobile', ln)}:
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
          {getTtl('Other', ln)}:
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
                ttl={getTtl('delConfirmation', ln)} txt={getTtl('delConfirmationTxtClient', ln)}
                doAction={deleteItem} />
        </div>
    )
};

export default Clients;
