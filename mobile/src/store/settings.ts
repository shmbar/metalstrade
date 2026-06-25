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
  setDateSelect: (d: DateSelect) => void;
  setYear: (year: number) => void;
  setSettings: (s: Settings) => void;
  setCompData: (c: CompanyData) => void;
  load: (uidCollection: string) => Promise<void>;
  reset: () => void;
}

export const useSettings = create<SettingsState>((set) => ({
  settings: {},
  compData: {},
  dateSelect: currentYearRange(),
  loaded: false,
  loading: false,

  setDateSelect: (dateSelect) => set({ dateSelect }),
  setYear: (year) => set({ dateSelect: { start: `${year}-01-01`, end: `${year}-12-31` } }),
  setSettings: (settings) => set({ settings }),
  setCompData: (compData) => set({ compData }),

  load: async (uidCollection) => {
    if (!uidCollection) return;
    set({ loading: true });
    try {
      const [settings, compData] = await Promise.all([
        loadSettings(uidCollection),
        loadCompanyData(uidCollection),
      ]);
      set({ settings: settings as Settings, compData: compData as CompanyData, loaded: true, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  reset: () => set({ settings: {}, compData: {}, loaded: false, dateSelect: currentYearRange() }),
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
