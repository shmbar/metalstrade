
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
};


// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Firestore with a persistent (IndexedDB) local cache: documents already seen are
// served from disk and queries resume via delta-sync instead of re-downloading the
// full result set on every page load. READ path only — writes are unchanged and
// still go straight to the server; when online, reads still confirm freshness with
// the server, so figures are never stale. Multi-tab manager keeps several open
// tabs sharing one cache safely.
// SSR has no IndexedDB, and any init failure (e.g. blocked IndexedDB in strict
// private browsing) falls back to the exact pre-cache behavior.
let firestoreDb;
if (typeof window === "undefined") {
  firestoreDb = getFirestore(app);
} else {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    firestoreDb = getFirestore(app);
  }
}
export const db = firestoreDb;
export const storage = getStorage(app);
