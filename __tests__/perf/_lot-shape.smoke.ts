import { describe, it, expect } from 'vitest';
const completeUserEmail = (u: string) => (u.includes('@') ? u : u.slice(-3) === 'ims' ? u + '@ims-metals.com' : u + '@gismetals.com');
describe.skipIf(!process.env.SMOKE_EMAIL)('lot shape', () => {
  it('lists fields and any timestamp', async () => {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
    const F = await import('firebase/firestore');
    const app = initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY, authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    } as any, 'lot-shape');
    const cred = await signInWithEmailAndPassword(getAuth(app), completeUserEmail(process.env.SMOKE_EMAIL || ''), process.env.SMOKE_PASSWORD || '');
    const uid = (await cred.user.getIdTokenResult()).claims.uidCollection as string;
    const db = F.getFirestore(app);
    const snap = await F.getDocs(F.query(F.collection(db, uid, 'data', 'stocks'), F.limit(400)));
    const freq: Record<string, number> = {};
    let biggest = { id: '', kb: 0, keys: [] as string[] };
    snap.docs.forEach((d: any) => {
      const data = d.data();
      Object.keys(data).forEach((k) => (freq[k] = (freq[k] || 0) + 1));
      const kb = JSON.stringify(data).length / 1024;
      if (kb > biggest.kb) biggest = { id: d.id, kb, keys: Object.keys(data) };
    });
    const out = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + '(' + n + ')');
    console.log(String.fromCharCode(10) + '  fields: ' + out.join(' '));
    console.log('  biggest doc ' + biggest.kb.toFixed(1) + ' KB keys=' + biggest.keys.join(','));
    const sample = snap.docs[0].data();
    console.log('  sample: ' + JSON.stringify(sample).slice(0, 700));
    expect(snap.docs.length).toBeGreaterThan(0);
  }, 300_000);
});
