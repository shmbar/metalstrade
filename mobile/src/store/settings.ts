import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { Settings, CompanyData, DateSelect } from '@/data/types';
import { loadSettings, loadCompanyData } from '@/data/firestore';
import { db } from '@/lib/firebase';

const currentYearRange = (): DateSelect => {
  const y = new Date().getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31` };
};

/*
 * Account settings — the supplier, client, warehouse and currency lists every screen
 * turns ids into names with.
 *
 * They used to be fetched ONCE, right after sign-in, and never again. When that one
 * fetch failed (weak signal, a cold start before Firestore connected) the lists stayed
 * empty for the whole session while the persisted query cache still drew the figures —
 * so Cashflow → Stocks - Paid listed "b6f14654-c111-4905-…" where the warehouse
 * "Seagull" should be. A warehouse added on the web also never appeared until the app
 * was restarted. Now the lists:
 *   - are kept on the device per workspace, so names are there at launch and offline;
 *   - retry a failed fetch with backoff, and again on reconnect or return to the app;
 *   - follow the settings documents live, so a web edit lands without a restart.
 * The device copy is removed on sign-out with the rest of the cached ledger.
 */
const CACHE_PREFIX = 'ims-settings:';
const cacheKey = (uid: string) => `${CACHE_PREFIX}${uid}`;

interface SettingsState {
  settings: Settings;
  compData: CompanyData;
  dateSelect: DateSelect;
  /** lists are available (from the server or the device copy) */
  loaded: boolean;
  loading: boolean;
  settingsUid: string | null;
  setDateSelect: (d: DateSelect) => void;
  setYear: (year: number) => void;
  setSettings: (s: Settings) => void;
  setCompData: (c: CompanyData) => void;
  load: (uidCollection: string) => Promise<void>;
  /** Device copy → server fetch (retried) → live listener. Returns the stop function. */
  start: (uidCollection: string) => () => void;
  reset: () => void;
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;
const clearRetry = () => {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
};

const persist = (uid: string, settings: Settings, compData: CompanyData) =>
  AsyncStorage.setItem(cacheKey(uid), JSON.stringify({ settings, compData })).catch(() => {});

/** Drop every workspace's device copy — called on sign-out. */
export const clearSettingsCache = async () => {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(CACHE_PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    /* nothing cached */
  }
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: {},
  compData: {},
  dateSelect: currentYearRange(),
  loaded: false,
  loading: false,
  settingsUid: null,

  setDateSelect: (dateSelect) => set({ dateSelect }),
  setYear: (year) => set({ dateSelect: { start: `${year}-01-01`, end: `${year}-12-31` } }),
  setSettings: (settings) => {
    set({ settings });
    const { settingsUid, compData } = get();
    if (settingsUid) persist(settingsUid, settings, compData);
  },
  setCompData: (compData) => {
    set({ compData });
    const { settingsUid, settings } = get();
    if (settingsUid) persist(settingsUid, settings, compData);
  },

  load: async (uidCollection) => {
    if (!uidCollection) return;
    if (get().settingsUid && get().settingsUid !== uidCollection) {
      set({ settings: {}, compData: {}, loaded: false, settingsUid: null });
    }
    clearRetry();
    set({ loading: true });
    try {
      const [settings, compData] = await Promise.all([loadSettings(uidCollection), loadCompanyData(uidCollection)]);
      retryAttempt = 0;
      set({ settings: settings as Settings, compData: compData as CompanyData, loaded: true, loading: false, settingsUid: uidCollection });
      persist(uidCollection, settings as Settings, compData as CompanyData);
    } catch {
      set({ loading: false });
      // 2s, 4s, 8s … capped at a minute, for as long as this workspace is signed in.
      const delay = Math.min(60_000, 2_000 * 2 ** retryAttempt++);
      retryTimer = setTimeout(() => {
        if (get().settingsUid === uidCollection || !get().settingsUid) get().load(uidCollection);
      }, delay);
    }
  },

  start: (uidCollection) => {
    let stopped = false;
    // 1. The device copy, so the first frame already has names.
    AsyncStorage.getItem(cacheKey(uidCollection))
      .then((raw) => {
        if (stopped || !raw) return;
        const cached = JSON.parse(raw);
        const s = get();
        if (s.loaded && s.settingsUid === uidCollection) return; // the server beat the disk
        set({ settings: cached.settings || {}, compData: cached.compData || {}, loaded: true, settingsUid: uidCollection });
      })
      .catch(() => {});
    // 2. The server, retried until it answers.
    get().load(uidCollection);
    // 3. Live: a settings edit anywhere reaches this device.
    const follow = (name: 'settings' | 'cmpnyData') =>
      onSnapshot(
        doc(db, uidCollection, name),
        (snap) => {
          if (stopped || !snap.exists() || snap.metadata.hasPendingWrites) return;
          const data = snap.data() as any;
          const next = name === 'settings' ? { settings: data as Settings } : { compData: data as CompanyData };
          set({ ...next, loaded: true, settingsUid: uidCollection });
          const after = get();
          persist(uidCollection, after.settings, after.compData);
        },
        () => {} // permission/transport errors: the fetch-and-retry path still covers it
      );
    const unsubs = [follow('settings'), follow('cmpnyData')];
    return () => {
      stopped = true;
      clearRetry();
      unsubs.forEach((u) => u());
    };
  },

  reset: () => {
    clearRetry();
    retryAttempt = 0;
    set({ settings: {}, compData: {}, loaded: false, settingsUid: null, dateSelect: currentYearRange() });
  },
}));

export const selectCompanyRate = (s: SettingsState) => parseFloat(String(s.compData?.eurUsdRate)) || 0;
export const selectTermDays = (s: SettingsState) => {
  const t = parseInt(String(s.compData?.defaultTermDays), 10);
  return t > 0 ? t : 30;
};
export const selectLang = (s: SettingsState) => s.compData?.lng || 'English';
