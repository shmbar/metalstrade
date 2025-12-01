'use client'

import { createNewUser, setUidCollection, getAllUsers, updateUser } from "@actions/pass"
import { UserAuth } from "@contexts/useAuthContext";



const UserProfile = () => {

  const { uidCollection } = UserAuth();

  const getUsers = async () => {
    let tmp = await getAllUsers(uidCollection)
    console.log(tmp);
  }

  return (
    <div>

      <form action={createNewUser}>
        <button type="submit" className="px-2 py-2 bg-slate-100 justify-center flex">Set New Pass</button>
      </form>

      <form action={setUidCollection} className="pt-4">
        <button type="submit" className="px-2 py-2 bg-slate-100 justify-center flex">Set only UidCollection</button>
      </form>

      <form action={getUsers} className="pt-4">
        <button type="submit" className="px-2 py-2 bg-slate-100 justify-center flex">Get all Users</button>
      </form>

      <form action={()=>updateUser("cn2tuYJE1YW3xwIC6YoLIjmYe8r1")} className="pt-4">
        <button type="submit" className="px-2 py-2 bg-slate-100 justify-center flex">Update User</button>
      </form>


    </div>
  )
}

export default UserProfile;