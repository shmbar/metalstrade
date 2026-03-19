
import { useState, useMemo } from 'react';
import { saveDataSettings } from '../utils/utils';

// You can expand this hook with your actual settings logic as needed


function useSettingsState() {
    const [settings, setSettings] = useState({});
    const [compData, setCompData] = useState({ lng: 'English' });
    const [loading, setLoading] = useState(false);

    // Computed language value for easy access
    const ln = useMemo(() => compData?.lng || 'English', [compData?.lng]);

    // Date range state for date picker components
    const currentYear = new Date().getFullYear();
    const defaultDateSelect = {
        start: `${currentYear}-01-01`,
        end: `${currentYear}-12-31`
    };
    const [dateSelect, setDateSelect] = useState(defaultDateSelect);

    // Year state for navigating to specific year data
    const [dateYr, setDateYr] = useState(currentYear.toString());
    // Toast state for global notifications
    const [toast, setToast] = useState({ show: false, text: '', clr: 'success' });

    // Setter for updating settings
    // Called as updateSettings(newObj) for in-memory only
    // Called as updateSettings(uidCollection, newObj, key, save) to also persist to Firestore
    const updateSettings = async (uidOrObj, newObj, key, save) => {
        if (typeof uidOrObj === 'string' && newObj && key) {
            // 4-arg form: update state and persist full settings to 'settings' doc
            setSettings((prev) => {
                const merged = { ...prev, [key]: newObj };
                if (save) {
                    saveDataSettings(uidOrObj, 'settings', merged)
                        .then(() => setToast({ show: true, text: 'Data successfully saved', clr: 'success' }))
                        .catch(() => setToast({ show: true, text: 'Failed to save', clr: 'fail' }));
                }
                return merged;
            });
        } else {
            // 1-arg form: in-memory merge only
            setSettings((prev) => ({ ...prev, ...uidOrObj }));
        }
    };

    // Setter for updating compData (language, etc.)
    const updateCompData = (newData) => {
        setCompData((prev) => ({ ...prev, ...newData }));
    };

    // Save company data to Firestore
    const updateCompanyData = async (uidCollection) => {
        if (!uidCollection) return;
        try {
            await saveDataSettings(uidCollection, 'cmpnyData', compData);
            setToast({ show: true, text: 'Company data saved successfully!', clr: 'success' });
        } catch (error) {
            setToast({ show: true, text: 'Failed to save company data', clr: 'fail' });
        }
    };
    return {
        settings,
        updateSettings,
        compData,
        setCompData: updateCompData,
        updateCompanyData,
        loading,
        setLoading,
        toast,
        setToast,
        dateSelect,
        setDateSelect,
        dateYr,
        setDateYr,
        ln, // Computed language value for easy access
    };
}

export default useSettingsState;

