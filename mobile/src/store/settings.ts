import { create } from 'zustand';
import { Settings, CompanyData, DateSelect } from '@/data/types';
import { loadSettings, loadCompanyData } from '@/data/firestore';

// Default date window = current calendar year, matching the web app's behavior
// when no explicit range is chosen.
const currentYearRange = (): DateSelect => {
  const y = new Date().getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31` };
};

interface SettingsState {
  settings: Settings;
  compData: CompanyData;
  dateSelect: DateSelect;
  loaded: boolean;
  loading: boolean;
  // The uidCollection the CURRENT settings/compData were loaded for. Lets load()
  // tell "still on the same account, a background refresh" apart from "switched
  // account, this blob is stale" — see the guard below.
  settingsUid: string | null;
  setDateSelect: (d: DateSelect) => void;
  setYear: (year: number) => void;
  setSettings: (s: Settings) => void;
  setCompData: (c: CompanyData) => void;
  load: (uidCollection: string) => Promise<void>;
  reset: () => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: {},
  compData: {},
  dateSelect: currentYearRange(),
  loaded: false,
  loading: false,
  settingsUid: null,

  setDateSelect: (dateSelect) => set({ dateSelect }),
  setYear: (year) => set({ dateSelect: { start: `${year}-01-01`, end: `${year}-12-31` } }),
  setSettings: (settings) => set({ settings }),
  setCompData: (compData) => set({ compData }),

  load: async (uidCollection) => {
    if (!uidCollection) return;
    // Switching account (IMS <-> GIS, or any re-auth): the settings sitting in the
    // store right now belong to the OLD uidCollection. Every screen gates its
    // queries on `loaded`, so leaving it true while the new account's blob is still
    // in flight let those queries run immediately against the new account's
    // contracts/stock lots but the OLD account's warehouse/supplier/client ids —
    // an id that is perfectly valid in one workspace resolves nowhere in the
    // other, so a name lookup falls through to printing the raw id (reported on
    // Cashflow's "Stocks - paid/unpaid" warehouse rows). Clearing synchronously,
    // before the async fetch even starts, closes that window instead of just
    // shrinking it.
    if (get().settingsUid && get().settingsUid !== uidCollection) {
      set({ settings: {}, compData: {}, loaded: false });
    }
    set({ loading: true });
    try {
      const [settings, compData] = await Promise.all([
        loadSettings(uidCollection),
        loadCompanyData(uidCollection),
      ]);
      set({
        settings: settings as Settings,
        compData: compData as CompanyData,
        loaded: true,
        loading: false,
        settingsUid: uidCollection,
      });
    } catch {
      set({ loading: false });
    }
  },

  reset: () => set({ settings: {}, compData: {}, loaded: false, settingsUid: null, dateSelect: currentYearRange() }),
}));

// Derived helpers (mirror dashboard/page.js):
//  - companyRate: one standard EUR→USD rate (Settings → General); 0 = use per-contract rate.
//  - termDays: default payment term in days for overdue detection (default 30).
export const selectCompanyRate = (s: SettingsState) => parseFloat(String(s.compData?.eurUsdRate)) || 0;
export const selectTermDays = (s: SettingsState) => {
  const t = parseInt(String(s.compData?.defaultTermDays), 10);
  return t > 0 ? t : 30;
};
export const selectLang = (s: SettingsState) => s.compData?.lng || 'English';
