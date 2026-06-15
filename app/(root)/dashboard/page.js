
'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import VideoLoader from '@components/videoLoader';
import { UserAuth } from "@contexts/useAuthContext"
import { SettingsContext } from "@contexts/useSettingsContext";
import Toast from '@components/toast.js'
import { loadData, buildInvoiceIndex, contractInvoicesFromIndex, loadCompanyExpenses } from '@utils/utils'
import { receivables as financeReceivables, agingBuckets } from '@utils/finance'
import { setMonthsInvoices, calContracts } from './funcs'
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';
import TooltipComp from '@components/tooltip';
// MarketsTicker pulls in ~250 inlined flag images (react-world-flags); load it
// off the first-paint critical path so it doesn't bloat the dashboard bundle.
const MarketsTicker = dynamic(() => import('@components/Dashboard/MarketsTicker'), { ssr: false });
import AIAlertsBar from '@components/Dashboard/AIAlertsBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';

import { HorizontalBar } from './charts';

// chart.js + react-chartjs-2 are loaded on demand (not in the first-load bundle).
const Line = dynamic(() => import('./LazyCharts').then((mod) => mod.Line), { ssr: false });
const Doughnut = dynamic(() => import('./LazyCharts').then((mod) => mod.Doughnut), { ssr: false });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtMoney = (n, decimals = 2) => {
  const num = typeof n === "string"
    ? Number(n.replace(/[^0-9.-]+/g, ""))
    : Number(n);

  if (!Number.isFinite(num)) return (0).toFixed(decimals);

  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const fmtK = (n, decimals = 2) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return `$0.00K`;
  return `$${fmtMoney(num / 1000, decimals)}K`;
};

const fmtAutoKM = (n, decimals = 2) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$0";

  if (Math.abs(num) >= 1_000_000) {
    return `$${fmtMoney(num / 1_000_000, decimals)}M`;
  }

  if (Math.abs(num) >= 1_000) {
    return `$${fmtMoney(num / 1_000, decimals)}K`;
  }

  return `$${fmtMoney(num, decimals)}`;
};

const sumObj = (obj) => Object.values(obj || {}).reduce((a, v) => a + (Number(v) || 0), 0);

function CardShell({ className = "", children }) {
  return (
    <m.div
      className={`bg-white rounded-2xl border border-[#e6eef8] shadow-sm ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ boxShadow: '0 10px 30px rgba(16,58,122,0.08)' }}
    >
      {children}
    </m.div>
  );
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h3 className="responsiveTextTitle font-semibold font-poppins text-[var(--chathams-blue)]">{title}</h3>
        {subtitle && <p className="responsiveTextTable text-[var(--regent-gray)] mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// Month-over-month delta from a monthly series: compares the latest non-zero
// month to the most recent prior month that has data. Returns null when there
// isn't enough data to compute a meaningful change.
function computeTrend(series) {
  if (!Array.isArray(series) || series.length < 2) return null;
  let last = -1;
  for (let i = series.length - 1; i >= 0; i--) {
    if (Number.isFinite(series[i]) && series[i] !== 0) { last = i; break; }
  }
  if (last <= 0) return null;
  let prev = -1;
  for (let i = last - 1; i >= 0; i--) {
    if (Number.isFinite(series[i])) { prev = i; break; }
  }
  if (prev < 0) return null;
  const before = series[prev];
  if (!before) return null;
  const pct = ((series[last] - before) / Math.abs(before)) * 100;
  if (!Number.isFinite(pct)) return null;
  return { pct, up: pct >= 0 };
}

function StatKpiCard({
  title,
  value,
  chartData,
  accent = '#2563eb',
  icon,
  goodWhenUp = true,
}) {
  const series = useMemo(
    () => (Array.isArray(chartData) ? chartData : Object.values(chartData || {})).map(Number),
    [chartData]
  );
  const trend = useMemo(() => computeTrend(series), [series]);
  const good = trend ? trend.up === goodWhenUp : true;
  const deltaColor = good ? '#16a34a' : '#dc2626';
  const deltaBg = good ? '#dcfce7' : '#fee2e2';

  return (
    <m.div
      className="relative h-full min-h-[140px] rounded-xl bg-white border border-[#e6eef8] shadow-sm flex flex-col overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: '0 10px 30px rgba(16,58,122,0.10)' }}
    >
      <div className="p-3 flex flex-col h-full">
        {/* Icon tile + title */}
        <div className="flex items-center gap-2">
          {icon && (
            <span
              className="inline-flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: `${accent}1A`, color: accent, width: 30, height: 30 }}
            >
              {icon}
            </span>
          )}
          <span className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">
            {title}
          </span>
        </div>

        {/* Hero number */}
        <div
          className="mt-2 font-semibold text-[var(--port-gore)] leading-none"
          style={{ fontSize: 'clamp(1.15rem, 0.9rem + 0.7vw, 1.6rem)' }}
        >
          {value}
        </div>

        {/* Trend delta */}
        <div className="mt-1.5 flex items-center gap-1.5" style={{ minHeight: 16 }}>
          {trend && (
            <>
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold"
                style={{ background: deltaBg, color: deltaColor, fontSize: '0.6rem' }}
              >
                {trend.up ? '▲' : '▼'} {Math.abs(trend.pct).toFixed(1)}%
              </span>
              <span className="text-[var(--regent-gray)]" style={{ fontSize: '0.58rem' }}>vs prev mo</span>
            </>
          )}
        </div>

        {/* Sparkline */}
        <div className="mt-auto h-[30px] -mx-1">
          <Line
            data={{
              labels: series.slice(0, 12).map((_, i) => i),
              datasets: [{
                data: series.slice(0, 12),
                borderColor: accent,
                backgroundColor: `${accent}1F`,
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                fill: true,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
              },
              scales: {
                x: { display: false },
                y: { display: false }
              }
            }}
          />
        </div>
      </div>
    </m.div>
  );
}

// Outstanding receivables split by shipment finalization. "Finalized" = the
// final invoice has been issued (shipData.fnlzing === '4568'); "Provisional" =
// balances still before the final invoice. Lets the team see, at a glance, how
// much of what's owed is locked-in vs still subject to final-invoice changes.
function ReceivablesSplitCard({ byCur = {} }) {
  // Currency-aware compact formatter — never sums across currencies.
  const fmtCurKM = (cur, n) => {
    const s = cur === 'us' ? '$' : cur === 'eu' ? '€' : '';
    const num = Number(n) || 0;
    const a = Math.abs(num);
    if (a >= 1e6) return `${s}${(num / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${s}${(num / 1e3).toFixed(2)}K`;
    return `${s}${num.toFixed(2)}`;
  };

  const curs = Object.keys(byCur).filter(c => {
    const d = byCur[c];
    return (d.finalized + d.provisional) > 0.005 || (d.finalizedCount + d.provisionalCount) > 0;
  });
  const finCount = curs.reduce((s, c) => s + byCur[c].finalizedCount, 0);
  const provCount = curs.reduce((s, c) => s + byCur[c].provisionalCount, 0);
  const totalCount = finCount + provCount;
  // Proportion bar is by invoice COUNT (currency-agnostic), so amounts in different
  // currencies are never added together.
  const pctFinal = totalCount > 0 ? (finCount / totalCount) * 100 : 0;

  const totalsLine = curs.length
    ? curs.map(c => fmtCurKM(c, byCur[c].finalized + byCur[c].provisional))
    : ['$0.00'];
  const amountsFor = (key) => {
    const list = curs.filter(c => byCur[c][key] > 0.005).map(c => fmtCurKM(c, byCur[c][key]));
    return list.length ? list : ['$0.00'];
  };

  return (
    <m.div
      className="relative rounded-xl bg-white border border-[#e6eef8] shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: '0 10px 30px rgba(16,58,122,0.10)' }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: '#2563eb1A', color: '#2563eb', width: 30, height: 30 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 7h18v10H3z" stroke="currentColor" strokeWidth="2" /><path d="M3 11h18" stroke="currentColor" strokeWidth="2" /></svg>
            </span>
            <span className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">Outstanding Receivables</span>
          </div>
          <div className="text-right flex-shrink-0">
            {totalsLine.map((t, i) => (
              <div key={i} className="font-semibold text-[var(--port-gore)] leading-tight" style={{ fontSize: 'clamp(0.95rem, 0.8rem + 0.5vw, 1.35rem)' }}>{t}</div>
            ))}
          </div>
        </div>

        {/* Proportion bar by invoice count — emerald (finalized) over amber (provisional) */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#fde68a' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pctFinal}%`, backgroundColor: '#10b981' }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-2.5" style={{ backgroundColor: '#ecfdf5', boxShadow: 'inset 0 0 0 1px #a7f3d0' }}>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: '#10b981' }} />
              <span className="text-[0.6rem] font-semibold tracking-wide" style={{ color: '#047857' }}>FINALIZED</span>
            </div>
            <div className="mt-1 leading-tight" style={{ color: '#047857' }}>
              {amountsFor('finalized').map((a, i) => (
                <div key={i} className="font-semibold" style={{ fontSize: 'clamp(0.9rem, 0.78rem + 0.4vw, 1.15rem)' }}>{a}</div>
              ))}
            </div>
            <div className="text-[0.58rem] text-[var(--regent-gray)] mt-1">{finCount} invoice{finCount === 1 ? '' : 's'} · after final invoice</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ backgroundColor: '#fffbeb', boxShadow: 'inset 0 0 0 1px #fde68a' }}>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: '#f59e0b' }} />
              <span className="text-[0.6rem] font-semibold tracking-wide" style={{ color: '#b45309' }}>PROVISIONAL</span>
            </div>
            <div className="mt-1 leading-tight" style={{ color: '#b45309' }}>
              {amountsFor('provisional').map((a, i) => (
                <div key={i} className="font-semibold" style={{ fontSize: 'clamp(0.9rem, 0.78rem + 0.4vw, 1.15rem)' }}>{a}</div>
              ))}
            </div>
            <div className="text-[0.58rem] text-[var(--regent-gray)] mt-1">{provCount} invoice{provCount === 1 ? '' : 's'} · before final invoice</div>
          </div>
        </div>
      </div>
    </m.div>
  );
}

// Ranking list (Contracts / Consignees) — avatar + animated progress bar per row.
function RankingList({ labels = [], data = [], title, subtitle, totalValue }) {
  const colorPalette = [
    '#38BDF8', '#22B0F0', '#7DD3F8', '#4F46E5',
    '#7C6FE0', '#1477C0', '#2D3FB8', '#6366F1',
    '#0A5EA8', '#8B7FE8'
  ];
  const avatarSize = 26;
  const getInitials = (name = '') =>
    name.toString().split(' ').map((s) => s[0] || '').slice(0, 2).join('').toUpperCase();
  const rowCount = labels.length || 1;
  const barHeight = Math.max(14, Math.min(28, Math.round(28 - rowCount * 1.5)));
  const max = Math.max(...(data.length ? data : [1]), 1);

  return (
    <CardShell>
      <div className="p-4">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          right={
            <div className="text-right flex-shrink-0">
              <div className="responsiveTextTable text-[var(--regent-gray)]">Total Value</div>
              <span className="font-semibold text-[var(--chathams-blue)]">{fmtAutoKM(totalValue)}</span>
            </div>
          }
        />

        {/* Column headers */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-[116px] font-medium text-[var(--regent-gray)] uppercase tracking-wide flex-shrink-0 whitespace-nowrap" style={{ fontSize: '0.62rem' }}>Name</div>
          <div className="flex-1 font-medium text-[var(--regent-gray)] uppercase tracking-wide text-center" style={{ fontSize: '0.62rem' }}>Contribution Share (0 – 1.0)</div>
          <div className="w-16 text-right font-medium text-[var(--regent-gray)] uppercase tracking-wide flex-shrink-0" style={{ fontSize: '0.62rem' }}>Value</div>
        </div>

        <div className="overflow-y-auto custom-scroll" style={{ maxHeight: 360 }}>
          {labels.map((lbl, idx) => {
            const value = data[idx] || 0;
            const pct = max > 0 ? (value / max) * 100 : 0;
            const color = colorPalette[idx % colorPalette.length];
            return (
              <m.div
                key={idx}
                className="flex items-center gap-2 mb-0.5"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
              >
                {/* Avatar */}
                <m.div
                  className="flex items-center justify-center rounded-full font-medium text-white flex-shrink-0"
                  style={{ fontSize: '0.62rem', width: avatarSize, height: avatarSize, background: color }}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {getInitials(lbl)}
                </m.div>

                {/* Name */}
                <div className="w-20 responsiveText text-[var(--port-gore)] truncate flex-shrink-0">{lbl}</div>

                {/* Bar */}
                <div className="flex-1 min-w-0">
                  <div className="w-full bg-[#eef3f9] rounded-full overflow-hidden" style={{ height: `${barHeight}px` }}>
                    <m.div
                      className="h-full flex items-center pl-2"
                      style={{ width: `${pct}%`, background: color, minWidth: '42px', borderRadius: '0 9999px 9999px 0', transformOrigin: 'left' }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5, delay: idx * 0.04, ease: 'easeOut' }}
                    >
                      <span className="font-medium text-white/95 leading-none" style={{ fontSize: '0.58rem' }}>
                        {(max > 0 ? value / max : 0).toFixed(2)}
                      </span>
                    </m.div>
                  </div>
                </div>

                {/* Value */}
                <div className="w-16 text-right responsiveText text-[var(--port-gore)] flex-shrink-0">{fmtAutoKM(value)}</div>
              </m.div>
            );
          })}
        </div>
      </div>
    </CardShell>
  );
}

// Per-MT unit economics — 4-up strip.
function PerMtStrip({ totalMT, avgCostPerMT, avgExpensePerMT, avgProfitPerMT, avgFreightPerMT }) {
  const profitColor = avgProfitPerMT >= 0 ? '#16a34a' : '#dc2626';

  const metrics = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="7" width="20" height="14" rx="2" stroke="#16a34a" strokeWidth="2" fill="#dcfce7" />
          <path d="M8 11h8M8 14h5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      value: `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalMT)} MT`,
      label: 'Total MT Purchased',
      sub: 'for selected period',
      valueColor: '#16a34a',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#ea580c" strokeWidth="2" fill="#ffedd5" />
          <path d="M12 8v4l3 3" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      value: fmtAutoKM(avgCostPerMT),
      label: 'Avg Cost / MT',
      sub: 'purchase cost per MT',
      valueColor: '#ea580c',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="7" width="20" height="14" rx="2" stroke="#2563eb" strokeWidth="2" fill="#dbeafe" />
          <path d="M16 7V5a2 2 0 0 0-4 0v2" stroke="#2563eb" strokeWidth="2" />
          <circle cx="12" cy="14" r="2" fill="#2563eb" />
        </svg>
      ),
      value: fmtAutoKM(avgExpensePerMT),
      label: 'Avg Expense / MT',
      sub: 'expenses per MT',
      valueColor: '#2563eb',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="6" width="13" height="10" rx="1.5" stroke="#6366F1" strokeWidth="2" fill="#e0e7ff" />
          <path d="M14 9h4l3 3v4h-7V9z" stroke="#6366F1" strokeWidth="2" strokeLinejoin="round" fill="#e0e7ff" />
          <circle cx="6" cy="18" r="1.6" fill="#6366F1" /><circle cx="17.5" cy="18" r="1.6" fill="#6366F1" />
        </svg>
      ),
      value: fmtAutoKM(avgFreightPerMT),
      label: 'Avg Freight / MT',
      sub: 'freight cost per MT',
      valueColor: '#6366F1',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke={profitColor} strokeWidth="2" fill={avgProfitPerMT >= 0 ? '#dcfce7' : '#fee2e2'} />
          <path d={avgProfitPerMT >= 0 ? 'M8 12l3 3 5-5' : 'M8 12l3-3 5 5'} stroke={profitColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      value: fmtAutoKM(avgProfitPerMT),
      label: 'Avg Profit / MT',
      sub: 'net profit per MT',
      valueColor: profitColor,
    },
  ];

  return (
    <CardShell>
      <div className="p-4">
        <SectionHeader title="Per-MT Metrics" subtitle="Unit economics for the selected period" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {metrics.map((metric, i) => (
            <m.div
              key={i}
              className="p-3 rounded-xl border border-[#e6eef8] bg-[#f8fbff]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              whileHover={{ y: -2, boxShadow: '0 6px 18px rgba(16,58,122,0.07)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                {metric.icon}
                <span className="responsiveTextTable text-[var(--regent-gray)] leading-tight">{metric.label}</span>
              </div>
              <div className="font-semibold leading-none" style={{ color: metric.valueColor, fontSize: 'clamp(1.05rem, 0.85rem + 0.6vw, 1.45rem)' }}>
                {metric.value}
              </div>
              <div className="responsiveTextTable text-[var(--regent-gray)] mt-1 leading-tight">{metric.sub}</div>
            </m.div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

// Pill-styled filter control built on the app's Radix Select (themed dropdown, small
// Poppins text, check indicators) — not a native <select>, so the menu matches the rest
// of the app. Lifts to the --endeavour accent when a value is set. ('all' is the sentinel
// for "no filter" since Radix Select can't use an empty-string value.)
function FilterSelect({ label, icon, value, onChange, options }) {
  const active = !!value;
  return (
    <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)}>
      <SelectTrigger
        className="group h-8 w-auto min-w-[122px] max-w-[210px] gap-1.5 rounded-full pl-2.5 pr-1.5 shadow-sm focus:ring-0 focus:ring-offset-0"
        style={{
          fontSize: '0.7rem',
          background: active ? '#eaf4ff' : '#f8fbff',
          borderColor: active ? 'var(--endeavour)' : '#d8e8f5',
          boxShadow: active ? '0 1px 8px rgba(3,102,174,0.16)' : undefined,
        }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="flex shrink-0" style={{ color: active ? 'var(--endeavour)' : 'var(--rock-blue)' }}>{icon}</span>
          <span className="font-medium shrink-0" style={{ fontSize: '0.7rem', color: 'var(--regent-gray)' }}>{label}</span>
          <SelectValue className="font-semibold truncate"
            style={{ fontSize: '0.7rem', color: active ? 'var(--endeavour)' : 'var(--chathams-blue)' }} />
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-[#dbeeff] shadow-md max-h-72 min-w-[var(--radix-select-trigger-width)]">
        <SelectItem value="all" className="rounded-lg text-[var(--chathams-blue)]" style={{ fontSize: '0.7rem' }}>All</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="rounded-lg text-[var(--chathams-blue)]" style={{ fontSize: '0.7rem' }}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Purchased vs Shipped vs Pending tonnage, with a shipped-progress bar.
function TonnageCard({ purchased = 0, shipped = 0, pending = 0 }) {
  const pctShipped = purchased > 0 ? Math.min(100, (shipped / purchased) * 100) : 0;
  const fmtMT = (n) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0)} MT`;
  const pills = [
    { label: 'PURCHASED', value: purchased, bg: '#eff6ff', ring: '#bfdbfe', dot: '#2563eb', color: '#1d4ed8' },
    { label: 'SHIPPED', value: shipped, bg: '#ecfdf5', ring: '#a7f3d0', dot: '#10b981', color: '#047857' },
    { label: 'PENDING', value: pending, bg: '#fffbeb', ring: '#fde68a', dot: '#f59e0b', color: '#b45309' },
  ];
  return (
    <m.div
      className="relative rounded-xl bg-white border border-[#e6eef8] shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: '0 10px 30px rgba(16,58,122,0.10)' }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: '#2563eb1A', color: '#2563eb', width: 30, height: 30 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M3 7v10l9 4 9-4V7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
            </span>
            <span className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">Tonnage — Purchased vs Shipped</span>
          </div>
          <span className="responsiveTextTable font-medium" style={{ color: '#047857' }}>{pctShipped.toFixed(0)}% shipped</span>
        </div>

        {/* Shipped proportion bar — blue track (purchased) with emerald fill (shipped) */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#dbeafe' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pctShipped}%`, backgroundColor: '#10b981' }} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {pills.map((p) => (
            <div key={p.label} className="rounded-lg p-2.5" style={{ backgroundColor: p.bg, boxShadow: `inset 0 0 0 1px ${p.ring}` }}>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: p.dot }} />
                <span className="text-[0.6rem] font-semibold tracking-wide" style={{ color: p.color }}>{p.label}</span>
              </div>
              <div className="font-semibold mt-1 leading-none" style={{ color: p.color, fontSize: 'clamp(0.95rem, 0.8rem + 0.5vw, 1.25rem)' }}>{fmtMT(p.value)}</div>
            </div>
          ))}
        </div>
      </div>
    </m.div>
  );
}

// Annual total of P1 "Misc Invoices" — standalone sales not tied to a contract.
function MiscInvoicesCard({ byCur = {}, count = 0 }) {
  const fmtCur = (cur, v) => `${cur === 'us' ? '$' : cur === 'eu' ? '€' : ''}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;
  const entries = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
  return (
    <m.div
      className="relative rounded-xl bg-white border border-[#e6eef8] shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: '0 10px 30px rgba(16,58,122,0.10)' }}
    >
      <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: '#db27771A', color: '#db2777', width: 30, height: 30 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M7 3h10l3 4v14H4V7l3-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8 11h8M8 15h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </span>
          <div className="min-w-0">
            <div className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">Misc Invoices · not linked to contracts</div>
            <div className="text-[var(--regent-gray)] leading-tight" style={{ fontSize: '0.6rem' }}>{count} invoice{count === 1 ? '' : 's'} in period</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {entries.length === 0
            ? <span className="responsiveTextTable text-[var(--regent-gray)]">None in this period</span>
            : entries.map(([cur, v]) => (
              <span key={cur} className="rounded-full px-3 py-1 font-semibold"
                style={{ background: '#fdf2f8', boxShadow: 'inset 0 0 0 1px #fbcfe8', color: '#9d174d', fontSize: '0.82rem' }}>
                {fmtCur(cur, v)}
              </span>
            ))}
        </div>
      </div>
    </m.div>
  );
}

// Value of purchased-but-unsold material. Shown separately because it's stock (capital
// tied up), NOT a cost or loss — it only becomes a cost when the material is sold.
function UnsoldStockCard({ value = 0, mt = 0 }) {
  const fmtMT = (n) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0)} MT`;
  return (
    <m.div
      className="relative rounded-xl bg-white border border-[#e6eef8] shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: '0 10px 30px rgba(16,58,122,0.10)' }}
    >
      <div className="p-4 flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: '#f59e0b1A', color: '#b45309', width: 30, height: 30 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M3 7v10l9 4 9-4V7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
          </span>
          <span className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">Unsold Stock · not a cost</span>
        </div>
        <div className="font-semibold text-[var(--port-gore)] leading-none mt-1" style={{ fontSize: 'clamp(1.15rem, 0.9rem + 0.7vw, 1.6rem)' }}>{fmtAutoKM(value)}</div>
        <div className="rounded-lg p-2.5 mt-auto" style={{ backgroundColor: '#fffbeb', boxShadow: 'inset 0 0 0 1px #fde68a' }}>
          <div className="font-semibold leading-none" style={{ color: '#b45309', fontSize: 'clamp(0.95rem, 0.8rem + 0.5vw, 1.25rem)' }}>{fmtMT(mt)}</div>
          <div className="text-[0.58rem] text-[var(--regent-gray)] mt-1">in stock · capital tied up, excluded from profit</div>
        </div>
      </div>
    </m.div>
  );
}

// Receivables aging — outstanding split by invoice age (0–30 / 31–60 / 61–90 / 90+),
// per currency, colored green→red as it ages. Shows how overdue money is at a glance.
function AgingCard({ buckets = [] }) {
  const colors = ['#16a34a', '#f59e0b', '#ea580c', '#dc2626'];
  const fmtCurKM = (cur, n) => {
    const s = cur === 'us' ? '$' : cur === 'eu' ? '€' : '';
    const v = Number(n) || 0, a = Math.abs(v);
    if (a >= 1e6) return `${s}${(v / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${s}${(v / 1e3).toFixed(1)}K`;
    return `${s}${v.toFixed(0)}`;
  };
  const bTot = (b) => Object.values(b.byCur || {}).reduce((s, v) => s + v, 0);
  const max = Math.max(...buckets.map(bTot), 1);
  const anyData = buckets.some(b => b.count > 0);
  return (
    <CardShell>
      <div className="p-4">
        <SectionHeader title="Receivables Aging" subtitle="Outstanding by invoice age (days) — older = more overdue" />
        {!anyData
          ? <div className="responsiveText text-[var(--regent-gray)] py-3 text-center">No outstanding receivables</div>
          : buckets.map((b, i) => {
            const curs = Object.keys(b.byCur || {}).filter(c => b.byCur[c] > 0.005);
            const tot = bTot(b);
            return (
              <div key={b.label} className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                  <span className="rounded-full" style={{ width: 8, height: 8, background: colors[i] }} />
                  <span className="responsiveTextTable text-[var(--port-gore)] font-medium">{b.label} d</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="w-full bg-[#eef3f9] rounded-full overflow-hidden" style={{ height: 16 }}>
                    <div className="h-full rounded-full" style={{ width: `${max > 0 ? (tot / max) * 100 : 0}%`, minWidth: tot > 0 ? 4 : 0, background: colors[i], borderRadius: '0 9999px 9999px 0' }} />
                  </div>
                </div>
                <div className="w-28 text-right flex-shrink-0">
                  {curs.length
                    ? curs.map(c => <div key={c} className="responsiveTextTable font-medium text-[var(--port-gore)] leading-tight">{fmtCurKM(c, b.byCur[c])}</div>)
                    : <span className="responsiveTextTable text-[var(--regent-gray)]">—</span>}
                  <div className="text-[0.58rem] text-[var(--regent-gray)]">{b.count} inv</div>
                </div>
              </div>
            );
          })}
      </div>
    </CardShell>
  );
}

// Horizontal-bar breakdown card (expenses by type, materials by tonnage, etc.).
function BreakdownCard({ title, subtitle, entries = [], total, fmtVal, accent = '#2563eb' }) {
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <CardShell>
      <div className="p-4">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          right={total != null ? <div className="text-right flex-shrink-0"><div className="responsiveTextTable text-[var(--regent-gray)]">Total</div><span className="font-semibold text-[var(--chathams-blue)]">{fmtVal(total)}</span></div> : null}
        />
        {entries.length === 0
          ? <div className="responsiveText text-[var(--regent-gray)] py-3 text-center">No data for this period</div>
          : entries.map(([label, value]) => (
            <div key={label} className="flex items-center gap-2 mb-1.5">
              <div className="w-28 responsiveTextTable text-[var(--port-gore)] truncate flex-shrink-0" title={label}>{label}</div>
              <div className="flex-1 min-w-0">
                <div className="w-full bg-[#eef3f9] rounded-full overflow-hidden" style={{ height: 16 }}>
                  <div className="h-full rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, minWidth: 4, background: accent, borderRadius: '0 9999px 9999px 0' }} />
                </div>
              </div>
              <div className="w-20 text-right responsiveTextTable font-medium text-[var(--port-gore)] flex-shrink-0">{fmtVal(value)}</div>
            </div>
          ))}
      </div>
    </CardShell>
  );
}

const Dash = () => {

  const { settings, compData, dateSelect, setLoading, loading, ln } = useContext(SettingsContext);
  // One standard company EUR→USD rate (Settings → General). 0 = not set → per-contract rate.
  const companyRate = parseFloat(compData?.eurUsdRate) || 0;
  // Default payment term in days (Settings → General) — used to flag overdue invoices.
  const termDays = parseInt(compData?.defaultTermDays, 10) > 0 ? parseInt(compData.defaultTermDays, 10) : 30;
  const { uidCollection } = UserAuth();
  const settingsLoaded = Object.keys(settings).length > 0;
  const clientCount = settings.Client?.Client?.length || 0;
  const supplierCount = settings.Supplier?.Supplier?.length || 0;

  // Raw loaded data — every aggregate below is derived (memoized) from these, so the
  // Supplier / Client / Material filters recompute instantly without re-fetching Firestore.
  const [rawContracts, setRawContracts] = useState([]);     // contracts enriched with invoicesData
  const [rawRecvInvoices, setRawRecvInvoices] = useState([]);
  const [rawMiscInvoices, setRawMiscInvoices] = useState([]); // P1 misc invoices, not linked to contracts

  const [fSupplier, setFSupplier] = useState('');
  const [fClient, setFClient] = useState('');
  const [fMaterial, setFMaterial] = useState('');

  useEffect(() => {

    const Load = async () => {

      const year = dateSelect?.start?.substring(0, 4) || new Date().getFullYear();
      setLoading(true);

      let dtContracts = await loadData(uidCollection, 'contracts', {
        start: dateSelect?.start || `${year}-01-01`,
        end: dateSelect?.end || `${year}-12-31`,
      });

      // Batch ALL contracts' invoice lookups into one pass instead of one query per
      // contract (the old N+1): load the union once, then slice per contract in memory.
      const invIndex = await buildInvoiceIndex(uidCollection, dtContracts);
      let dtConTmp = dtContracts.map(x => ({ ...x, invoicesData: contractInvoicesFromIndex(x, invIndex) }));
      setRawContracts(dtConTmp);

      // Outstanding receivables are a running total — load a multi-year window (last 4
      // years) so the card reflects TRUE outstanding, not just invoices dated this period.
      const curYr = new Date().getFullYear();
      const invsForRecv = await loadData(uidCollection, 'invoices', {
        start: `${curYr - 3}-01-01`,
        end: `${curYr}-12-31`,
      });
      setRawRecvInvoices(invsForRecv);

      // P1 "Misc Invoices" — standalone sales not linked to any contract.
      const misc = await loadCompanyExpenses(uidCollection, 'specialInvoices', {
        start: dateSelect?.start || `${year}-01-01`,
        end: dateSelect?.end || `${year}-12-31`,
      });
      setRawMiscInvoices(Array.isArray(misc) ? misc.filter(Boolean) : []);

      setLoading(false);
    };

    if (!uidCollection || !settingsLoaded) return;
    Load();

  }, [dateSelect, settingsLoaded, clientCount, supplierCount, uidCollection]);

  const currentYear = dateSelect?.start?.substring(0, 4) || new Date().getFullYear();

  // Resolve a client display name from either an id (draft invoices) or an object
  // (finalized invoices store { nname }). Used by both filter options and matching.
  const resolveClientName = (client) => {
    if (client && typeof client === 'object') return client.nname || '';
    return settings.Client?.Client?.find(c => c.id === client)?.nname || '';
  };

  // Filter option lists, built from what's actually loaded so the dropdowns never
  // show entities that aren't in the current period.
  const supplierOptions = useMemo(() => {
    const ids = [...new Set(rawContracts.map(c => c.supplier).filter(Boolean))];
    return ids
      .map(id => ({ id, name: settings.Supplier?.Supplier?.find(s => s.id === id)?.nname || '' }))
      .filter(o => o.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawContracts, settings]);

  const materialOptions = useMemo(() => {
    const set = new Set();
    rawContracts.forEach(c => (c.productsData || []).forEach(p => { if (p.description) set.add(p.description); }));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rawContracts]);

  const clientOptions = useMemo(() => {
    const set = new Set();
    rawContracts.forEach(c => (c.invoicesData || []).forEach(group => group.forEach(inv => {
      const n = resolveClientName(inv.client); if (n) set.add(n);
    })));
    return [...set].sort((a, b) => a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawContracts, settings]);

  // Apply the active Supplier / Material / Client filters to the raw contracts.
  const filteredContracts = useMemo(() => {
    return rawContracts.filter(c => {
      if (fSupplier && c.supplier !== fSupplier) return false;
      if (fMaterial && !(c.productsData || []).some(p => (p.description || '') === fMaterial)) return false;
      if (fClient && !(c.invoicesData || []).some(group => group.some(inv => resolveClientName(inv.client) === fClient))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawContracts, fSupplier, fMaterial, fClient, settings]);

  const filtersActive = !!(fSupplier || fClient || fMaterial);
  const clearFilters = () => { setFSupplier(''); setFClient(''); setFMaterial(''); };

  // Aggregates — recomputed only when the filtered set (or settings) changes.
  const conAgg = useMemo(() => calContracts(filteredContracts, settings, companyRate), [filteredContracts, settings, companyRate]);
  const invAgg = useMemo(() => setMonthsInvoices(filteredContracts, settings, companyRate), [filteredContracts, settings, companyRate]);

  const dataContracts = conAgg.accumulatedPmnt;
  const dataExpenses = conAgg.accumulatedExp;
  const dataPieSupps = conAgg.pieArrSupps;
  const dataInvoices = invAgg.accumulatedPmnt;
  const dataPieClnts = invAgg.pieArrClnts;

  const totalMT = conAgg.totalMT || 0;
  const shippedMT = Math.min(conAgg.shippedMT || 0, totalMT); // never exceed purchased
  const pendingMT = Math.max(0, totalMT - shippedMT);
  const freightTotal = conAgg.freightTotal || 0;
  const missingRate = conAgg.missingRate || 0; // EUR contracts missing an FX rate (counted 1:1)
  const cogs = conAgg.cogs || 0;               // cost of SOLD material only
  const unsoldValue = conAgg.unsoldValue || 0; // purchase value of unsold stock (NOT a loss)
  const cogsByMonth = conAgg.cogsByMonth || {};
  const expByType = conAgg.expByType || {};
  const materialSold = conAgg.materialSold || {};

  // SOLD-BASIS monthly profit = revenue (sold) − cost-of-sold − expenses. Unsold material
  // is stock, not a cost, so it never drags profit negative the way the old "all purchases"
  // method did.
  const dataPL = useMemo(() => {
    const pl = Object.keys(dataInvoices).reduce((acc, key) => {
      acc[key] = (dataInvoices[key] || 0) - (cogsByMonth[key] || 0) - (dataExpenses[key] || 0);
      return acc;
    }, {});
    return Object.values(pl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInvoices, conAgg, dataExpenses]);

  // Outstanding receivables split by shipment finalization (shipData.fnlzing === '4568'
  // = Yes). Same issued/unpaid rule as the alerts bar + Cashflow. Responds to the Client
  // filter (suppliers/materials don't map cleanly onto a sales invoice).
  const receivables = useMemo(() => {
    // Canonical receivables (utils/finance.js) — deduped (an invoice + its Credit/Final
    // note count ONCE, payments combined), balance = total − payments (same rule the
    // Cashflow page uses), per-currency, draft/canceled excluded, finalized/provisional split.
    const list = fClient
      ? rawRecvInvoices.filter(inv => resolveClientName(inv.client) === fClient)
      : rawRecvInvoices;
    return financeReceivables(list, { asOf: new Date(), termDays });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawRecvInvoices, fClient, settings, termDays]);

  // Receivables aging buckets (0–30 / 31–60 / 61–90 / 90+), same source as receivables.
  const aging = useMemo(() => {
    const list = fClient
      ? rawRecvInvoices.filter(inv => resolveClientName(inv.client) === fClient)
      : rawRecvInvoices;
    return agingBuckets(list, { asOf: new Date() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawRecvInvoices, fClient, settings]);

  // P1 misc invoices total by currency (annual summary — independent of the contract filters).
  const miscInvoices = useMemo(() => {
    const byCur = {};
    rawMiscInvoices.forEach(r => {
      const cur = r.cur || 'us';
      byCur[cur] = (byCur[cur] || 0) + (parseFloat(r.total) || 0);
    });
    return { byCur, count: rawMiscInvoices.length };
  }, [rawMiscInvoices]);

  const totalPL = useMemo(() => dataPL.reduce((a, v) => a + (Number(v) || 0), 0), [dataPL]);
  const totalInvoices = useMemo(() => sumObj(dataInvoices), [dataInvoices]);
  const totalContracts = useMemo(() => sumObj(dataContracts), [dataContracts]);
  const totalExpenses = useMemo(() => sumObj(dataExpenses), [dataExpenses]);

  const avgCostPerMT = useMemo(() => totalMT > 0 ? totalContracts / totalMT : 0, [totalContracts, totalMT]);
  const avgExpensePerMT = useMemo(() => totalMT > 0 ? totalExpenses / totalMT : 0, [totalExpenses, totalMT]);
  // Profit per ton is per ton SOLD (profit only exists on sold material).
  const avgProfitPerMT = useMemo(() => shippedMT > 0 ? totalPL / shippedMT : 0, [totalPL, shippedMT]);
  const avgFreightPerMT = useMemo(() => totalMT > 0 ? freightTotal / totalMT : 0, [freightTotal, totalMT]);

  // ── Hero trend series (Revenue area + Costs & Profit lines) ──────────────
  const revLabels = useMemo(
    () => Object.keys(dataInvoices).map((k) => MONTHS[Number(k) - 1] || k),
    [dataInvoices]
  );
  const revenueSeries = useMemo(() => Object.values(dataInvoices).map(Number), [dataInvoices]);
  // Costs line = cost of SOLD material + expenses (sold basis), per month.
  const costsSeries = useMemo(
    () => Object.keys(dataInvoices).map((k) => (Number(cogsByMonth[k]) || 0) + (Number(dataExpenses[k]) || 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conAgg, dataExpenses, dataInvoices]
  );
  const profitSeries = useMemo(() => dataPL.map(Number), [dataPL]);

  const heroData = {
    labels: revLabels,
    datasets: [
      {
        label: 'Revenue',
        data: revenueSeries,
        borderColor: '#2563eb',
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(37,99,235,0.10)';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(37,99,235,0.28)');
          g.addColorStop(1, 'rgba(37,99,235,0.00)');
          return g;
        },
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: 'origin',
      },
      {
        label: 'Costs',
        data: costsSeries,
        borderColor: '#f43f5e',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
      },
      {
        label: 'Profit',
        data: profitSeries,
        borderColor: '#16a34a',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 4],
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
      },
    ],
  };

  const heroOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 6, padding: 16, font: { size: 11 }, color: '#28264f' },
      },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        titleColor: '#28264f',
        bodyColor: '#28264f',
        borderColor: '#e6eef8',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 12,
        usePointStyle: true,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtAutoKM(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#838ca7' }, border: { display: false } },
      y: { grid: { color: '#eef3f9' }, ticks: { callback: (v) => fmtAutoKM(v, 1), font: { size: 10 }, color: '#838ca7' }, border: { display: false } },
    },
  };

  // ── Revenue breakdown donut (Cost of Sold / Expenses / Profit = Revenue) ──
  const profitForArc = Math.max(Number(totalPL) || 0, 0);
  const donutData = {
    labels: ['Cost of Sold', 'Other Expenses', 'Net Profit'],
    datasets: [{
      data: [cogs, totalExpenses, profitForArc],
      backgroundColor: ['#2563eb', '#db2777', '#16a34a'],
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        titleColor: '#28264f',
        bodyColor: '#28264f',
        borderColor: '#e6eef8',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 10,
        callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtAutoKM(ctx.parsed)}` },
      },
    },
  };

  const donutLegend = [
    { label: 'Cost of Sold', value: cogs, color: '#2563eb' },
    { label: 'Other Expenses', value: totalExpenses, color: '#db2777' },
    { label: 'Net Profit', value: totalPL, color: '#16a34a' },
  ];

  // Ranking data sources
  const hbSupps = HorizontalBar(dataPieSupps || {});
  const hbClnts = HorizontalBar(dataPieClnts || {});

  if (Object.keys(settings).length === 0) return <VideoLoader loading={true} fullScreen={true} />;

  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full">
        <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-6 mt-[72px] min-h-screen">
          <Toast />
          <VideoLoader loading={loading} fullScreen={true} />

          {/* Market ticker */}
          <m.div className="mb-4" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <MarketsTicker />
          </m.div>

          {/* AI alerts */}
          <m.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <AIAlertsBar />
          </m.div>

          {/* Header */}
          <m.div className="mb-5 flex flex-wrap items-center justify-between gap-3"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <div>
              <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-semibold border-l-4 border-[var(--chathams-blue)] pl-2">
                {getTtl('Dashboard', ln)}
              </h1>
              <p className="responsiveText text-[var(--regent-gray)] pl-3 mt-0.5">
                Financial overview · {currentYear}
                {filtersActive && <span className="text-[var(--endeavour)] font-medium"> · filtered</span>}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <DateRangePicker />
              <TooltipComp txt="Select Dates Range" />
            </div>
          </m.div>

          {/* FILTER BAR — Supplier / Client / Material (date range lives in the header) */}
          <m.div className="mb-5" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#e6eef8] px-3 py-2.5 shadow-sm"
              style={{ background: 'linear-gradient(180deg,#ffffff,#f8fbff)' }}>
              <span className="inline-flex items-center gap-1.5 pr-2 mr-0.5 border-r border-[#e6eef8]">
                <span className="inline-flex items-center justify-center rounded-lg" style={{ background: 'var(--endeavour)', color: '#fff', width: 22, height: 22 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </span>
                <span className="font-semibold" style={{ fontSize: '0.7rem', color: 'var(--chathams-blue)' }}>Filters</span>
                {filtersActive && (
                  <span className="inline-flex items-center justify-center rounded-full text-white font-semibold"
                    style={{ background: 'var(--endeavour)', minWidth: 15, height: 15, fontSize: '0.58rem', padding: '0 4px' }}>
                    {[fSupplier, fClient, fMaterial].filter(Boolean).length}
                  </span>
                )}
              </span>

              <FilterSelect label="Supplier" value={fSupplier} onChange={setFSupplier}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 21V9l6-3v4l6-3v4l6-2v12H3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M8 21v-4h4v4" stroke="currentColor" strokeWidth="1.8" /></svg>}
                options={supplierOptions.map(o => ({ value: o.id, label: o.name }))} />
              <FilterSelect label="Client" value={fClient} onChange={setFClient}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" /><path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                options={clientOptions.map(o => ({ value: o, label: o }))} />
              <FilterSelect label="Material" value={fMaterial} onChange={setFMaterial}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>}
                options={materialOptions.map(o => ({ value: o, label: o }))} />

              {filtersActive && (
                <button onClick={clearFilters}
                  className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 h-7 font-semibold transition-colors hover:brightness-95"
                  style={{ fontSize: '0.7rem', color: 'var(--endeavour)', background: '#eaf4ff', border: '1px solid #cfe3f5' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Clear all
                </button>
              )}
            </div>
          </m.div>

          {/* FX data-gap warning — a missing rate is counted at 1:1, not silently zeroed */}
          {missingRate > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" style={{ color: '#c2410c' }}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M12 9v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <span className="responsiveTextTable" style={{ color: '#9a3412' }}>
                {missingRate} EUR contract{missingRate === 1 ? '' : 's'} missing an FX rate — counted at 1:1, so USD totals may be understated. Set the EUR→USD rate on those contracts for accurate figures.
              </span>
            </div>
          )}

          {/* KPI ROW */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
            <StatKpiCard
              title="Net Profit · sold"
              value={fmtAutoKM(totalPL)}
              chartData={dataPL}
              accent="#6366F1"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
            />
            <StatKpiCard
              title="Sales Revenue"
              value={fmtAutoKM(totalInvoices)}
              chartData={dataInvoices}
              accent="#16a34a"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="2" /><path d="M8 10h8M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
            />
            <StatKpiCard
              title="Cost of Sold"
              value={fmtAutoKM(cogs)}
              chartData={cogsByMonth}
              accent="#dc2626"
              goodWhenUp={false}
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
            />
            <StatKpiCard
              title="MT Purchased"
              value={`${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalMT)} MT`}
              chartData={dataContracts}
              accent="#2563eb"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M7 10h10M7 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
            />
            <StatKpiCard
              title="Other Expenses"
              value={fmtAutoKM(totalExpenses)}
              chartData={dataExpenses}
              accent="#db2777"
              goodWhenUp={false}
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M12 12l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
            />
            <StatKpiCard
              title="Avg Profit / MT"
              value={fmtAutoKM(avgProfitPerMT)}
              chartData={dataPL}
              accent="#ea580c"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 17l4-4 4 4 4-8 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            />
          </div>

          {/* RECEIVABLES split + TONNAGE breakdown + UNSOLD STOCK */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <ReceivablesSplitCard byCur={receivables.byCur} />
            <TonnageCard purchased={totalMT} shipped={shippedMT} pending={pendingMT} />
            <UnsoldStockCard value={unsoldValue} mt={pendingMT} />
          </div>

          {/* RECEIVABLES AGING */}
          <div className="mb-5">
            <AgingCard buckets={aging} />
          </div>

          {/* MISC INVOICES — P1 standalone sales not linked to contracts */}
          <div className="mb-5">
            <MiscInvoicesCard byCur={miscInvoices.byCur} count={miscInvoices.count} />
          </div>

          {/* MAIN ROW — hero trend + capital breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <CardShell className="lg:col-span-2">
              <div className="p-4">
                <SectionHeader
                  title="Revenue, Costs & Profit"
                  subtitle="Sold basis — sales vs cost of material actually sold (unsold stock excluded) · selected period"
                />
                <div style={{ height: 320 }}>
                  <Line data={heroData} options={heroOptions} />
                </div>
              </div>
            </CardShell>

            <CardShell>
              <div className="p-4">
                <SectionHeader title="Capital Breakdown" subtitle="How revenue was allocated" />
                <div className="relative" style={{ height: 200 }}>
                  <Doughnut data={donutData} options={donutOptions} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="responsiveTextTable text-[var(--regent-gray)]">Revenue</span>
                    <span className="font-semibold text-[var(--port-gore)]" style={{ fontSize: 'clamp(1rem, 0.8rem + 0.6vw, 1.35rem)' }}>
                      {fmtAutoKM(totalInvoices)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {donutLegend.map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="responsiveTextTable text-[var(--port-gore)] truncate">{d.label}</span>
                      </div>
                      <span className="responsiveTextTable font-semibold flex-shrink-0" style={{ color: d.color }}>{fmtAutoKM(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardShell>
          </div>

          {/* RANKINGS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <RankingList
              title="Contracts — $"
              subtitle="Contribution breakdown by contract values"
              labels={hbSupps.obj.labels || []}
              data={hbSupps.obj.datasets?.[0]?.data || []}
              totalValue={totalContracts}
            />
            <RankingList
              title="Consignees — $"
              subtitle="Contribution breakdown by client volume"
              labels={hbClnts.obj.labels || []}
              data={hbClnts.obj.datasets?.[0]?.data || []}
              totalValue={totalInvoices}
            />
          </div>

          {/* EXPENSES BY TYPE + MOST-SOLD MATERIAL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <BreakdownCard
              title="Expenses by Type"
              subtitle="Freight, warehouse, commission, …"
              entries={Object.entries(expByType).filter(([, v]) => Math.abs(v) > 0.5).sort((a, b) => b[1] - a[1])}
              total={totalExpenses}
              fmtVal={(v) => fmtAutoKM(v)}
              accent="#db2777"
            />
            <BreakdownCard
              title="Most-Sold Material"
              subtitle="By tonnage sold this period"
              entries={Object.entries(materialSold).filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1]).slice(0, 8)}
              total={shippedMT}
              fmtVal={(v) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v || 0)} MT`}
              accent="#2563eb"
            />
          </div>

          {/* PER-MT STRIP */}
          <PerMtStrip
            totalMT={totalMT}
            avgCostPerMT={avgCostPerMT}
            avgExpensePerMT={avgExpensePerMT}
            avgProfitPerMT={avgProfitPerMT}
            avgFreightPerMT={avgFreightPerMT}
          />

        </div>
      </div>
    </LazyMotion>
  );
}

export default Dash;
