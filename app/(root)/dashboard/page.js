
'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Spinner from '@components/spinner';
import VideoLoader from '@components/videoLoader';
import { UserAuth } from "@contexts/useAuthContext"
import { SettingsContext } from "@contexts/useSettingsContext";
import Toast from '@components/toast.js'
import Spin from '@components/spinTable';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { loadData, groupedArrayInvoice, getInvoices } from '@utils/utils'
import { setMonthsInvoices, calContracts } from './funcs'
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';
import TooltipComp from '@components/tooltip';
import MarketsTicker from '@components/Dashboard/MarketsTicker';

import { BarChartContracts, HorizontalBar } from './charts';

ChartJS.register(
  CategoryScale,
  ArcElement,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

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
    <motion.div
      className={`bg-[#f8fbff] rounded-2xl border border-[#b8ddf8] ${className}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
    >
      {children}
    </motion.div>
  );
}

function StatKpiCard({
  title,
  badgeText,
  value,
  chartData,
  chartColor = "rgba(255,255,255,0.92)",
  grad = "from-red-500 to-rose-600",
  icon,
  iconBg = '#fff',
}) {
  return (
    <motion.div
      className={`relative h-full min-h-[115px] rounded-xl overflow-hidden bg-gradient-to-br ${grad} shadow-md flex flex-col`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={{ scale: 1.03, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
    >
      <div className="p-2.5 flex flex-col justify-between h-full">
        {/* Top Section - Icon, Title and Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {icon && (
              <span className="inline-flex items-center justify-center rounded-full flex-shrink-0" style={{ background: iconBg, width: 22, height: 22 }}>
                {icon}
              </span>
            )}
            <div className="text-white/90 responsiveTextTable font-medium leading-tight">
              {title}
            </div>
          </div>
          <div className="px-1.5 py-0.5 rounded-md text-[9px] bg-white/20 text-white flex-shrink-0">
            {badgeText}
          </div>
        </div>

        {/* Middle Section - Left Aligned Value */}
        <div className="flex-1 flex items-center justify-start">
          <div className="text-xl font-bold text-white">
            {value}
          </div>
        </div>

        {/* Bottom Section - Chart */}
        <div className="h-[32px]">
          <Line
            data={{
              labels: Object.keys(chartData || {}).slice(0, 12),
              datasets: [{
                data: Object.values(chartData || {}).slice(0, 12),
                borderColor: chartColor,
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                fill: false,
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
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// FIX #1 — NEW: Debt Snapshot Card Component
// ─────────────────────────────────────────────
function DebtSnapshotCard({ totalInvoices, totalContracts, totalExpenses, totalPL }) {
  const [debtRange, setDebtRange] = useState('Jan 1% – 31 Dec 2%');

  const metrics = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#16a34a" strokeWidth="2" fill="#dcfce7"/>
          <polyline points="9 22 9 12 15 12 15 22" stroke="#16a34a" strokeWidth="2"/>
        </svg>
      ),
      value: fmtAutoKM(totalInvoices),
      label: 'after model Prepayment',
      sub: '20% of scheduled',
      valueColor: '#16a34a',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#ea580c" strokeWidth="2" fill="#ffedd5"/>
          <path d="M12 6v6l4 2" stroke="#ea580c" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      value: fmtAutoKM(totalContracts),
      label: 'after debit Prepayment',
      sub: '98% all aligned',
      valueColor: '#ea580c',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="7" width="20" height="14" rx="2" stroke="#2563eb" strokeWidth="2" fill="#dbeafe"/>
          <path d="M16 7V5a2 2 0 0 0-4 0v2" stroke="#2563eb" strokeWidth="2"/>
          <circle cx="12" cy="14" r="2" fill="#2563eb"/>
        </svg>
      ),
      value: fmtAutoKM(totalExpenses),
      label: 'Ahead of plan',
      sub: '',
      valueColor: '#2563eb',
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2" fill="#fee2e2"/>
          <path d="M12 8v4" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="1" fill="#dc2626"/>
        </svg>
      ),
      value: fmtAutoKM(totalPL),
      label: 'Debt Summary',
      sub: 'Target 200 days/day',
      valueColor: '#dc2626',
    },
  ];

  return (
    <CardShell className="h-[300px]">
      <div className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold font-poppins text-[var(--chathams-blue)]">Debt Snapshot</h3>
          {/* <div className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-[10px] text-gray-500">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="#9ca3af" strokeWidth="2"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="#9ca3af" strokeWidth="2"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="#9ca3af" strokeWidth="2"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="#9ca3af" strokeWidth="2"/>
            </svg>
            {debtRange}
          </div> */}
        </div>

        {/* 2x2 Metric Grid */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              className="flex flex-col gap-0.5 p-2 rounded-lg border border-[#b8ddf8] bg-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ scale: 1.02, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center gap-2">
                {m.icon}
              </div>
              <div className="text-lg font-bold mt-0.5" style={{ color: m.valueColor }}>
                {m.value}
              </div>
              <div className="responsiveTextTable text-gray-500 leading-tight">{m.label}</div>
              {m.sub && <div className="responsiveTextTable text-gray-400 leading-tight">{m.sub}</div>}
            </motion.div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

const Dash = () => {

  const { settings, dateSelect, setLoading, loading, ln } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();

  const [dataInvoices, setDataInvoices] = useState([]);
  const [dataContracts, setDataContracts] = useState([]);
  const [dataExpenses, setDataExpenses] = useState([]);
  const [dataPL, setDataPL] = useState([]);
  const [dataPieSupps, setDataPieSupps] = useState([]);
  const [dataPieClnts, setDataPieClnts] = useState([]);

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

      setLoading(false);
    };

    Object.keys(settings).length !== 0 && Load();

  }, [dateSelect, settings, uidCollection, setLoading]);

  const currentYear = dateSelect?.start?.substring(0, 4) || new Date().getFullYear();

  const totalPL = useMemo(() => dataPL.reduce((a, v) => a + (Number(v) || 0), 0), [dataPL]);
  const totalInvoices = useMemo(() => sumObj(dataInvoices), [dataInvoices]);
  const totalContracts = useMemo(() => sumObj(dataContracts), [dataContracts]);
  const totalExpenses = useMemo(() => sumObj(dataExpenses), [dataExpenses]);

  // Prepare horizontal bar data objects (use real dataPie* sources)
  const hbSupps = HorizontalBar(dataPieSupps || {});
  const hbClnts = HorizontalBar(dataPieClnts || {});

  const getInitials = (name = '') =>
    name
      .toString()
      .split(' ')
      .map((s) => s[0] || '')
      .slice(0, 2)
      .join('')
      .toUpperCase();

  // Calculate chart heights so rows align with avatar/name list and values
  const avatarSize = 26; // px for rounded avatar
  const rowHeight = avatarSize + 4; // px per row (avatar + gap)
  const hbSuppsRows = (hbSupps.obj.labels || []).length || 1;
  const hbClntsRows = (hbClnts.obj.labels || []).length || 1;
  const hbSuppsHeight = Math.max(120, hbSuppsRows * rowHeight);
  const hbClntsHeight = Math.max(120, hbClntsRows * rowHeight);

  // Ensure chart dataset bar thickness roughly matches avatar size so bars align vertically
  const normalizeChartData = (chartObj) => {
    if (!chartObj) return chartObj;
    const ds = chartObj.datasets?.map((d) => ({
      ...d,
      barThickness: Math.max(8, Math.round(avatarSize * 0.55)),
      categoryPercentage: 0.75,
      barPercentage: 0.9,
      borderRadius: { topLeft: 999, topRight: 999, bottomLeft: 0, bottomRight: 0 },
      borderSkipped: 'bottom',
    }));
    return { ...chartObj, datasets: ds };
  };

  const hbSuppsData = normalizeChartData(hbSupps.obj);
  const hbClntsData = normalizeChartData(hbClnts.obj);

  const makeChartOptions = (baseOptions, height) => {
    const base = baseOptions || {};
    const scales = base.scales || {};
    const y = scales.y || {};
    const x = scales.x || {};

    return {
      ...base,
      indexAxis: 'y',
      maintainAspectRatio: false,
      responsive: true,
      layout: {
        padding: {
          left: 0,
          right: 8,
          top: 8,
          bottom: 8,
        },
      },
      scales: {
        ...scales,
        y: {
          ...y,
          ticks: { display: false }, // hide labels (we render them to the left)
          grid: { display: false },
        },
        x: {
          ...x,
          grid: { color: (x.grid && x.grid.color) || '#f3f4f6' },
          ticks: {
            ...(x.ticks || {}),
            callback: (v) => fmtK(v),
            font: { size: 10 },
          },
        },
      },
    };
  };

  if (Object.keys(settings).length === 0) return <VideoLoader loading={true} fullScreen={true} />;

  return (
    <div className="w-full ">
      <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px] min-h-screen ">
      <Toast />
      <VideoLoader loading={loading} fullScreen={true} />

      <motion.div className="mb-4" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <MarketsTicker />
      </motion.div>

      {/* HEADER */}
      <motion.div className="mb-5 flex items-center justify-between" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
        <div>
          <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2">
            {getTtl('Dashboard', ln)}
          </h1>
          <p className="responsiveText text-gray-500 pl-3 mt-0.5">
            Financial overview and analytics
          </p>
        </div>
        <DateRangePicker />
        <TooltipComp txt="Select Dates Range" />
      </motion.div>

      {/* MAIN GRID */}
      <motion.div className="grid w-full grid-cols-1 lg:grid-cols-2 gap-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >

        {/* LEFT COLUMN */}
        <motion.div className="flex flex-col gap-4"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >

          {/* TOTAL REVENUE */}
          <CardShell className="h-[300px]">
            <div className="p-4 h-full flex flex-col">

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold font-poppins text-[var(--chathams-blue)]">
                  Total Revenue
                </h3>

              </div>

              <div className="flex-1 min-h-0">
             <Bar
  data={{
    labels: Object.keys(dataInvoices),
    datasets: [
      {
        label: 'TotalIncome',
        data: Object.values(dataInvoices),
        backgroundColor: '#4F99FF',
        borderRadius: { topLeft: 999, topRight: 999, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: 'bottom',
        barThickness: 'flex',
        maxBarThickness: 18,
      },
      {
        label: 'TotalOutcome',
        data: Object.values(dataContracts),
        backgroundColor: '#1D3A8A',
        borderRadius: { topLeft: 999, topRight: 999, bottomLeft: 0, bottomRight: 0 },
        borderSkipped: 'bottom',
        barThickness: 'flex',
        maxBarThickness: 18,
      }
    ]
  }}
  options={{
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: { size: 11 }
        }
      }
    },
    scales: {
      x: { 
        grid: { display: false },
        ticks: { font: { size: 10 } }
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: {
          callback: (v) => fmtK(v),
          font: { size: 10 }
        }
      }
    }
  }}
/>

              </div>

            </div>
          </CardShell>

          {/* SUPPLIERS */}
          <CardShell>
            <div className="p-4">
              <div className="flex justify-between mb-1">
                <div>
                  <h3 className="text-sm font-semibold font-poppins text-[var(--chathams-blue)]">Contracts - $</h3>
                  <p className="responsiveTextTable text-gray-400">Contribution breakdown by contract values</p>
                </div>
                <div className="text-right">
                  <div className="responsiveTextTable text-gray-400">Total Value</div>
                  <span className="font-bold text-[var(--chathams-blue)]">{fmtAutoKM(totalContracts)}</span>
                </div>
              </div>

              {/* Column Headers */}
              <div className="flex items-center gap-3 mb-2 mt-2">
                <div className="w-[116px] text-[9px] font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0 whitespace-nowrap">Client Name</div>
                <div className="flex-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wide text-center">Contribution Share (0 – 1.0)</div>
                <div className="w-16 text-right text-[9px] font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">Value</div>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                {(hbSupps.obj.labels || []).map((lbl, idx) => {
                  const rowCount = (hbSupps.obj.labels || []).length;
                  const barHeight = Math.max(14, Math.min(28, Math.round(28 - rowCount * 1.5)));
                  const colorPalette = [
                    '#38BDF8', '#22B0F0', '#7DD3F8', '#4F46E5',
                    '#7C6FE0', '#1477C0', '#2D3FB8', '#6366F1',
                    '#0A5EA8', '#8B7FE8'
                  ];
                  const color = colorPalette[idx % colorPalette.length];
                  const value = hbSuppsData?.datasets?.[0]?.data?.[idx] || 0;
                  const allValues = hbSuppsData?.datasets?.[0]?.data || [1];
                  const max = Math.max(...allValues);
                  const pct = max > 0 ? (value / max) * 100 : 0;

                  return (
                    <motion.div
                      key={idx}
                      className="flex items-center gap-2 mb-0.5"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.07 }}
                    >
                      {/* Avatar */}
                      <motion.div
                        className="flex items-center justify-center rounded-full text-xs font-semibold text-white flex-shrink-0"
                        style={{ width: avatarSize, height: avatarSize, background: color }}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {getInitials(lbl)}
                      </motion.div>

                      {/* Name */}
                      <div className="w-20 responsiveText text-gray-700 truncate flex-shrink-0">
                        {lbl}
                      </div>

                      {/* Bar */}
                      <motion.div className="flex-1 min-w-0">
                        <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height: `${barHeight}px` }}>
                          <motion.div
                            className="rounded-r-full h-full flex items-center pl-2"
                            style={{
                              width: `${pct}%`,
                              background: color,
                              minWidth: '42px',
                              borderRadius: '0 9999px 9999px 0'
                            }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.5, delay: idx * 0.07, ease: 'easeOut' }}
                            whileHover={{ scaleY: 1.1 }}
                          >
                            <span className="text-[9px] font-semibold text-white/95 leading-none">
                              {(max > 0 ? value / max : 0).toFixed(2)}
                            </span>
                          </motion.div>
                        </div>
                      </motion.div>

                      {/* Value */}
                      <motion.div className="w-16 text-right responsiveText text-gray-700 font-semibold flex-shrink-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: idx * 0.09 }}
                      >
                        {fmtAutoKM(value)}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardShell>

       {/* CLIENTS */}
          <CardShell>
            <div className="p-4">
              <div className="flex justify-between mb-1">
                <div>
                  <h3 className="text-sm font-semibold font-poppins text-[var(--chathams-blue)]">Consignees - $</h3>
                  <p className="responsiveTextTable text-gray-400">Contribution breakdown by client volume</p>
                </div>
                <div className="text-right">
                  <div className="responsiveTextTable text-gray-400">Total Value</div>
                  <span className="font-bold text-[var(--chathams-blue)]">{fmtAutoKM(totalInvoices)}</span>
                </div>
              </div>

              {/* Column Headers */}
              <div className="flex items-center gap-3 mb-2 mt-2">
                <div className="w-[116px] text-[9px] font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0 whitespace-nowrap">Client Name</div>
                <div className="flex-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wide text-center">Contribution Share (0 – 1.0)</div>
                <div className="w-16 text-right text-[9px] font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">Value</div>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                {(hbClnts.obj.labels || []).map((lbl, idx) => {
                  const rowCount = (hbClnts.obj.labels || []).length;
                  const barHeight = Math.max(14, Math.min(28, Math.round(28 - rowCount * 1.5)));
                  const colorPalette = [
                    '#38BDF8', '#22B0F0', '#7DD3F8', '#4F46E5',
                    '#7C6FE0', '#1477C0', '#2D3FB8', '#6366F1',
                    '#0A5EA8', '#8B7FE8'
                  ];
                  const color = colorPalette[idx % colorPalette.length];
                  const value = hbClntsData?.datasets?.[0]?.data?.[idx] || 0;
                  const allValues = hbClntsData?.datasets?.[0]?.data || [1];
                  const max = Math.max(...allValues);
                  const pct = max > 0 ? (value / max) * 100 : 0;
                  
                  return (
                    <motion.div
                      key={idx}
                      className="flex items-center gap-2 mb-0.5"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.07 }}
                    >
                      {/* Avatar */}
                      <motion.div
                        className="flex items-center justify-center rounded-full text-xs font-semibold text-white flex-shrink-0"
                        style={{ width: avatarSize, height: avatarSize, background: color }}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {getInitials(lbl)}
                      </motion.div>
                      {/* Name */}
                      <div className="w-20 responsiveText text-gray-700 truncate flex-shrink-0">
                        {lbl}
                      </div>
                      {/* Bar */}
                      <motion.div className="flex-1 min-w-0">
                        <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height: `${barHeight}px` }}>
                          <motion.div
                            className="rounded-r-full h-full flex items-center pl-2"
                            style={{
                              width: `${pct}%`,
                              background: color,
                              minWidth: '42px',
                              borderRadius: '0 9999px 9999px 0'
                            }} 
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.5, delay: idx * 0.07, ease: 'easeOut' }}
                            whileHover={{ scaleY: 1.1 }}
                          >
                            <span className="text-[9px] font-semibold text-white/95 leading-none">
                              {(max > 0 ? value / max : 0).toFixed(2)}
                            </span>
                          </motion.div>
                        </div>
                      </motion.div>
                      {/* Value */}
                      <motion.div className="w-16 text-right responsiveText text-gray-700 font-semibold flex-shrink-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: idx * 0.09 }}
                      >
                        {fmtAutoKM(value)}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardShell>

        </motion.div>

        {/* RIGHT COLUMN */}
        <motion.div className="flex flex-col gap-4 lg:sticky lg:top-[76px] lg:self-start"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* ─────────────────────────────────────────
              FIX #2 — REMOVED: Sales Overview line chart
              FIX #3 — ADDED: Debt Snapshot card (top-right)
              The Debt Snapshot now sits top-right, exactly
              mirroring Total Revenue on the left.
          ───────────────────────────────────────── */}
          <DebtSnapshotCard
            totalInvoices={totalInvoices}
            totalContracts={totalContracts}
            totalExpenses={totalExpenses}
            totalPL={totalPL}
          />

          {/* KPI GRID */}
          <div className="grid grid-cols-2 gap-3 auto-rows-fr flex-1">

            <StatKpiCard
              title="P&L"
              badgeText="Profit"
              value={fmtAutoKM(totalPL)}
              chartData={dataPL}
              grad="from-[#6B44C8] to-[#3E2090]"
              chartColor="rgba(255,255,255,0.95)"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="2"/><path d="M12 8v4l2 2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
              iconBg="rgba(255,255,255,0.2)"
            />
            <StatKpiCard
              title="Invoices"
              badgeText="Sales"
              value={fmtAutoKM(totalInvoices)}
              chartData={dataInvoices}
              grad="from-[#0E7058] to-[#09523E]"
              chartColor="rgba(255,255,255,0.95)"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" stroke="#fff" strokeWidth="2"/><path d="M8 10h8M8 14h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
              iconBg="rgba(255,255,255,0.2)"
            />
            <StatKpiCard
              title="Contracts & Expenses"
              badgeText="Costs"
              value={fmtAutoKM(totalContracts)}
              chartData={dataContracts}
              grad="from-[#C42840] to-[#902030]"
              chartColor="rgba(255,255,255,0.95)"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="2"/><path d="M12 8v4l2 2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
              iconBg="rgba(255,255,255,0.2)"
            />
            <StatKpiCard
              title="Sales Contracts"
              badgeText="Sales"
              value={fmtAutoKM(totalContracts)}
              chartData={dataContracts}
              grad="from-[#2255C8] to-[#1A3A98]"
              chartColor="rgba(255,255,255,0.95)"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="2"/><path d="M12 8v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M12 12l2 2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
              iconBg="rgba(255,255,255,0.2)"
            />
            <StatKpiCard
              title="Expenses"
              badgeText="Costs"
              value={fmtAutoKM(totalExpenses)}
              chartData={dataExpenses}
              grad="from-[#C42860] to-[#901040]"
              chartColor="rgba(255,255,255,0.95)"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="2"/><path d="M12 8v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M12 12l2 2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
              iconBg="rgba(255,255,255,0.2)"
            />
            <StatKpiCard
              title="Purchase Contracts"
              badgeText="Purchases"
              value={fmtAutoKM(totalInvoices)}
              chartData={dataInvoices}
              grad="from-[#BF6A18] to-[#8A3E0A]"
              chartColor="rgba(255,255,255,0.95)"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="10" rx="2" stroke="#fff" strokeWidth="2"/><path d="M9 11h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M9 14h4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
              iconBg="rgba(255,255,255,0.2)"
            />

          </div>

        </motion.div>

      </motion.div>

      </div>
    </div>
  );
}

export default Dash;