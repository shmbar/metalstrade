import { delUser, getAllUsers } from '../../../../actions/pass';
import Customtable from './tables/newTable';
import { UserAuth } from '../../../../contexts/useAuthContext';
import { SettingsContext } from '../../../../contexts/useSettingsContext';
import { getTtl } from '../../../../utils/languages'
import React, { useContext, useEffect, useState } from 'react'
import dateFormat from "dateformat";
import { LiaEdit } from "react-icons/lia";
import { RiDeleteBin5Line } from "react-icons/ri";
import { TbLayoutGridAdd } from 'react-icons/tb';
import ModalToDelete from '../../../../components/modalToProceed';
import MyDetailsModal from '../_components/dataModal.js'
import { Titles } from '../../../../components/const.js';
import { User } from 'lucide-react';

const newUser = {
  uid: '',
  email: '',
  emailVerified: true,
  password: '',
  displayName: '',
  phoneNumber: '',
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
    { accessorKey: 'displayName', header: 'Name', size: 130, cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'phoneNumber', header: 'Phone Number', size: 130, cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'email', header: 'Email', size: 200, cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'title', header: 'Title', size: 100, cell: (props) => <p className='font-semibold'>{props.getValue()}</p> },
    {
      accessorKey: 'userCreated', header: 'User Created ', size: 100, cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
      enableColumnFilter: false
    },
    {
      accessorKey: 'lastLogedIn', header: 'Last Loged In ', size: 100, cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
      enableColumnFilter: false
    },
    {
      accessorKey: 'delete', header: 'Delete ', size: 65, cell: (props) => (
        <button onClick={() => Delete(props)} className="flex items-center justify-center">
          <RiDeleteBin5Line className='text-red-500 scale-[1.2]' />
        </button>
      ),
      enableColumnFilter: false
    },
  ];

  const Edit = (row) => {
    let obj = row.original;

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
    <div className='p-2 rounded-2xl flex flex-col w-full gap-4 '>

      <div className='max-w-6xl z-0 users-no-quicksum'>
        <Customtable data={data} columns={propDefaults} SelectRow={() => { }}
        Edit={Edit}
							/* excellReport={EXD(invoicesData, settings, getTtl('Invoices', ln), ln)}*/ />
      </div>
      <div className="text-left pt-6 ">
      
        <button
          type="button"
          onClick={addNewUser}
          className="bg-[var(--endeavour)] text-white focus:outline-none font-medium rounded-full text-[0.75rem] px-4 py-2 text-center gap-1.5 items-center flex hover:opacity-90 transition-all"
        >
          <User size={16} />
          Add New User
        </button>

      </div>

      <MyDetailsModal isOpen={isOpenUser} setIsOpen={setIsOpenUser} data={data} setData={setData}
        title={user.uid === '' ? 'New User' : `${'User'}: ${user.displayName}`}
        user={user}
        setUser={setUser}
        Delete={Delete}
      />

      <ModalToDelete isDeleteOpen={isDeleteOpen} setIsDeleteOpen={setIsDeleteOpen}
        ttl={getTtl('delConfirmation', ln)} txt='The user will be deleted. Please confirm to proceed'
        doAction={() => deleteUser()}
      />

    </div>

  )
}

export default Users
