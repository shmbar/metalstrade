'use client';
import { useContext } from 'react';
import { SettingsContext } from '@contexts/useSettingsContext';
import { getTtl } from '@utils/languages';
import ActivityLog from '@components/ActivityLog';

const ActivityPage = () => {
    const { ln } = useContext(SettingsContext);

    return (
        <div className="w-full" style={{ background: '#f8fbff' }}>
            <div className="mx-auto w-full max-w-5xl px-1 md:px-2 pb-4 mt-[72px]">
                <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] w-full bg-[#f8fbff]">
                    <div className="pb-2">
                        <h1 className="text-[var(--chathams-blue)] responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
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
