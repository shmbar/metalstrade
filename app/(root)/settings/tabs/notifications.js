'use client';
import { useContext } from 'react';
import { Switch } from '@headlessui/react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@contexts/useNotificationContext';
import { SettingsContext } from '@contexts/useSettingsContext';
import { CATEGORY_KEYS, NOTIFICATION_CATEGORIES, OTHER_CATEGORY, enabledCategoryCount, isCategoryEnabled } from '@utils/notificationPrefs';

/*
 * Settings → Notifications. Each person chooses which kinds of notification they receive.
 *
 * The switches write one document per person (utils/notificationPrefs.js) that the web bell,
 * the mobile app and the phone's push notifications all read — turning Shipments off here
 * turns it off on the phone too. A category that is off gives no badge, no sound, no pop-up
 * and no push; its items can still be opened from that category's chip in the bell.
 */
const ROWS = [...NOTIFICATION_CATEGORIES, OTHER_CATEGORY];

function Toggle({ checked, onChange, label }) {
    return (
        <Switch
            checked={checked}
            onChange={onChange}
            aria-label={label}
            className={`${checked ? 'bg-[var(--brand)]' : 'bg-[var(--line-strong)]'} relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]`}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--bg-card)] shadow transition duration-150`}
            />
        </Switch>
    );
}

const NotificationSettings = () => {
    const { prefs, setCategoryEnabled, setAllEnabled } = useNotifications() || {};
    const { setToast } = useContext(SettingsContext);

    const saved = (ok) => setToast?.({ show: true, text: ok === false ? 'Failed to save' : 'Data successfully saved', clr: ok === false ? 'fail' : 'success' });
    const change = async (key, on) => saved(await setCategoryEnabled?.(key, on));
    // One switch for everything, like a messaging app's settings (and the mobile screen).
    const onCount = enabledCategoryCount(prefs);
    const allOn = onCount === CATEGORY_KEYS.length;
    const changeAll = async (on) => saved(await setAllEnabled?.(on));

    return (
        <div className='p-2 w-full max-w-2xl'>
            <div className='flex items-start gap-2 mb-3'>
                <Bell className='w-4 h-4 mt-0.5 text-[var(--brand)]' />
                <div>
                    <p className='responsiveTextTitle font-semibold text-[var(--ink)]'>Notification settings</p>
                    <p className='responsiveText text-[var(--ink-muted)]'>
                        Choose what you are notified about. Your choices apply here and in the mobile app, including push notifications.
                    </p>
                </div>
            </div>
            <div className='rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--bg-card)] shadow-card divide-y divide-[var(--line)]'>
                <div className='flex items-center gap-3 px-3 py-2 bg-[var(--bg-subtle)]'>
                    <div className='flex-1 min-w-0'>
                        <p className='responsiveTextInput font-semibold text-[var(--ink)]'>All notifications</p>
                        <p className='responsiveText text-[var(--ink-muted)]'>
                            {allOn ? 'Every kind is on' : onCount === 0 ? 'Everything is off' : `${onCount} of ${CATEGORY_KEYS.length} kinds on`}
                        </p>
                    </div>
                    <Toggle checked={allOn} onChange={changeAll} label='All notifications' />
                </div>
                {ROWS.map((c) => {
                    const on = isCategoryEnabled(prefs, c.key);
                    return (
                        <div key={c.key} className='flex items-center gap-3 px-3 py-2'>
                            <div className='flex-1 min-w-0'>
                                <p className='responsiveTextInput font-medium text-[var(--ink)]'>{c.label}</p>
                                <p className='responsiveText text-[var(--ink-muted)]'>{c.description}</p>
                            </div>
                            <Toggle checked={on} onChange={(v) => change(c.key, v)} label={`${c.label} notifications`} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default NotificationSettings;
