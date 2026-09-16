/** READ-ONLY: what a teammate's save used to cost vs what it costs with a live listener. */
import { describe, it, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
const completeUserEmail = (u: string) => (u.includes('@') ? u : u.slice(-3) === 'ims' ? u + '@ims-metals.com' : u + '@gismetals.com');

describe.skipIf(!process.env.SMOKE_EMAIL)('stock ledger', () => {
  it('compares a full re-read with a live listener', async () => {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
    const F = await import('firebase/firestore');
    const app = initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY, authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    } as any, 'ledger-live');
    const cred = await signInWithEmailAndPassword(getAuth(app), completeUserEmail(process.env.SMOKE_EMAIL || ''), process.env.SMOKE_PASSWORD || '');
    const uid = (await cred.user.getIdTokenResult()).claims.uidCollection as string;
    const db = F.getFirestore(app);
    const ref = F.collection(db, uid, 'data', 'stocks');

    const t0 = performance.now();
    const first = await new Promise<any>((res) => {
      const un = F.onSnapshot(ref, (snap: any) => { un(); res(snap); });
    });
    const firstMs = performance.now() - t0;

    // The old behaviour: any write anywhere invalidated the ledger and re-read it whole.
    const t1 = performance.now();
    const re = await F.getDocs(ref);
    const reReadMs = performance.now() - t1;

    console.log(String.fromCharCode(10) +
      '  first live snapshot (once per session): ' + Math.round(firstMs) + ' ms, ' + first.docs.length + ' docs' + String.fromCharCode(10) +
      '  OLD full re-read, charged on EVERY save: ' + Math.round(reReadMs) + ' ms, ' + re.docs.length + ' docs' + String.fromCharCode(10) +
      '  NEW cost per save: only the changed documents arrive on the open listener');
    expect(first.docs.length).toBe(re.docs.length);
  }, 300_000);
});
