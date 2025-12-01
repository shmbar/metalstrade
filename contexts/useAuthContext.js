'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '@utils/firebase'
import { loadDataSettings } from '@utils/utils'

import { useRouter, usePathname } from "next/navigation";
import { SettingsContext } from "@contexts/useSettingsContext";
import BackToLoginPage from '@components/backToLoginPage'

const AuthContext = createContext()


const AuthContextProvider = ({ children }) => {

  const [user, setUser] = useState(null)
  const [err, setErr] = useState(null)
  const router = useRouter()
  const [loadingPage, setLoadingPage] = useState(true);
  const { setCompData, setSettings } = useContext(SettingsContext);
  const [uidCollection, setUidCollection] = useState(null)
  const [userTitle, setUserTitle] = useState(null)
  const pathName = usePathname()

  const gisAccount = uidCollection=== 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS' ?  true: false

  const SignIn = async (email, password) => {


    await signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        sessionStorage.setItem('isLogged', true);

        setUser(userCredential.user)
        //   router.push("/contracts");
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        setErr(errorMessage)
      });

  }
  useEffect(() => {
    let isLogged = sessionStorage.getItem('isLogged')
    if (!isLogged && pathName !== '/') router.push("/");
  }, []);


  /*
  const SignUp = async (email, password) => {
    //  setLoading(true)

    await createUserWithEmailAndPassword(auth, email, password)
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
*/

  const SignOut = async () => {
    await signOut(auth).then(() => {
      sessionStorage.clear();
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
      let dt = await loadDataSettings(uidCollection, 'cmpnyData')
      setCompData(dt)

      dt = await loadDataSettings(uidCollection, 'settings')
      setSettings(dt)

    }

    uidCollection && loadData()
  }, [uidCollection]);


  useEffect(() => {
    const getUidCollection = async () => {
      try {
        const idTokenResult = await auth.currentUser.getIdTokenResult();
        const uidCollection = idTokenResult.claims.uidCollection;
        sessionStorage.setItem('uidCollection', uidCollection);
        setUidCollection(uidCollection);

        const userTitl1 = idTokenResult?.claims?.title;
        setUserTitle(userTitl1)
        sessionStorage.setItem('userTitle', userTitl1);

        if (userTitl1 === 'Accounting') {
          router.push("/accounting");
        } else {
          router.push("/contracts");
        }

      } catch (error) {
        console.error(error);
      }
    };


    let isLogged = sessionStorage.getItem('isLogged')
    let uidCollection = sessionStorage.getItem('uidCollection')
    let userTitle = sessionStorage.getItem('userTitle')

    if (isLogged && !uidCollection) {
      getUidCollection();
    } else {
      setUidCollection(uidCollection);
      setUserTitle(userTitle)

    }

  }, [user]);


  return (
    <AuthContext.Provider value={{ user, SignIn, err, SignOut, loadingPage, uidCollection, gisAccount, userTitle }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContextProvider;

export const UserAuth = () => {
  return useContext(AuthContext);
};