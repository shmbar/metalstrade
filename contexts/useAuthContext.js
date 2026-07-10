'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth'
import { auth } from '../utils/firebase'
import { loadDataSettings, logEvent } from '../utils/utils'

import { useRouter, usePathname } from "next/navigation";
import { SettingsContext } from "../contexts/useSettingsContext";
import BackToLoginPage from '../components/backToLoginPage'

const AuthContext = createContext()

// Inactivity caps, remember-aware. Without "Remember me" a session dies 2h after the
// last activity (and on browser close, via session persistence) — no accidental
// auto-login from cookie memory. WITH "Remember me" the session survives browser
// closes like users expect (the 2h cap was silently overriding the checkbox — the
// reported "Remember me doesn't work") but still expires after 30 idle days, so a
// forgotten login can't live forever.
const SESSION_MAX_MS = 2 * 60 * 60 * 1000;            // 2 hours (Remember me OFF)
const REMEMBERED_MAX_MS = 30 * 24 * 60 * 60 * 1000;   // 30 days (Remember me ON)


const AuthContextProvider = ({ children }) => {

  const [user, setUser] = useState(undefined)
  const [err, setErr] = useState(null)
  const router = useRouter()
  const [loadingPage, setLoadingPage] = useState(true);
  const { setCompData, updateSettings, uidCollection, setUidCollection } = useContext(SettingsContext);

  const [userTitle, setUserTitle] = useState(null)
  const pathName = usePathname()

  const gisAccount = uidCollection=== 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS' ?  true: false

  // Acting user identity for attribution ("who did what"). Firebase displayName
  // is often unset, so fall back to email. Used by logActivity below.
  const currentUser = useMemo(() => {
    // Prefer the user's set name (Settings → Users → Name = Firebase displayName).
    // If it's empty (e.g. a user created without a name), derive a readable name
    // from the email local-part ("anna.smith@x.com" → "Anna Smith") so nobody shows
    // up as a raw address or "Unknown".
    const fromEmail = (e) => {
      if (!e) return '';
      return String(e).split('@')[0].split(/[._-]+/).filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    };
    return {
      uid: user?.uid || '',
      name: user?.displayName?.trim() || fromEmail(user?.email) || 'Unknown',
      email: user?.email || '',
    };
  }, [user])

  // Fire-and-forget activity logger — auto-injects the acting user + account so
  // call sites stay one-liners: logActivity({ type, entityType, entityId, ... }).
  // Never throws; never blocks the caller's save.
  const logActivity = useCallback((evt = {}) => {
    return logEvent(uidCollection, { ...evt, actorUid: currentUser.uid, actorName: currentUser.name })
  }, [uidCollection, currentUser])

  const SignIn = useCallback(async (email, password, remember = false) => {
    try {
      // "Remember me": keep the session across browser close (local) vs clear it on close
      // (session) — so an unchecked login can't auto-resume from cookie memory later.
      try {
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      } catch { /* persistence not supported — fall back to default, don't block login */ }
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      sessionStorage.setItem('isLogged', true);
      localStorage.setItem('lastSeen', String(Date.now())); // starts the inactivity window
      localStorage.setItem('rememberMe', remember ? '1' : '0'); // picks the 2h vs 30-day cap on reload
      setUser(userCredential.user);
      // Only redirect if authenticated
      router.push("/contracts");
    } catch (error) {
      setErr(error.message);
    }
  }, [router])
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

  const SignOut = useCallback(async () => {
    sessionStorage.clear();
    localStorage.clear();
    setUser(null);
    if (window.__resetLogoutTimer) window.__resetLogoutTimer();
    await signOut(auth).catch(() => {});
    // Force reload to clear any cached state and ensure full session expiry
    window.location.replace("/");
  }, [])

  // Only set loadingPage to false after both Firebase user and uidCollection are loaded
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Enforce the inactivity cap on load: if a persisted session has been idle longer
      // than its window (2h normally, 30 days with "Remember me"), sign it out and require
      // a fresh login (password) instead of auto-resuming.
      if (currentUser) {
        const last = parseInt(localStorage.getItem('lastSeen') || '0', 10);
        const cap = localStorage.getItem('rememberMe') === '1' ? REMEMBERED_MAX_MS : SESSION_MAX_MS;
        if (last && Date.now() - last > cap) {
          localStorage.removeItem('lastSeen');
          await signOut(auth).catch(() => {});
          setUser(null);
          return;
        }
      }
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Keep the "last activity" stamp fresh while logged in (heartbeat + on tab close), so the
  // 2h cap measures time since the user was last actually using the app.
  useEffect(() => {
    if (!user) return;
    const bump = () => localStorage.setItem('lastSeen', String(Date.now()));
    bump();
    const id = setInterval(bump, 60_000);
    window.addEventListener('beforeunload', bump);
    return () => { clearInterval(id); window.removeEventListener('beforeunload', bump); };
  }, [user]);

  // Safety net against a stuck login spinner: if loading hasn't finished after 12s (e.g. the
  // uidCollection token claim never resolved), stop loading — and if there's a "user" with no
  // usable account claim, sign out cleanly so they can log in again instead of being frozen.
  useEffect(() => {
    if (!loadingPage) return;
    const id = setTimeout(() => {
      if (auth.currentUser && !uidCollection) {
        signOut(auth).catch(() => {});
        setUser(null);
      }
      setLoadingPage(false);
    }, 12000);
    return () => clearTimeout(id);
  }, [loadingPage, uidCollection]);

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


  // Memoized: consumers (every page + layout) re-render only when auth state truly
  // changes, not whenever this provider re-renders from Settings churn.
  const value = useMemo(
    () => ({ user, SignIn, err, SignOut, loadingPage, uidCollection, gisAccount, userTitle, currentUser, logActivity }),
    [user, SignIn, err, SignOut, loadingPage, uidCollection, gisAccount, userTitle, currentUser, logActivity]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContextProvider;

export const UserAuth = () => {
  return useContext(AuthContext);
};
