'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@utils/firebase'
import { loadDataSettings } from '@utils/utils'

import { useRouter } from "next/navigation";
import { SettingsContext } from "@contexts/useSettingsContext";

const AuthContext = createContext()


const AuthContextProvider = ({ children }) => {

  const [user, setUser] = useState(null)
  const [err, setErr] = useState(null)
  const router = useRouter()
  const [loadingPage, setLoadingPage] = useState(true);
  const { setLoading, setCompData, setSettings } = useContext(SettingsContext);

  const SignIn = async (email, password) => {
    //  setLoading(true)
    await signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        router.push("/contracts");
        setUser(userCredential.user)
        //    setLoading(false)
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        setErr(errorMessage)
      });

  }

  const SignUp = async (email, password) => {
    //  setLoading(true)

    await  createUserWithEmailAndPassword(auth,email, password)
      .then((userCredential) => {
        console.log('success')
        router.push("/");
    //    setUser(userCredential.user)
        //    setLoading(false)
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        setErr(errorMessage)
      });

  }
 


  const SignOut = async () => {
    await signOut(auth).then(() => {
    }).catch((error) => {
    });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

    });
    return () => unsubscribe();
  }, [user]);


  useEffect(() => {
    const checkAuthentication = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      setLoadingPage(false);
    };
    checkAuthentication();
  }, [user]);


  useEffect(() => {
    const loadData = async () => {
     let dt = await loadDataSettings(user?.uid, 'cmpnyData')
     setCompData(dt)

     dt = await loadDataSettings(user?.uid, 'settings')
     setSettings(dt)
      
    }

   user?.uid && loadData()
  }, [user]);

  const uidCollection = user?.uid



  return (
    <AuthContext.Provider value={{ user, SignIn, err, SignOut, loadingPage, uidCollection, SignUp }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContextProvider;

export const UserAuth = () => {
  return useContext(AuthContext);
};