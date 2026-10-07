'use client';
import { useContext, useState } from 'react';
import { SettingsContext } from '@contexts/useSettingsContext';
import { getTtl } from '@utils/languages';
import ActivityLog from '@components/ActivityLog';
import PresencePanel from '@components/PresencePanel';
import ActivitySummary from '@components/ActivitySummary';

const TABS = [
    { id: 'feed', label: 'Activity', blurb: 'Who did what, and when — across contracts, invoices, expenses and stock.' },
    { id: 'online', label: "Who's online", blurb: 'Who is signed in right now, and when everyone was last here.' },
    { id: 'summary', label: 'Summary', blurb: 'Most active users per week, their share of the work, and how often people sign in.' },
];

const ActivityPage = () => {
    const { ln } = useContext(SettingsContext);
    const [tab, setTab] = useState('feed');
    const active = TABS.find(t => t.id === tab) || TABS[0];

    return (
        <div className="w-full" style={{ background: 'var(--bg-subtle)' }}>
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                <div className="page-card rounded-2xl p-3 sm:p-5 mt-8 border border-[var(--line)] shadow-card w-full bg-[var(--bg-card)]">
                    <div className="pb-2">
                        <h1 className="text-display">
                            {getTtl('Activity Log', ln) || 'Activity Log'}
                        </h1>
                        <p className="responsiveText text-[var(--regent-gray)] pl-3 mt-0.5">
                            {active.blurb}
                        </p>
                    </div>

                    {/* Same segmented control the Stocks page uses, so the two read as one app. */}
                    <div className="seg-switch w-fit mb-1">
                        {TABS.map(t => (
                            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Each panel loads its own data, so mounting only the visible one keeps
                        a tab nobody opened from pulling the whole activity collection. */}
                    {tab === 'feed' && <ActivityLog showFilters />}
                    {tab === 'online' && <PresencePanel />}
                    {tab === 'summary' && <ActivitySummary />}
                </div>
            </div>
        </div>
    );
};

export default ActivityPage;
