
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
// `ignoreUndefinedProperties` is the difference between a record that saves and one
// that does not. Firestore rejects an entire write if any field is `undefined`, and
// these documents are assembled by spreading form state, so a key the form never
// filled in arrives as undefined and takes the whole save down with it. That is not
// a hypothetical: saving an invoice threw on `productsData`, and once that was fixed,
// on `salesContractId` — the same failure waiting on every optional field in the app.
//
// Dropping them loses nothing. `undefined` is not a value Firestore can store, and it
// is not how a field gets cleared either (that needs deleteField()), so a write that
// omits it does exactly what the caller meant.
const FIRESTORE_SETTINGS = { ignoreUndefinedProperties: true };

let firestoreDb;
if (typeof window === "undefined") {
  firestoreDb = initializeFirestore(app, FIRESTORE_SETTINGS);
} else {
  try {
    firestoreDb = initializeFirestore(app, {
      ...FIRESTORE_SETTINGS,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    // Cache unavailable (blocked IndexedDB, strict private browsing). Keep the
    // undefined-tolerance even here — it is what makes writes survive.
    try {
      firestoreDb = initializeFirestore(app, FIRESTORE_SETTINGS);
    } catch {
      firestoreDb = getFirestore(app);
    }
  }
}
export const db = firestoreDb;
export const storage = getStorage(app);
