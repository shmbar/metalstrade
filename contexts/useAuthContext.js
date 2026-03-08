'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../utils/firebase'
import { loadDataSettings } from '../utils/utils'

import { useRouter, usePathname } from "next/navigation";
import { SettingsContext } from "../contexts/useSettingsContext";
import BackToLoginPage from '../components/backToLoginPage'

const AuthContext = createContext()


const AuthContextProvider = ({ children }) => {

  const [user, setUser] = useState(undefined)
  const [err, setErr] = useState(null)
  const router = useRouter()
  const [loadingPage, setLoadingPage] = useState(true);
  const { setCompData, updateSettings } = useContext(SettingsContext);
  const [uidCollection, setUidCollection] = useState(null)
  const [userTitle, setUserTitle] = useState(null)
  const pathName = usePathname()

  const gisAccount = uidCollection=== 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS' ?  true: false

  const SignIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      sessionStorage.setItem('isLogged', true);
      setUser(userCredential.user);
      // Only redirect if authenticated
      router.push("/contracts");
    } catch (error) {
      setErr(error.message);
    }
  }
  // On mount or route change, if not authenticated, redirect to sign-in
    // Robust: Only redirect after Firebase auth state is loaded
    useEffect(() => {
      const publicRoutes = ['/', '/about', '/contact', '/signin', '/signin', '/blog', '/features', '/landing'];
      if (loadingPage) return; // Wait for Firebase to finish checking
      if (!user) {
        if (!publicRoutes.includes(pathName)) {
          router.replace('/signin');
        }
        return;
      }
      // If logged in and on /signin, always redirect to dashboard
      if (user && pathName === '/signin') {
        router.replace('/dashboard');
      }
    }, [user, pathName, loadingPage]);
  // Removed unwanted redirect to home page on refresh. Users will stay on the current page unless redirected elsewhere.


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
    sessionStorage.clear();
    localStorage.clear();
    setUser(null);
    if (window.__resetLogoutTimer) window.__resetLogoutTimer();
    await signOut(auth).catch(() => {});
    // Force reload to clear any cached state and ensure full session expiry
    window.location.replace("/");
  }

  // Only set loadingPage to false after both Firebase user and uidCollection are loaded
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // If user is checked and uidCollection is set (or user is null), stop loading
    if (user === undefined) return;
    if (user && !uidCollection) return; // Wait for uidCollection
    setLoadingPage(false);
  }, [user, uidCollection]);





  useEffect(() => {
    const loadData = async () => {
      if (!uidCollection) return;
      let dt = await loadDataSettings(uidCollection, 'cmpnyData')
      setCompData(dt)

      dt = await loadDataSettings(uidCollection, 'settings')
      updateSettings(dt)
    }

    if (uidCollection) {
      loadData();
    }
  }, [uidCollection]);


  useEffect(() => {
    const getUidCollection = async () => {
      try {
        if (!user) {
          setUidCollection(null);
          setUserTitle(null);
          return;
        }
        const idTokenResult = await auth.currentUser.getIdTokenResult();
        const uidCollection = idTokenResult.claims.uidCollection;
        setUidCollection(uidCollection);
        const userTitl1 = idTokenResult?.claims?.title;
        setUserTitle(userTitl1);
      } catch (error) {
        setUidCollection(null);
        setUserTitle(null);
        console.error(error);
      }
    };
    getUidCollection();
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
