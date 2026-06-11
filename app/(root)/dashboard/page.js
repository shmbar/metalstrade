
'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import VideoLoader from '@components/videoLoader';
import { UserAuth } from "@contexts/useAuthContext"
import { SettingsContext } from "@contexts/useSettingsContext";
import Toast from '@components/toast.js'
import { loadData, groupedArrayInvoice, getInvoices } from '@utils/utils'
import { setMonthsInvoices, calContracts } from './funcs'
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';
import TooltipComp from '@components/tooltip';
// MarketsTicker pulls in ~250 inlined flag images (react-world-flags); load it
// off the first-paint critical path so it doesn't bloat the dashboard bundle.
const MarketsTicker = dynamic(() => import('@components/Dashboard/MarketsTicker'), { ssr: false });
import AIAlertsBar from '@components/Dashboard/AIAlertsBar';

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

const loadInvoices = async (uidCollection, con) => {
  let yrs = [...new Set(con.invoices.map(x => x.date.substring(0, 4)))]
  let arrTmp = [];
  for (let i = 0; i < yrs.length; i++) {
    let yr = yrs[i]
    let tmpDt = [...new Set(con.invoices.filter(x => x.date.substring(0, 4) === yr).map(y => y.invoice))]
    let obj = { yr: yr, arrInv: tmpDt }
    arrTmp.push(obj)
  }

  let tmpInv = await getInvoices(uidCollection, 'invoices', arrTmp)
  return groupedArrayInvoice(tmpInv)
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
function ReceivablesSplitCard({ finalized = 0, provisional = 0, finalizedCount = 0, provisionalCount = 0 }) {
  const total = finalized + provisional;
  const pctFinal = total > 0 ? (finalized / total) * 100 : 0;
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
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 7h18v10H3z" stroke="currentColor" strokeWidth="2" /><path d="M3 11h18" stroke="currentColor" strokeWidth="2" /></svg>
            </span>
            <span className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">Outstanding Receivables</span>
          </div>
          <span className="font-semibold text-[var(--port-gore)] leading-none" style={{ fontSize: 'clamp(1.05rem, 0.85rem + 0.6vw, 1.45rem)' }}>
            {fmtAutoKM(total)}
          </span>
        </div>

        {/* Finalized proportion bar — emerald fill (finalized) over amber track (provisional) */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#fde68a' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pctFinal}%`, backgroundColor: '#10b981' }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-2.5" style={{ backgroundColor: '#ecfdf5', boxShadow: 'inset 0 0 0 1px #a7f3d0' }}>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: '#10b981' }} />
              <span className="text-[0.6rem] font-semibold tracking-wide" style={{ color: '#047857' }}>FINALIZED</span>
            </div>
            <div className="font-semibold mt-1 leading-none" style={{ color: '#047857', fontSize: 'clamp(0.95rem, 0.8rem + 0.5vw, 1.25rem)' }}>{fmtAutoKM(finalized)}</div>
            <div className="text-[0.58rem] text-[var(--regent-gray)] mt-1">{finalizedCount} invoice{finalizedCount === 1 ? '' : 's'} · after final invoice</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ backgroundColor: '#fffbeb', boxShadow: 'inset 0 0 0 1px #fde68a' }}>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: '#f59e0b' }} />
              <span className="text-[0.6rem] font-semibold tracking-wide" style={{ color: '#b45309' }}>PROVISIONAL</span>
            </div>
            <div className="font-semibold mt-1 leading-none" style={{ color: '#b45309', fontSize: 'clamp(0.95rem, 0.8rem + 0.5vw, 1.25rem)' }}>{fmtAutoKM(provisional)}</div>
            <div className="text-[0.58rem] text-[var(--regent-gray)] mt-1">{provisionalCount} invoice{provisionalCount === 1 ? '' : 's'} · before final invoice</div>
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
function PerMtStrip({ totalMT, avgCostPerMT, avgExpensePerMT, avgProfitPerMT }) {
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

const Dash = () => {

  const { settings, dateSelect, setLoading, loading, ln } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();
  const settingsLoaded = Object.keys(settings).length > 0;
  const clientCount = settings.Client?.Client?.length || 0;
  const supplierCount = settings.Supplier?.Supplier?.length || 0;

  const [dataInvoices, setDataInvoices] = useState([]);
  const [dataContracts, setDataContracts] = useState([]);
  const [dataExpenses, setDataExpenses] = useState([]);
  const [dataPL, setDataPL] = useState([]);
  const [dataPieSupps, setDataPieSupps] = useState([]);
  const [dataPieClnts, setDataPieClnts] = useState([]);
  const [totalMT, setTotalMT] = useState(0);
  const [receivables, setReceivables] = useState({ finalized: 0, provisional: 0, finalizedCount: 0, provisionalCount: 0 });

  useEffect(() => {

    const Load = async () => {

      const year = dateSelect?.start?.substring(0, 4) || new Date().getFullYear();
      setLoading(true);

      let dtContracts = await loadData(uidCollection, 'contracts', {
        start: dateSelect?.start || `${year}-01-01`,
        end: dateSelect?.end || `${year}-12-31`,
      });

      let dtConTmp = await Promise.all(
        dtContracts.map(async (x) => {
          const Invoices = await loadInvoices(uidCollection, x);
          return { ...x, invoicesData: Invoices };
        })
      );

      let tmpData = calContracts(dtConTmp, settings);

      setDataContracts(tmpData.accumulatedPmnt);
      setDataExpenses(tmpData.accumulatedExp);
      setDataPieSupps(tmpData.pieArrSupps);
      setTotalMT(tmpData.totalMT || 0);

      let arrInvoices = setMonthsInvoices(dtConTmp, settings);
      setDataInvoices(arrInvoices.accumulatedPmnt);
      setDataPieClnts(arrInvoices.pieArrClnts);

      const summedArr = Object.keys(tmpData.accumulatedPmnt).reduce((acc, key) => {
        acc[key] = tmpData.accumulatedPmnt[key] + tmpData.accumulatedExp[key];
        return acc;
      }, {});

      const tmpPL = Object.keys(arrInvoices.accumulatedPmnt).reduce((acc, key) => {
        acc[key] = arrInvoices.accumulatedPmnt[key] - summedArr[key];
        return acc;
      }, {});

      setDataPL(Object.values(tmpPL));

      // Outstanding receivables split by shipment finalization (shipData.fnlzing
      // === '4568' = Yes). Same issued/unpaid rule as the alerts bar + Cashflow:
      // an invoice counts only if it's not a draft, not canceled, and still owed.
      const invsForRecv = await loadData(uidCollection, 'invoices', {
        start: dateSelect?.start || `${year}-01-01`,
        end: dateSelect?.end || `${year}-12-31`,
      });
      const recv = { finalized: 0, provisional: 0, finalizedCount: 0, provisionalCount: 0 };
      invsForRecv.forEach(inv => {
        if (inv.draft === true || inv.canceled) return;
        const totalAmt = parseFloat(inv.totalAmount) || 0;
        const totalPaid = (inv.payments || []).reduce((s, p) => s + (parseFloat(p.pmnt) || 0), 0);
        const balanceDue = inv.debtBlnc != null ? parseFloat(inv.debtBlnc) : totalAmt - totalPaid;
        if (balanceDue > 0.01) {
          if (inv.shipData?.fnlzing === '4568') { recv.finalized += balanceDue; recv.finalizedCount++; }
          else { recv.provisional += balanceDue; recv.provisionalCount++; }
        }
      });
      setReceivables(recv);

      setLoading(false);
    };

    if (!uidCollection || !settingsLoaded) return;
    Load();

  }, [dateSelect, settingsLoaded, clientCount, supplierCount, uidCollection]);

  const currentYear = dateSelect?.start?.substring(0, 4) || new Date().getFullYear();

  const totalPL = useMemo(() => dataPL.reduce((a, v) => a + (Number(v) || 0), 0), [dataPL]);
  const totalInvoices = useMemo(() => sumObj(dataInvoices), [dataInvoices]);
  const totalContracts = useMemo(() => sumObj(dataContracts), [dataContracts]);
  const totalExpenses = useMemo(() => sumObj(dataExpenses), [dataExpenses]);

  const avgCostPerMT = useMemo(() => totalMT > 0 ? totalContracts / totalMT : 0, [totalContracts, totalMT]);
  const avgExpensePerMT = useMemo(() => totalMT > 0 ? totalExpenses / totalMT : 0, [totalExpenses, totalMT]);
  const avgProfitPerMT = useMemo(() => totalMT > 0 ? totalPL / totalMT : 0, [totalPL, totalMT]);

  // ── Hero trend series (Revenue area + Costs & Profit lines) ──────────────
  const revLabels = useMemo(
    () => Object.keys(dataInvoices).map((k) => MONTHS[Number(k) - 1] || k),
    [dataInvoices]
  );
  const revenueSeries = useMemo(() => Object.values(dataInvoices).map(Number), [dataInvoices]);
  const costsSeries = useMemo(
    () => Object.keys(dataContracts).map((k) => (Number(dataContracts[k]) || 0) + (Number(dataExpenses[k]) || 0)),
    [dataContracts, dataExpenses]
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

  // ── Capital breakdown donut (Purchase / Expenses / Profit) ───────────────
  const profitForArc = Math.max(Number(totalPL) || 0, 0);
  const donutData = {
    labels: ['Purchase Costs', 'Other Expenses', 'Net Profit'],
    datasets: [{
      data: [totalContracts, totalExpenses, profitForArc],
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
    { label: 'Purchase Costs', value: totalContracts, color: '#2563eb' },
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
              </p>
            </div>
            <div className="flex items-center gap-1">
              <DateRangePicker />
              <TooltipComp txt="Select Dates Range" />
            </div>
          </m.div>

          {/* KPI ROW */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
            <StatKpiCard
              title="P&L"
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
              title="Total Costs"
              value={fmtAutoKM(totalContracts + totalExpenses)}
              chartData={dataContracts}
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

          {/* RECEIVABLES — finalized vs provisional split */}
          <div className="mb-5">
            <ReceivablesSplitCard {...receivables} />
          </div>

          {/* MAIN ROW — hero trend + capital breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <CardShell className="lg:col-span-2">
              <div className="p-4">
                <SectionHeader
                  title="Revenue, Costs & Profit"
                  subtitle="Monthly trend for the selected period"
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

          {/* PER-MT STRIP */}
          <PerMtStrip
            totalMT={totalMT}
            avgCostPerMT={avgCostPerMT}
            avgExpensePerMT={avgExpensePerMT}
            avgProfitPerMT={avgProfitPerMT}
          />

        </div>
      </div>
    </LazyMotion>
  );
}

export default Dash;
