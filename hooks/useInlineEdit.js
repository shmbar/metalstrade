'use client';
import { useContext, useCallback } from 'react';
import { SettingsContext } from '../contexts/useSettingsContext';
import { UserAuth } from '../contexts/useAuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getTtl } from '../utils/languages';
import { bustLoadCache } from '../utils/loadCache';

const useInlineEdit = (dataType, setData) => {
    const { setToast, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();

    const updateField = useCallback(async (item, field, newValue) => {
        if (!uidCollection || !item?.id) {
            console.error('Missing uidCollection or item id');
            return false;
        }

        // Get year from item's date
        const year = item.dateRange?.startDate?.substring(0, 4) ||
            item.date?.substring(0, 4) ||
            new Date().getFullYear().toString();

        const collectionPath = `${dataType}_${year}`;

        try {
            // Update Firestore
            const docRef = doc(db, uidCollection, 'data', collectionPath, item.id);
            bustLoadCache(); // direct write (bypasses utils.js) — clear the page-load cache
            await updateDoc(docRef, { [field]: newValue });

            // Update local state
            if (setData) {
                setData(prevData =>
                    prevData.map(d =>
                        d.id === item.id ? { ...d, [field]: newValue } : d
                    )
                );
            }

            // Show success toast
            setToast({
                show: true,
                text: getTtl('Saved successfully', ln),
                clr: 'success'
            });

            return true;
        } catch (error) {
            console.error('Error updating field:', error);
            setToast({
                show: true,
                text: getTtl('Error saving. Please try again.', ln),
                clr: 'fail'
            });
            return false;
        }
    }, [uidCollection, dataType, setData, setToast, ln]);

    return { updateField };
};

export default useInlineEdit;
