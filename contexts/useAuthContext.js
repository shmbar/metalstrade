'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth'
import { auth } from '../utils/firebase'
import { loadDataSettings, logEvent } from '../utils/utils'
import { ensureSuperAdminClaim } from '../actions/pass'
import {
  canAccess,
  canManageUsers as canManageUsersFor,
  isSuperAdmin as isSuperAdminFor,
  landingPage as landingPageFor,
  normalizeRole,
  resolvePages,
  roleLabel,
} from '../utils/permissions'

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
  // Full custom-claim payload — { uidCollection, role, title, pages }. Access
  // decisions read this rather than `userTitle` alone, so a per-user page list
  // is available everywhere the role is.
  const [claims, setClaims] = useState(null)
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

  // The proof of identity server actions require. Every call to actions/pass.js
  // sends this so the server can verify who is asking instead of trusting the
  // uidCollection in the payload.
  const getIdToken = useCallback(async () => {
    try {
      return auth.currentUser ? await auth.currentUser.getIdToken() : null;
    } catch {
      return null;
    }
  }, [])

  const SignOut = useCallback(async (dest = '/') => {
    // Keep the sign-in page's email prefill across logout — wiping it made every
    // logout look like "Remember me forgot me".
    const savedEmail = localStorage.getItem('email');
    // Keep the colour theme too, so the next login paints in the member's own
    // theme immediately instead of flashing default blue until Firestore loads.
    const savedTheme = localStorage.getItem('ims-theme');
    sessionStorage.clear();
    localStorage.clear();
    if (savedEmail) localStorage.setItem('email', savedEmail);
    if (savedTheme) localStorage.setItem('ims-theme', savedTheme);
    setUser(null);
    if (window.__resetLogoutTimer) window.__resetLogoutTimer();
    await signOut(auth).catch(() => {});
    // Force reload to clear any cached state and ensure full session expiry.
    // Deliberate logout goes home; an expiry passes /signin so the user lands on the
    // form with a reason instead of on the marketing page wondering what happened.
    window.location.replace(typeof dest === 'string' && dest.startsWith('/') ? dest : '/');
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


  // Reads the custom claims off the ID token. `force` fetches a fresh token from
  // Firebase — needed after an admin changes someone's role or pages, since a
  // cached token keeps the OLD permissions until it rotates (up to an hour).
  const readClaims = useCallback(async (force = false) => {
    try {
      if (!auth.currentUser) {
        setUidCollection(null);
        setUserTitle(null);
        setClaims(null);
        return;
      }
      const idTokenResult = await auth.currentUser.getIdTokenResult(force);
      const c = idTokenResult?.claims || {};
      setUidCollection(c.uidCollection);
      setClaims({
        uidCollection: c.uidCollection,
        role: c.role,
        title: c.title,
        pages: c.pages,
      });
      // Keep `userTitle` on the legacy labels ('Admin'/'User'/…) that call sites
      // already compare against, but derive it from the normalized role so an
      // account claimed as 'accounting' and one as 'Accounting' behave alike.
      setUserTitle(roleLabel(c.role || c.title));
    } catch (error) {
      setUidCollection(null);
      setUserTitle(null);
      setClaims(null);
      console.error(error);
    }
  }, [setUidCollection]);

  useEffect(() => {
    if (!user) {
      setUidCollection(null);
      setUserTitle(null);
      setClaims(null);
      return;
    }
    readClaims(false);
  }, [user, readClaims, setUidCollection]);

  // Self-heal the super-admin claim once per session. The workspace owner and any
  // address in SUPER_ADMIN_EMAILS are super admins by definition; this is what
  // writes that into their token so the UI can offer them the role controls.
  useEffect(() => {
    if (!user || !uidCollection) return;
    let cancelled = false;
    (async () => {
      const token = await getIdToken();
      if (!token || cancelled) return;
      const res = await ensureSuperAdminClaim(token).catch(() => null);
      if (res?.changed && !cancelled) readClaims(true);
    })();
    return () => { cancelled = true; };
  }, [user, uidCollection, getIdToken, readClaims]);

  // Pick up permission changes without forcing a re-login: refresh the token
  // when the tab regains focus, at most once every 2 minutes.
  useEffect(() => {
    if (!user) return;
    let last = 0;
    const onFocus = () => {
      if (Date.now() - last < 120_000) return;
      last = Date.now();
      readClaims(true);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, readClaims]);


  // ── Access control, derived once and shared ────────────────────────────────
  // `can('cashflow')` is the single question every gate asks: the sidebar to
  // decide what to list, the layout to decide what to render, a page to decide
  // whether to show an admin-only column.
  const access = useMemo(() => {
    const uid = user?.uid || '';
    const c = claims || {};
    const superAdmin = Boolean(user) && isSuperAdminFor(c, uid);
    return {
      role: superAdmin ? 'superadmin' : normalizeRole(c.role || c.title),
      superAdmin,
      isAdmin: superAdmin || normalizeRole(c.role || c.title) === 'admin',
      canManageUsers: Boolean(user) && canManageUsersFor(c, uid),
      allowedPages: resolvePages(c, uid),
      can: (pageKey) => canAccess(c, pageKey, uid),
      landingPage: landingPageFor(c, uid),
      refreshAccess: () => readClaims(true),
    };
  }, [user, claims, readClaims]);

  // Memoized: consumers (every page + layout) re-render only when auth state truly
  // changes, not whenever this provider re-renders from Settings churn.
  const value = useMemo(
    () => ({ user, SignIn, err, SignOut, loadingPage, uidCollection, gisAccount, userTitle, currentUser, logActivity, claims, getIdToken, ...access }),
    [user, SignIn, err, SignOut, loadingPage, uidCollection, gisAccount, userTitle, currentUser, logActivity, claims, getIdToken, access]
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
