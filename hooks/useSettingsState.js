
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
    const updateSettings = (newSettings) => {
        setSettings((prev) => ({ ...prev, ...newSettings }));
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

