import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { saveDataSettings } from '@/data/writes';

// Persist edits to the account settings doc / company-data doc, mirroring the web
// settings tabs (which call saveDataSettings on 'settings' / 'cmpnyData').
export function useSettingsEdit() {
  const { uidCollection } = useAuth();
  const { settings, compData, setSettings, setCompData } = useSettings();

  // Replace a category's array (e.g. Supplier → settings.Supplier.Supplier) and save.
  const saveEntities = async (type: string, arr: any[]) => {
    if (!uidCollection) throw new Error('Not authenticated');
    const next = { ...settings, [type]: { ...(settings as any)[type], [type]: arr } };
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

  return { saveEntities, saveCompany };
}
