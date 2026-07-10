// Short-TTL in-memory cache for the heavy per-page Firestore loaders, so hopping
// between pages doesn't re-await a full server round-trip every time.
//
// Safety model (read-side only — writes are NEVER cached):
// - 45s TTL: even a missed invalidation is visible for at most 45 seconds.
// - utils.js shadows setDoc/updateDoc/deleteDoc/writeBatch so EVERY write that
//   goes through the data layer clears this cache first; the handful of files
//   that write to Firestore directly call bustLoadCache() themselves.
// - Regaining tab focus clears the cache, so returning to the app always reads
//   fresh on the next navigation.
// - Results are shallow-copied per consumer so no page holds the cached array.
// - In-flight requests are shared: concurrent same-key loads hit the server once.

const TTL_MS = 45_000;
const store = new Map();

export const cacheKey = (...parts) => parts.map(p => String(p ?? '')).join('§');

export const cachedLoad = async (key, fetcher) => {
  const hit = store.get(key);
  if (hit && Date.now() - hit.t < TTL_MS) {
    const data = await hit.p;
    return Array.isArray(data) ? [...data] : data;
  }
  const p = Promise.resolve().then(fetcher);
  store.set(key, { t: Date.now(), p });
  try {
    const data = await p;
    return Array.isArray(data) ? [...data] : data;
  } catch (err) {
    store.delete(key); // never cache a failure
    throw err;
  }
};

export const bustLoadCache = () => { store.clear(); };

if (typeof window !== 'undefined') {
  window.addEventListener('focus', bustLoadCache);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') bustLoadCache();
  });
}
