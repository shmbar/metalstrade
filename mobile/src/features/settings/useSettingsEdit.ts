import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { saveDataSettings } from '@/data/writes';
import { useShallow } from 'zustand/react/shallow';

// Persist edits to the account settings doc / company-data doc, mirroring the web
// settings tabs (which call saveDataSettings on 'settings' / 'cmpnyData').
export function useSettingsEdit() {
  const uidCollection = useAuth((s) => s.uidCollection);
  const { settings, compData, setSettings, setCompData } = useSettings(useShallow((s) => ({ settings: s.settings, compData: s.compData, setSettings: s.setSettings, setCompData: s.setCompData })));

  // Replace a category's array (e.g. Supplier → settings.Supplier.Supplier) and save.
  const saveEntities = async (type: string, arr: any[]) => {
    if (!uidCollection) throw new Error('Not authenticated');
    const next = { ...settings, [type]: { ...(settings as any)[type], [type]: arr } };
    await saveDataSettings(uidCollection, 'settings', next);
    setSettings(next);
  };

  // Replace one whole settings section — web updateSettings(uid, obj, key, true), used
  // for sections that are not a list (ReminderCadence: { days }).
  const saveSection = async (key: string, obj: any) => {
    if (!uidCollection) throw new Error('Not authenticated');
    const next = { ...settings, [key]: obj };
    await saveDataSettings(uidCollection, 'settings', next);
    setSettings(next);
  };

  // Patch company data (EUR rate, default term, language…).
  const saveCompany = async (patch: Record<string, any>) => {
    if (!uidCollection) throw new Error('Not authenticated');
    const next = { ...compData, ...patch };
    await saveDataSettings(uidCollection, 'cmpnyData', next);
    setCompData(next);
  };

  return { saveEntities, saveSection, saveCompany };
}
