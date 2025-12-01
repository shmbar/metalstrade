import { delUser, getAllUsers } from '@actions/pass';
import Customtable from './tables/newTable';
import { UserAuth } from '@contexts/useAuthContext';
import { SettingsContext } from '@contexts/useSettingsContext';
import { getTtl } from '@utils/languages'
import React, { useContext, useEffect, useState } from 'react'
import dateFormat from "dateformat";
import { LiaEdit } from "react-icons/lia";
import { RiDeleteBin5Line } from "react-icons/ri";
import { TbLayoutGridAdd } from 'react-icons/tb';
import ModalToDelete from '@components/modalToProceed';
import MyDetailsModal from '../_components/dataModal.js'
import { Titles } from '@components/const.js';


const newUser = {
  uid: '',
  email: '',
  emailVerified: true,
  password: '',
  displayName: '',
  photoURL: 'http://www.example.com/12345678/photo.png',
  disabled: false,
  password1: '',
  title: ''
}


const Users = () => {

  const { compData, settings, setLoading, setToast } = useContext(SettingsContext);
  const ln = compData.lng
  const { uidCollection } = UserAuth();
  const [data, setData] = useState([]);
  const [user, setUser] = useState({});
  const [isOpenUser, setIsOpenUser] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [row, setRow] = useState()


  let propDefaults = Object.keys(settings).length === 0 ? [] : [
    { accessorKey: 'displayName', header: 'Name', cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'phoneNumber', header: 'Phone Number', cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'email', header: 'Email', cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'title', header: 'Title', cell: (props) => <p className='font-semibold'>{props.getValue()}</p> },
    {
      accessorKey: 'userCreated', header: 'User Created ', cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy')}</p>,
      enableColumnFilter: false
    },
    {
      accessorKey: 'lastLogedIn', header: 'Last Loged In ', cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy')}</p>,
      enableColumnFilter: false
    },
    {
      accessorKey: 'edit', header: 'Edit ', cell: (props) => <div>{<LiaEdit className='scale-[1.5]' onClick={() => Edit(props)} />}</div>,
      enableColumnFilter: false
    },
    {
      accessorKey: 'delete', header: 'Delete ', cell: (props) => <div>{<RiDeleteBin5Line className='scale-[1.4]' onClick={() => Delete(props)} />}</div>,
      enableColumnFilter: false
    },
  ];

  const Edit = (props) => {
    let obj = props.row.original;

    setUser({
      ...obj, title: Titles.find(z => z.title === obj.title)?.id,
      password: '', password1: ''
    })
    setIsOpenUser(true)

  }
  const Delete = (props) => {
    setIsDeleteOpen(true)
    setRow(props)
  }

  const deleteUser = async () => {
    await delUser(row.row.original.uid)
    setData(data.filter(x => x.uid !== row.row.original.uid))
    setToast({ show: true, text: 'User is successfully deleted!', clr: 'success' })
  }

  useEffect(() => {
    const getUsersData = async () => {
      setLoading(true)
      let data1 = await getAllUsers(uidCollection)
      data1 = data1.map(x => ({
        ...x, title: x?.customClaims?.title, userCreated: x.metadata?.creationTime,
        lastLogedIn: x.metadata?.lastSignInTime,
      }))

      setData(data1)
      setLoading(false)
    }

    getUsersData()
  }, [])

  const addNewUser = () => {
    setUser(newUser)
    setIsOpenUser(true)
  }


  return (
    <div className='border border-slate-300 p-4 rounded-lg flex flex-col w-full gap-4 '>

      <p className='w-full flex items-center text-sm font-medium pl-2 text-slate-700 whitespace-nowrap'>{getTtl('Users', ln)}</p>

      <div className='max-w-6xl z-0'>
        <Customtable data={data} columns={propDefaults} SelectRow={() => { }}
							/* excellReport={EXD(invoicesData, settings, getTtl('Invoices', ln), ln)}*/ />
      </div>
      <div className="text-left pt-6 ">
      
        <button
          type="button"
          onClick={addNewUser}
          className="text-white bg-slate-500 hover:bg-slate-400 focus:outline-none font-medium rounded-lg 
													 text-xs px-3 py-2 text-center drop-shadow-xl gap-1.5 items-center flex"
        >
          <TbLayoutGridAdd className="scale-110" />
          Add New User
        </button>

      </div>

      <MyDetailsModal isOpen={isOpenUser} setIsOpen={setIsOpenUser} data={data} setData={setData}
        title={user.uid === '' ? 'New User' : `${'User'}: ${user.displayName}`}
        user={user}
        setUser={setUser}
      />

      <ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
        ttl={getTtl('delConfirmation', ln)} txt='The user will be deleted. Please confirm to proceed'
        doAction={() => deleteUser()}
      />
    </div>

  )
}

export default Users