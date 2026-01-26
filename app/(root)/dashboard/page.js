
'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import Spinner from '@components/spinner';
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
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

function StatKpiCard({
  title,
  badgeText,
  value,
  chartData,
  chartColor = "rgba(255,255,255,0.92)",
  grad = "from-red-500 to-rose-600",
}) {
  return (
    <div
      className={`relative h-full min-h-[120px] rounded-xl overflow-hidden bg-gradient-to-br ${grad} shadow-md hover:shadow-lg transition-all duration-300`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-white/90 text-[11px] font-medium">
              {title}
            </div>
            <div className="text-xl font-bold text-white">
              {value}
            </div>
          </div>

          <div className="px-2 py-0.5 rounded-md text-[10px] bg-white/20 text-white">
            {badgeText}
          </div>
        </div>

        <div className="h-[38px] mt-1">
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
    </div>
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
  const avatarSize = 36; // px for rounded avatar
  const rowHeight = avatarSize + 8; // px per row (avatar + gap)
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

  if (Object.keys(settings).length === 0) return <Spinner />;

  return (

    <div className="w-full overflow-x-hidden">
      <div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px] min-h-screen ">
      <Toast />
      {loading && <Spin />}

      <div className="mb-4">
        <MarketsTicker />
      </div>

      {/* HEADER */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {getTtl('Dashboard', ln)}
          </h1>
          <p className="text-xs text-gray-500">
            Financial overview and analytics
          </p>
        </div>

       
          <DateRangePicker />
          <TooltipComp txt="Select Dates Range" />
        
      </div>

      {/* MAIN GRID */}
      <div className="grid w-full grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">

          {/* TOTAL REVENUE */}
          <CardShell>
            <div className="p-4">

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Total Revenue
                </h3>

              </div>

              <div className="h-[200px]">
             <Bar
  data={{
    labels: Object.keys(dataInvoices),
    datasets: [
      {
        label: 'TotalIncome',
        data: Object.values(dataInvoices),
        backgroundColor: '#4F99FF', // Total Income
        borderRadius: 4,
        barThickness: 'flex',
        maxBarThickness: 18,
      },
      {
        label: 'TotalOutcome',
        data: Object.values(dataContracts),
        backgroundColor: '#1D3A8A', // Total Outcome
        borderRadius: 4,
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
              <div className="flex justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Contracts - $
                </h3>
                <span className="font-bold text-gray-800">
                  {fmtAutoKM(totalContracts)}
                </span>
              </div>

              <div className="min-h-[200px]">
                {(hbSupps.obj.labels || []).map((lbl, idx) => {
                  const color = hbSupps.obj.datasets?.[0]?.backgroundColor?.[idx] || '#9fb8d4';
                  const value = hbSuppsData?.datasets?.[0]?.data?.[idx] || 0;
                  const allValues = hbSuppsData?.datasets?.[0]?.data || [1];
                  const max = Math.max(...allValues);
                  const pct = max > 0 ? (value / max) * 100 : 0;

                  return (
                    <div key={idx} className="flex items-center gap-3 mb-3">
                      {/* Avatar */}
                      <div
                        className="flex items-center justify-center rounded-full text-xs font-semibold text-white flex-shrink-0"
                        style={{ width: avatarSize, height: avatarSize, background: color }}
                      >
                        {getInitials(lbl)}
                      </div>

                      {/* Name */}
                      <div className="w-20 text-xs text-gray-700 truncate flex-shrink-0">
                        {lbl}
                      </div>

                      {/* Bar */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="rounded-sm transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            height: 20,
                            background: color,
                            minWidth: '8px'
                          }}
                        />
                      </div>

                      {/* Value */}
                      <div className="w-20 text-right text-xs text-gray-700 font-semibold flex-shrink-0">
                        {fmtAutoKM(value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardShell>

       {/* CLIENTS */}
          <CardShell>
            <div className="p-4">
              <div className="flex justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">
                  Co-signed - $
                </h3>
                <span className="font-bold text-gray-800">
                  {fmtAutoKM(totalInvoices)}
                </span>
              </div>

              <div className="min-h-[200px]">
                {(hbClnts.obj.labels || []).map((lbl, idx) => {
                  const color = hbClnts.obj.datasets?.[0]?.backgroundColor?.[idx] || '#9fb8d4';
                  const value = hbClntsData?.datasets?.[0]?.data?.[idx] || 0;
                  const allValues = hbClntsData?.datasets?.[0]?.data || [1];
                  const max = Math.max(...allValues);
                  const pct = max > 0 ? (value / max) * 100 : 0;
                  
                  return (
                    <div key={idx} className="flex items-center gap-3 mb-3">
                      {/* Avatar */}
                      <div
                        className="flex items-center justify-center rounded-full text-xs font-semibold text-white flex-shrink-0"
                        style={{ width: avatarSize, height: avatarSize, background: color }}
                      >
                        {getInitials(lbl)}
                      </div>
                      
                      {/* Name */}
                      <div className="w-20 text-xs text-gray-700 truncate flex-shrink-0">
                        {lbl}
                      </div>
                      
                      {/* Bar */}
                      <div className="flex-1 min-w-0">
                        <div 
                          className="rounded-sm transition-all duration-300" 
                          style={{ 
                            width: `${pct}%`, 
                            height: 20, 
                            background: color,
                            minWidth: '8px'
                          }} 
                        />
                      </div>
                      
                      {/* Value */}
                      <div className="w-20 text-right text-xs text-gray-700 font-semibold flex-shrink-0">
                        {fmtAutoKM(value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardShell>

        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4 h-full">
          {/* SALES OVERVIEW */}
          <CardShell>
            <div className="p-4">

              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Sales Overview
                </h3>
              
              </div>

              <div className="h-[200px]">
              <Line
  data={{
    labels: Object.keys(dataInvoices),
    datasets: [
      {
        label: 'TotalSales',
        data: Object.values(dataInvoices),
        borderColor: '#4F99FF',
        backgroundColor: 'rgba(79, 153, 255, 0.15)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#4F99FF'
      },
      {
        label: 'TotalRevenue',
        data: Object.values(dataContracts),
        borderColor: '#1D3A8A',
        backgroundColor: 'rgba(29, 58, 138, 0.15)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#1D3A8A'
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
        ticks: { font: { size: 10 } }
      }
    }
  }}
/>

              </div>

            </div>
          </CardShell>

          {/* KPI GRID */}
          <div className="grid grid-cols-2 gap-3 auto-rows-fr flex-1">

            <StatKpiCard 
              title="P&L" 
              badgeText="Profit" 
              value={fmtAutoKM(totalPL)} 
              chartData={dataPL} 
              grad="from-pink-500 to-rose-600" 
              chartColor="rgba(255,255,255,0.95)"
            />
            
            <StatKpiCard 
              title="Invoices" 
              badgeText="Sales" 
              value={fmtAutoKM(totalInvoices)} 
              chartData={dataInvoices} 
              grad="from-yellow-500 to-amber-500" 
              chartColor="rgba(255,255,255,0.95)"
            />
            
            <StatKpiCard 
              title="Sales" 
              badgeText="Contracts" 
              value={fmtAutoKM(totalContracts)} 
              chartData={dataContracts} 
              grad="from-blue-500 to-blue-600" 
              chartColor="rgba(255,255,255,0.95)"
            />
            
            <StatKpiCard 
              title="Costs" 
              badgeText="Expenses" 
              value={fmtAutoKM(totalExpenses)} 
              chartData={dataExpenses} 
              grad="from-pink-600 to-fuchsia-600" 
              chartColor="rgba(255,255,255,0.95)"
            />
            
            <StatKpiCard 
              title="Expenses" 
              badgeText="Cost" 
              value={fmtAutoKM(totalExpenses)} 
              chartData={dataExpenses} 
              grad="from-teal-500 to-cyan-600" 
              chartColor="rgba(255,255,255,0.95)"
            />
            
            <StatKpiCard 
              title="Purchases" 
              badgeText="Orders" 
              value={fmtAutoKM(totalInvoices)} 
              chartData={dataInvoices} 
              grad="from-emerald-500 to-green-600" 
              chartColor="rgba(255,255,255,0.95)"
            />

          </div>

        </div>

      </div>

      </div>
    </div>
  );
}

export default Dash;