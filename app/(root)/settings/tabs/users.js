import { delUser, getAllUsers } from '../../../../actions/pass';
import Customtable from './tables/newTable';
import { UserAuth } from '../../../../contexts/useAuthContext';
import { SettingsContext } from '../../../../contexts/useSettingsContext';
import { getTtl } from '../../../../utils/languages'
import React, { useContext, useEffect, useState } from 'react'
import dateFormat from "dateformat";

import ModalToDelete from '../../../../components/modalToProceed';
import MyDetailsModal from '../_components/dataModal.js'
import {
  PAGE_KEYS,
  canManageRole,
  defaultPagesForRole,
  roleLabel,
} from '../../../../utils/permissions';
import { TONES, toneChipStyle } from '../../../../components/statusUtils';
import { ShieldCheck, User } from 'lucide-react';
import { Trash } from 'lucide-react';


const newUser = {
  uid: '',
  email: '',
  emailVerified: true,
  password: '',
  displayName: '',
  phoneNumber: '',
  disabled: false,
  password1: '',
  role: 'user',
  pages: defaultPagesForRole('user'),
}

// Role reads as a chip so Super Admin is spottable at a glance in a long list.
// Tones come from statusUtils rather than a hand-rolled bg/text/border triple —
// same recipe as every other chip in the app, so it follows the colour preset.
const ROLE_TONES = {
  superadmin: TONES.blue,
  admin: TONES.green,
  accounting: TONES.amber,
  user: TONES.gray,
};

const roleChip = (role) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg responsiveTextTable font-medium font-sans whitespace-nowrap"
    style={toneChipStyle(ROLE_TONES[role] || TONES.gray)}>
    {role === 'superadmin' && <ShieldCheck size={11} />}
    {roleLabel(role)}
  </span>
);


const Users = () => {

  const { compData, settings, setLoading, setToast } = useContext(SettingsContext);
  const ln = compData.lng
  const { uidCollection, claims, user: me, getIdToken, canManageUsers } = UserAuth();
  const [data, setData] = useState([]);
  const [user, setUser] = useState({});
  const [isOpenUser, setIsOpenUser] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [row, setRow] = useState()

  // Can the signed-in admin act on this particular member? Editing yourself, the
  // workspace owner, or anyone above your own rank is refused by the server too —
  // this just keeps the buttons honest.
  const mayTouch = (u) =>
    canManageUsers
    && u.uid !== me?.uid
    && !u.isOwner
    && canManageRole(claims || {}, u.role, me?.uid || '');

  const whyNot = (u) => {
    if (u.uid === me?.uid) return 'You cannot change your own account here';
    if (u.isOwner) return 'The workspace owner account is protected';
    return `You do not have permission to modify a ${roleLabel(u.role)}`;
  };

  let propDefaults = Object.keys(settings).length === 0 ? [] : [
    { accessorKey: 'displayName', header: 'Name', size: 130, cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'phoneNumber', header: 'Phone Number', size: 130, cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'email', header: 'Email', size: 200, cell: (props) => <p>{props.getValue()}</p> },
    {
      accessorKey: 'role', header: 'Role', size: 110,
      cell: (props) => roleChip(props.getValue()),
    },
    {
      // The one column that answers "what can this person actually see?" without
      // opening the record.
      accessorKey: 'pages', header: 'Can See', size: 130,
      cell: (props) => {
        const u = props.row.original;
        const n = props.getValue()?.length || 0;
        if (u.role === 'superadmin') return <p className="text-[var(--ink-muted)]">All pages</p>;
        if (!u.customPages) return <p className="text-[var(--ink-muted)]">{roleLabel(u.role)} default</p>;
        return <p className="font-medium">{n} of {PAGE_KEYS.length} pages</p>;
      },
      enableColumnFilter: false
    },
    {
      accessorKey: 'userCreated', header: 'User Created ', size: 100, cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
      enableColumnFilter: false
    },
    {
      accessorKey: 'lastLogedIn', header: 'Last Loged In ', size: 100, cell: (props) => <p>{dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
      enableColumnFilter: false
    },
    {
      accessorKey: 'delete', header: 'Delete ', size: 65, cell: (props) => {
        const u = props.row.original;
        if (!mayTouch(u)) {
          return (
            <p className="flex items-center justify-center w-full text-[var(--ink-muted)] responsiveText"
              title={whyNot(u)}>
              —
            </p>
          );
        }
        return (
          <button
            onClick={() => Delete(props)}
            className="flex items-center justify-center w-full"
          >
            <Trash className="text-red-500" size={14} />
          </button>
        );
      },
      enableColumnFilter: false
    },
  ];

  const Edit = (row) => {
    let obj = row.original;
    if (!mayTouch(obj)) {
      setToast({ show: true, text: whyNot(obj) + '.', clr: 'fail' });
      return;
    }
    setUser({ ...obj, password: '', password1: '' })
    setIsOpenUser(true)
  }

  const Delete = (props) => {
    setIsDeleteOpen(true)
    setRow(props)
  }

  const deleteUser = async () => {
    const target = row.row.original;
    const idToken = await getIdToken();
    const result = await delUser({ idToken, uid: target.uid })
    if (result?.error) {
      setToast({ show: true, text: result.error.message, clr: 'fail' })
      return;
    }
    setData(data.filter(x => x.uid !== target.uid))
    setToast({ show: true, text: 'User is successfully deleted!', clr: 'success' })
  }

  useEffect(() => {
    const getUsersData = async () => {
      setLoading(true)
      // The server derives the workspace from the caller's own token now, so
      // the list can't be pointed at somebody else's account.
      const idToken = await getIdToken();
      const data1 = await getAllUsers(idToken)
      setData(data1)
      setLoading(false)
    }

    if (!uidCollection) return;
    getUsersData();

  }, [uidCollection])

  const addNewUser = () => {
    setUser({ ...newUser, pages: [...defaultPagesForRole('user')] })
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

        {canManageUsers && (
          <button
            type="button"
            onClick={addNewUser}
            className="bg-[var(--endeavour)] text-[var(--on-brand)] focus:outline-none font-medium rounded-control responsiveTextInput px-4 py-2 text-center gap-1.5 items-center flex hover:opacity-90 transition-all"
          >
            <User size={16} />
            Add New User
          </button>
        )}

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
