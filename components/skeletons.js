'use client';

// First-paint loading skeletons — replace the full-screen video loader so pages
// show their real structure instantly while settings/data stream in. Purely
// presentational: no data, no contexts, no logic. Shimmer comes from the global
// `.skel` class (globals.css). Widths are inline styles on purpose — Tailwind
// can't JIT-compile runtime-generated width classes.

const Bar = ({ w = '100%', h = 12, className = '' }) => (
    <div className={`skel rounded-md ${className}`} style={{ width: w, height: h }} />
);

// Generic table page: title, toolbar pills, row bars, footer strip.
export const TableSkeleton = ({ rows = 9, title = true }) => (
    <div className="w-full" aria-busy="true" aria-label="Loading">
        {title && (
            <div className="pt-8 pb-3 px-1">
                <Bar w={150} h={18} className="mb-2" />
                <Bar w={95} h={10} />
            </div>
        )}
        <div className="rounded-2xl bg-white shadow-md border border-[var(--selago)] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--selago)] flex-wrap">
                <Bar w={140} h={26} className="rounded-full" />
                <Bar w={95} h={26} className="rounded-full" />
                <Bar w={115} h={26} className="rounded-full" />
                <div className="flex-1 min-w-[10px]" />
                <Bar w={150} h={26} className="rounded-full" />
            </div>
            <div className="px-4 py-1">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f1f6fc] last:border-0">
                        <Bar w="8%" h={11} />
                        <Bar w="10%" h={11} />
                        <Bar w="14%" h={11} />
                        <Bar w="10%" h={11} />
                        <Bar w="12%" h={11} />
                        <Bar w="14%" h={11} />
                        <Bar w="10%" h={11} />
                        <Bar w="9%" h={16} className="rounded-full" />
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--selago)]">
                <Bar w={90} h={10} />
                <Bar w={160} h={22} className="rounded-full" />
                <Bar w={70} h={10} />
            </div>
        </div>
    </div>
);

// Dashboard / cashflow style page: stat-card row + two content panels.
export const CardsSkeleton = () => (
    <div className="w-full" aria-busy="true" aria-label="Loading">
        <div className="pt-8 pb-3 px-1">
            <Bar w={150} h={18} className="mb-2" />
            <Bar w={95} h={10} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white shadow-md border border-[var(--selago)] p-4">
                    <Bar w="55%" h={10} className="mb-3" />
                    <Bar w="75%" h={20} className="mb-2" />
                    <Bar w="40%" h={9} />
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 rounded-2xl bg-white shadow-md border border-[var(--selago)] p-5">
                <Bar w={160} h={13} className="mb-5" />
                <div className="flex items-end gap-2" style={{ height: 180 }}>
                    {[60, 100, 75, 130, 90, 150, 110, 70, 125, 95, 140, 85].map((h, i) => (
                        <div key={i} className="skel rounded-t-md flex-1" style={{ height: h }} />
                    ))}
                </div>
            </div>
            <div className="rounded-2xl bg-white shadow-md border border-[var(--selago)] p-5">
                <Bar w={130} h={13} className="mb-5" />
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5">
                        <div className="skel rounded-full" style={{ width: 28, height: 28 }} />
                        <Bar w="55%" h={11} />
                        <div className="flex-1" />
                        <Bar w="18%" h={11} />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const Skeletons = { TableSkeleton, CardsSkeleton };
export default Skeletons;
