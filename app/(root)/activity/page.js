'use client';
import { useContext } from 'react';
import { SettingsContext } from '@contexts/useSettingsContext';
import { getTtl } from '@utils/languages';
import ActivityLog from '@components/ActivityLog';

const ActivityPage = () => {
    const { ln } = useContext(SettingsContext);

    return (
        <div className="w-full" style={{ background: 'var(--bg-subtle)' }}>
            <div className="mx-auto w-full max-w-5xl px-1 md:px-2 pb-4 mt-[72px]">
                <div className="page-card rounded-2xl p-3 sm:p-5 mt-8 border border-[var(--line)] shadow-card w-full bg-[var(--bg-card)]">
                    <div className="pb-2">
                        <h1 className="text-[var(--ink)] responsiveTextTitle">
                            {getTtl('Activity Log', ln) || 'Activity Log'}
                        </h1>
                        <p className="responsiveText text-[var(--regent-gray)] pl-3 mt-0.5">
                            Who did what, and when — across contracts, invoices, expenses and stock.
                        </p>
                    </div>
                    <ActivityLog showFilters />
                </div>
            </div>
        </div>
    );
};

export default ActivityPage;
