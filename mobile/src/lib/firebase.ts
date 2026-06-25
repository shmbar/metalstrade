import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Same Firebase project as the web CRM — only the SDK init differs (React Native
// needs AsyncStorage-backed auth persistence so sessions survive app restarts).
// Values come from EXPO_PUBLIC_* env vars (see .env.example), mirroring the web
// app's NEXT_PUBLIC_* config 1:1.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// getReactNativePersistence ships only in firebase/auth's React Native build, which
// the default (browser) TS types don't surface. Require it so types stay happy while
// Metro resolves the correct native implementation at runtime.
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => any;
};

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth can only be called once per app; guard for Fast Refresh.
let _auth: Auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  _auth = getAuth(app);
}

export const auth: Auth = _auth;
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
