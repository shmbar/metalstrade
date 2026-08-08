'use client';
import { useContext, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { cssVar, cssVarRgba } from '../../../utils/chartTheme';
import { useTheme } from '../../../contexts/useThemeContext';
import Customtable from './newTable';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import MonthSelect from '../../../components/monthSelect';
import Toast from '../../../components/toast.js'
import { InvoiceContext } from "../../../contexts/useInvoiceContext";

import Spinner from '../../../components/spinner';
import VideoLoader from '../../../components/videoLoader';
import { TableSkeleton } from "../../../components/skeletons";
import { UserAuth } from "../../../contexts/useAuthContext"
import {
  loadData, sortArr, loadExpensesForAccounting, loadAdditionalCNFN,
  loadDocsByIdBatched
} from '../../../utils/utils'
import Spin from '../../../components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';
// chart.js + react-chartjs-2 are loaded on demand (not in the first-load bundle).
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import KpiStrip from '../../../components/KpiStrip';
import EditableCell from '../../../components/table/inlineEditing/EditableCell';
import EditableSelectCell from '../../../components/table/inlineEditing/EditableSelectCell';
import Tltip from '../../../components/tlTip';
import { updateExpenseField, updateInvoiceField } from '../../../utils/utils';
import { useGlobalSearch } from '../../../contexts/useGlobalSearchContext';



const Bar = dynamic(() => import('./LazyCharts').then((mod) => mod.Bar), { ssr: false });


const getprefixInv = (x) => {
  return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
    (x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN'
}

const getprefixInv1 = (x) => {
  return (x.invType === '1111' || x.invType === 'Invoice') ? 'Sales Invoice' :
    (x.invType === '2222' || x.invType === 'Credit Note') ? 'Credit Note' : 'Final Note'
}

const mergeArrays = (invArr, expArr) => {
  // Create a map of expenses based on invoice number
  const expenseMap = expArr.reduce((acc, expense) => {
    if (!acc[expense.invoice]) {
      acc[expense.invoice] = [];
    }
    acc[expense.invoice].push(expense);
    return acc;
  }, {});

  // Merge invoices and expenses
  let mergedArray = invArr.map(invoice => {
    const expenseList = expenseMap[invoice.invoice];
    if (expenseList && expenseList.length > 0) {
      const expense = expenseList.shift(); // Remove the first expense from the list
      return { ...invoice, ...expense };
    } else {
      return invoice; // If there are no expenses for this invoice, return the invoice itself
    }
  });

  // Add any remaining expenses without corresponding invoices
  Object.values(expenseMap).forEach(expenseList => {
    expenseList.forEach(expense => {
      mergedArray.push({ ...{ num: null, dateInv: null, saleInvoice: null, clientInv: null, amountInv: null, invType: null }, ...expense });
    });
  });


  let i = 1;
  mergedArray = sortArr(mergedArray, 'invoice').map((item, k, array) => {
    const previousItem = array[k - 1];

    let numb = k === 0 ? i :
      item.invoice.toString() === previousItem?.invoice.toString() ? i : i + 1

    if (item.invoice.toString() !== previousItem?.invoice.toString() && k !== 0) {
      i = i + 1
    }

    let span = null;
    if (item.invoice.toString() !== previousItem?.invoice.toString()) {
      span = mergedArray.filter(z => z.invoice.toString() === item.invoice.toString()).length
    }
    return span === null ? { ...item, num: numb } : { ...item, num: numb, span: span };
  });

  let lt = ['dateInv', 'saleInvoice', 'clientInv', 'amountInv', 'invType', 'dateExp', 'expInvoice',
    'clientExp', 'amountExp', 'expType']

  mergedArray.forEach(obj => {
    lt.forEach(key => {
      if (!(key in obj)) {
        obj[key] = ''; // Add the missing key with an empty value
      }
    });
  });

  return mergedArray
}

const makeGroup = (arr) => {
  const groupedByPoSupplierId = arr.reduce((acc, invoice) => {
    const poSupplierId = invoice.poSupplier?.id; // Safely access poSupplier.id
    if (poSupplierId) {
      // If the poSupplier.id exists, group by this id
      if (!acc[poSupplierId]) {
        acc[poSupplierId] = [];
      }
      acc[poSupplierId].push([invoice]);
    }
    return acc;
  }, {});

  return groupedByPoSupplierId;
}

// const loadContracts = async (uidCollection, invoice) => {
//   let obj = invoice[0][0].poSupplier

//   let con = await loadInvoice(uidCollection, 'contracts', obj)
//   return con;
// }


const Accounting = () => {

  const { invoicesAccData, setInvoicesAccData } = useContext(InvoiceContext);

  const { settings, dateSelect, setLoading, loading, ln } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  const { upsertSourceItems } = useGlobalSearch();
  const settingsLoaded = Object.keys(settings).length > 0;
  const clientCount = settings.Client?.Client?.length || 0;
  const supplierCount = settings.Supplier?.Supplier?.length || 0;
  const currencyCount = settings.Currency?.Currency?.length || 0;


  const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''


  useEffect(() => {

    const Load = async () => {
      setLoading(true)

      let dt = await loadData(uidCollection, 'invoices', dateSelect);

      //load credit/final notes if any
      const cnOrfn = dt.filter(({ invoice, invType, cnORfl }) =>
        dt.filter(item => item.invoice === invoice).length === 1 &&
        ['1111', 'invoice'].includes(invType) && cnORfl !== undefined && cnORfl !== null).
        map(z => z.cnORfl);


      //remove invoices that have only invtype:3333/2222 and dont have original in the same period
      dt = dt.filter(z => dt.find(x => x.invoice === z.invoice && x.invType === '1111') ||
        (z.invType === '1111' || z.invType === 'Invoice'))


      // Load additional invoices that that their original in the selected period but they may be in other periods
      let cnfnData = await loadAdditionalCNFN(uidCollection, cnOrfn)
      dt = sortArr([...dt, ...cnfnData], 'invoice') //array of all invoices

      let invArr = [];
      for (let i = 0; i < dt.length; i++) {
        const l = dt[i];

        let item = {
          dateInv: l.final ? l.date : l.dateRange.endDate,
          saleInvoice: l.invoice + getprefixInv(l),
          clientInv: l.final ? l.client.id || l.client : l.client,              // store ID
          clientInvName: l.final ? l.client.nname : gQ(l.client, 'Client', 'nname'),    // for display
          amountInv: l.totalAmount,
          invType: getprefixInv1(l),
          invoice: l.invoice,
          curINV: l.final ? l.cur.cur : gQ(l.cur, 'Currency', 'cur'),
          invoiceId: l.id,
          invoiceDate: l.dateRange?.startDate ?? l.date
        }
        invArr = [...invArr, item]
      }

      //load purchase invoice

      let arr1 = dt.map(z => z.poSupplier)

      arr1 = arr1.filter((item, index, self) => //filter duplicates
        index === self.findIndex((t) => (
          t.id === item.id && t.order === item.order && t.date === item.date
        ))
      );

      // Batched: one ≤30-id `in` query per year instead of one getDoc per contract.
      // Mapping the index back over arr1 keeps the old order; missing refs fall back
      // to {} exactly like loadInvoice did (the forEach below then skips them).
      const contractsById = await loadDocsByIdBatched(uidCollection, 'contracts', arr1);
      const arrContracts = arr1.map(obj => contractsById[obj.id] ?? {});


      let consArr = []
      arrContracts.forEach(contract => {
        // Firestore docs may be missing poInvoices / dateRange / inner invRef.
        // Without these guards the whole Load() throws → setLoading(false)
        // never runs → page stays on the loading spinner forever.
        if (!contract || !Array.isArray(contract.poInvoices)) return;
        contract.poInvoices.forEach(poInvoice => {
          if (!poInvoice || !Array.isArray(poInvoice.invRef)) return;
          poInvoice.invRef.forEach(ref => {
            if (invArr.map(z => z.saleInvoice).includes(ref)) {
              let item = {
                num: '',
                dateExp: contract.dateRange?.endDate,
                expInvoice: poInvoice.inv,
                clientExp: contract.supplier,
                amountExp: poInvoice.invValue,
                expType: 'Purchase',
                invoice: ref,
                curEX: gQ(contract.cur, 'Currency', 'cur')
              }
              consArr = [...consArr, item]
            }
          })
        })
      })



      let expArr = dt.filter(x => Array.isArray(x.expenses) && x.expenses.length).map(x => x.expenses).flat()
      let expData = await loadExpensesForAccounting(uidCollection, expArr) // array of expenses

      expArr = [];
      for (let i = 0; i < expData.length; i++) {
        const l = expData[i];

        let item = {
          num: '',
          dateExp: l.dateRange.endDate,
          expInvoice: l.expense,
          clientExp: l.supplier,
          amountExp: l.amount,
          expType: l.expType,
          invoice: String(l.salesInv || '').replace(/\D/g, ''),
          curEX: gQ(l.cur, 'Currency', 'cur'),
          expenseId: l.id,
          expenseDate: l.dateRange?.startDate ?? l.date
        }
        expArr = [...expArr, item]
      }

      expArr = [...expArr, ...consArr] //merge contracts and expenses
      expArr = sortArr(expArr, 'invoice')

      dt = mergeArrays(invArr, expArr)

      setInvoicesAccData(dt)
      setLoading(false)
    }

    if (!uidCollection || !settingsLoaded) return;
    Load();

  }, [dateSelect, settingsLoaded, clientCount, supplierCount, currencyCount, uidCollection])


  useEffect(() => {
    if (!invoicesAccData || invoicesAccData.length === 0 || Object.keys(settings).length === 0) {
      upsertSourceItems('accounting', []);
      return;
    }

    const items = invoicesAccData.map((row, idx) => {
      // Determine source + navigation
      const isExpense = !!row.expenseId;
      const isInvoice = !!row.invoiceId && !row.expenseId;
      const isPurchase = row.expType === 'Purchase';

      let route = '/accounting';
      let rowId = idx.toString(); // fallback

      if (isExpense) {
        route = '/expenses';
        rowId = row.expenseId;
      } else if (isInvoice) {
        route = '/invoices';
        rowId = row.invoiceId;
      } else if (isPurchase) {
        route = '/contracts';
        rowId = row.invoice;
      }

      const clientLabel =
        row.clientExp
          ? gQ(row.clientExp, 'Supplier', 'nname')
          : row.clientInvName || '';

      const amount =
        row.amountInv != null ? row.amountInv :
          row.amountExp != null ? row.amountExp : '';

      return {
        key: `accounting_${idx}`,
        route,
        rowId,

        title: `Accounting • ${clientLabel || 'Transaction'}`,
        subtitle: `${row.saleInvoice || row.expInvoice || ''} • ${amount}`,

        searchText: [
          clientLabel,
          row.saleInvoice,
          row.expInvoice,
          row.invoice,
          row.expType,
          row.invType,
          amount,
        ].filter(Boolean).join(' ')
      };
    });

    upsertSourceItems('accounting', items);
  }, [invoicesAccData, settings]);


  let showAmountExp = (x) => {

    return x.row.original.expInvoice ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: x.row.original.curEX || 'USD',
      minimumFractionDigits: 2
    }).format(Number(x.getValue()) || 0) : ''
  }

  let showAmountInv = (x) => {

    return x.row.original.saleInvoice ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: x.row.original.curINV || 'USD',
      minimumFractionDigits: 2
    }).format(Number(x.getValue()) || 0) : ''
  }



  let propDefaults = Object.keys(settings).length === 0 ? [] : [
    {
      accessorKey: 'num', header: '#', cell: (props) => <p className='text-center'>{props.getValue()}</p>,
      enableColumnFilter: false,
      meta: { excludeFromQuickSum: true },
    },
    {
      accessorKey: 'dateExp', header: getTtl('Date', ln), cell: (props) => <p>{props.getValue() ? dateFormat(props.getValue(), 'dd.mm.yy') : ''}</p>,
      meta: {
        filterVariant: 'dates',
      },
      filterFn: 'dateBetweenFilterFn'
    },
    { accessorKey: 'expInvoice', header: getTtl('Expense Invoice', ln) + '#', cell: (props) => { const isEditMode = !!props.table?.options?.meta?.isEditMode; if (isEditMode) return <EditableCell {...props} />; const val = props.getValue() ?? ''; const isTrunc = val.length > 14; return <Tltip tltpText={val} show={isTrunc} direction="top"><span className="cursor-default">{isTrunc ? val.slice(0, 14) + '\u2026' : val}</span></Tltip>; }, meta: { excludeFromQuickSum: true } },
    {
      accessorKey: 'clientExp',
      header: getTtl('Supplier', ln),
      cell: EditableSelectCell,
      meta: {
        options: settings.Supplier?.Supplier?.map(s => ({
          value: s.id,
          label: s.nname
        })) ?? []
      }
    },
    { accessorKey: 'amountExp', header: getTtl('Amount', ln), cell: EditableCell },

    {
      accessorKey: 'expType',
      header: getTtl('Expense Type', ln),
      cell: EditableSelectCell,
      meta: {
        options: settings.Expenses?.Expenses?.map(e => ({
          value: e.id,
          label: e.expType
        })) ?? []
      }
    },


    { accessorKey: 'dateInv', header: getTtl('Date', ln), cell: (props) => <p>{props.getValue() ? dateFormat(props.getValue(), 'dd.mm.yy') : ''}</p>, meta: { excludeFromQuickSum: true } },
    { accessorKey: 'saleInvoice', header: getTtl('Invoice', ln), cell: (props) => <p>{props.getValue()}</p>, meta: { excludeFromQuickSum: true } },
    {
      accessorKey: 'clientInv',
      header: getTtl('Consignee', ln),
      cell: EditableSelectCell,
      meta: {
        options: settings.Client?.Client?.map(c => ({
          value: c.id,
          label: c.nname
        })) ?? []
      }
    },

    { accessorKey: 'amountInv', header: getTtl('Amount', ln), cell: (props) => <p>{showAmountInv(props)}</p> },
    { accessorKey: 'invType', header: getTtl('Invoice Type', ln), cell: (props) => <p>{props.getValue()}</p> },

  ];

  // Calculate totals from data
  const totals = useMemo(() => {
    const totalIncome = invoicesAccData.reduce((sum, item) => sum + (Number(item.amountInv) || 0), 0);
    const totalExpense = invoicesAccData.reduce((sum, item) => sum + (Number(item.amountExp) || 0), 0);
    const balance = totalIncome - totalExpense;
    return { totalIncome, totalExpense, balance, savings: balance > 0 ? balance * 0.2 : 0 };
  }, [invoicesAccData]);

  // Chart data for Debit & Credit Overview
  const chartData = useMemo(() => {
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const debitByDay = new Array(7).fill(0);
    const creditByDay = new Array(7).fill(0);

    invoicesAccData.forEach(item => {
      if (item.amountExp && item.dateExp) {
        const d = new Date(item.dateExp);
        if (!isNaN(d)) {
          const day = d.getDay(); // 0=Sun … 6=Sat
          const idx = day === 6 ? 0 : day + 1; // Sat→0, Sun→1 … Fri→6
          debitByDay[idx] += Number(item.amountExp) || 0;
        }
      }
      if (item.amountInv && item.dateInv) {
        const d = new Date(item.dateInv);
        if (!isNaN(d)) {
          const day = d.getDay();
          const idx = day === 6 ? 0 : day + 1;
          creditByDay[idx] += Number(item.amountInv) || 0;
        }
      }
    });

    return {
      labels: days,
      datasets: [
        {
          label: 'Debit',
          data: debitByDay,
          backgroundColor: cssVar('--endeavour', '#6D5CE0'),
          borderRadius: 6,
          barPercentage: 0.6,
        },
        {
          label: 'Credit',
          data: creditByDay,
          backgroundColor: cssVar('--rock-blue', '#DAD6E8'),
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    };
  }, [invoicesAccData, isDarkTheme]);

  const fmtChartVal = (v) => {
    const abs = Math.abs(v);
    if (abs >= 1000000000) return '$' + (v / 1000000000).toFixed(2) + 'B';
    if (abs >= 1000000) return '$' + (v / 1000000).toFixed(2) + 'M';
    if (abs >= 1000) return '$' + (v / 1000).toFixed(2) + 'K';
    return '$' + v;
  };

  // Canvas can't resolve CSS vars, so cssVar() reads the computed token and
  // falls back to a literal — this tracks whichever colour preset is active.
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: cssVarRgba('--surface-card-rgb', 0.97, 'rgba(255,255,255,0.97)'),
        titleColor: cssVar('--port-gore', '#1E1B39'),
        bodyColor: cssVar('--regent-gray', '#6E6B84'),
        borderColor: cssVar('--border-cell', '#EAE8F2'),
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${fmtChartVal(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: cssVarRgba('--border-cell-rgb', 0.6, 'rgba(234,232,242,0.6)') },
        ticks: { color: cssVar('--regent-gray', '#6E6B84'), font: { size: 11 }, callback: fmtChartVal },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { color: cssVar('--regent-gray', '#6E6B84'), font: { size: 11 } },
        border: { display: false },
      },
    },
  };

  // Get recent transactions (last 5)
  const recentTransactions = useMemo(() => {
    return invoicesAccData.slice(0, 5);
  }, [invoicesAccData]);

  // Get recent invoices sent
  const recentInvoices = useMemo(() => {
    return invoicesAccData.filter(x => x.saleInvoice).slice(0, 4);
  }, [invoicesAccData]);

  const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return '$0';
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (absAmount >= 1000000000000) {
      return sign + '$' + (absAmount / 1000000000000).toFixed(2) + 'T';
    } else if (absAmount >= 1000000000) {
      return sign + '$' + (absAmount / 1000000000).toFixed(2) + 'B';
    } else if (absAmount >= 1000000) {
      return sign + '$' + (absAmount / 1000000).toFixed(2) + 'M';
    } else if (absAmount >= 1000) {
      return sign + '$' + (absAmount / 1000).toFixed(2) + 'K';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyFull = (amount) => {
    if (amount == null || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value) => {
    if (!isFinite(value) || isNaN(value)) return '0%';
    if (Math.abs(value) > 999) return value > 0 ? '>999%' : '<-999%';
    return value.toFixed(2) + '%';
  };

  const onCellUpdate = async ({ rowIndex, columnId, value }) => {
    const row = invoicesAccData[rowIndex];
    if (!row) return;

    if (row.expType === 'Purchase') return;

    const prev = invoicesAccData;
    const next = prev.map((x, i) =>
      i === rowIndex ? { ...x, [columnId]: value } : x
    );
    setInvoicesAccData(next);

    try {
      // EXPENSE SIDE
      if (['expInvoice', 'amountExp', 'expType', 'clientExp'].includes(columnId)) {
        if (!row.expenseId || !row.expenseDate)
          throw new Error("Missing expense mapping");

        const patch =
          columnId === 'expInvoice' ? { expense: value } :
            columnId === 'amountExp' ? { amount: parseFloat(value) || 0 } :
              columnId === 'expType' ? { expType: value } :
                columnId === 'clientExp' ? { supplier: value } : {};

        await updateExpenseField(
          uidCollection,
          row.expenseId,
          row.expenseDate,
          patch
        );
      }

      // INVOICE SIDE
      if (columnId === 'clientInv') {
        if (!row.invoiceId || !row.invoiceDate)
          throw new Error("Missing invoice mapping");

        await updateInvoiceField(
          uidCollection,
          row.invoiceId,
          row.invoiceDate,
          { client: value }
        );
      }

    } catch (e) {
      console.error(e);
      setInvoicesAccData(prev); // revert
    }
  };

  return (
    <div className="w-full ">
      <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
        {Object.keys(settings).length === 0 ? <TableSkeleton /> :
          <>
            <Toast />
            <VideoLoader loading={loading} fullScreen={true} />

            {/* Header + Stats Wrapper */}
            {/* Page header */}
            <div className="page-header flex items-end justify-between flex-wrap gap-2 mt-6 mb-3 px-1">
              <div>
                <h1 className="text-display">{getTtl('Accounting', ln)}</h1>
                <p className="responsiveTextInput text-[var(--ink-muted)] mt-0.5">Transactions overview</p>
              </div>
            </div>

            {/* KPI strip — same card language as contracts/invoices/stocks */}
            <KpiStrip items={[
              { label: 'My Balance', value: totals.balance, format: formatCurrency, icon: Wallet, tone: 'blue' },
              { label: 'Income', value: totals.totalIncome, format: formatCurrency, icon: TrendingUp, tone: 'green' },
              { label: 'Expense', value: totals.totalExpense, format: formatCurrency, icon: TrendingDown, tone: 'red' },
              { label: 'Savings', value: totals.savings, format: formatCurrency, icon: PiggyBank, tone: 'amber' },
            ]} />
            {/* Full Table */}
            <div className="page-card rounded-2xl p-3 sm:p-5 mt-2 border border-[var(--line)] shadow-card w-full bg-[var(--bg-card)] relative">
              <h3 className="text-title mb-4">All Transactions</h3>
              <Customtable data={invoicesAccData} columns={propDefaults} onCellUpdate={onCellUpdate}
                excellReport={EXD(invoicesAccData, settings, getTtl('Accounting', ln), ln)} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6 mt-3">
              {/* Last Transaction */}
              <div className="rounded-2xl p-3 sm:p-5 mt-2 border border-[var(--line)] shadow-xl w-full bg-[var(--bg-subtle)]">
                <h3 className="responsiveText font-medium font-sans text-[var(--chathams-blue)] mb-2">Last Transaction</h3>
                <div className="space-y-0">
                  {recentTransactions.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-[var(--selago)] last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[var(--selago)] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[var(--endeavour)] responsiveText font-medium font-sans">
                            {(gQ(item.clientExp, 'Supplier', 'nname') || item.clientInvName || item.clientInv || 'N').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="responsiveText font-medium font-sans text-[var(--chathams-blue)] truncate">
                            {gQ(item.clientExp, 'Supplier', 'nname') || item.clientInvName || item.clientInv || 'Transaction'}
                          </p>
                          <p className="responsiveTextTable text-[var(--regent-gray)] font-sans">
                            {item.dateExp ? dateFormat(item.dateExp, 'dd mmm yyyy') : item.dateInv ? dateFormat(item.dateInv, 'dd mmm yyyy') : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="responsiveTextTable text-[var(--regent-gray)] font-sans">{item.expType || item.invType || ''}</p>
                        <p className={`responsiveText font-medium font-sans ${item.amountInv ? 'text-emerald-500' : 'text-red-500'}`}>
                          {item.amountInv ? '+' : '-'}{formatCurrency(item.amountInv || item.amountExp || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoices Sent */}
              <div className="rounded-2xl p-3 sm:p-5 mt-2 border border-[var(--line)] shadow-xl w-full bg-[var(--bg-subtle)]">
                <h3 className="responsiveText font-medium font-sans text-[var(--chathams-blue)] mb-2">Invoices Sent</h3>
                <div className="space-y-0">
                  {recentInvoices.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-[var(--selago)] last:border-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 bg-[var(--rock-blue)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[var(--chathams-blue)] responsiveText font-medium font-sans">
                            {(item.clientInvName || item.clientInv || 'C').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="responsiveTextTable text-[var(--regent-gray)] font-sans">{item.saleInvoice || 'Invoice'}</p>
                          <p className="responsiveText font-medium font-sans text-[var(--chathams-blue)] truncate">{item.clientInvName || item.clientInv || 'Client'}</p>
                          <p className="responsiveTextTable text-[var(--regent-gray)] font-sans">
                            {item.dateInv ? dateFormat(item.dateInv, 'dd mmm yyyy') : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="responsiveText font-medium font-sans text-[var(--chathams-blue)] mb-0.5">{formatCurrency(item.amountInv || 0)}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full responsiveTextTable font-medium font-sans ${idx % 2 === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--neutral-bg)] text-[var(--regent-gray)]'
                          }`}>
                          {idx % 2 === 0 ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              {/* Debit & Credit Overview */}
              <div className="rounded-2xl p-3 sm:p-5 mt-2 border border-[var(--line)] shadow-xl w-full bg-[var(--bg-subtle)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <div className="min-w-0">
                    <h3 className="responsiveText font-medium font-sans text-[var(--chathams-blue)]">Debit & Credit Overview</h3>
                    <p className="responsiveText text-[var(--regent-gray)] truncate">
                      {formatCurrency(totals.totalExpense)} Debited & {formatCurrency(totals.totalIncome)} Credited
                    </p>
                  </div>
                  <div className="flex items-center gap-4 responsiveText flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[var(--brand-deep)]"></span>
                      <span className="text-[var(--regent-gray)]">Debit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[var(--rock-blue)]"></span>
                      <span className="text-[var(--regent-gray)]">Credit</span>
                    </div>
                  </div>
                </div>
                <div className="h-52">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>
              {/* Summary Stats */}
              <div className="rounded-2xl p-3 sm:p-5 mt-2 border border-[var(--line)] shadow-xl bg-[var(--bg-subtle)] overflow-hidden">
                <h3 className="responsiveText font-medium font-sans text-[var(--chathams-blue)] mb-4">Financial Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-subtle)] rounded-2xl p-4 overflow-hidden border border-[var(--line)] shadow-sm">
                    <p className="text-[var(--port-gore)] responsiveText mb-1">Total Transactions</p>
                    <p className="responsiveTextTotal font-medium text-[var(--chathams-blue)]">{invoicesAccData.length}</p>
                  </div>
                  <div className="bg-[var(--bg-subtle)] rounded-2xl p-4 overflow-hidden border border-[var(--line)] shadow-sm">
                    <p className="text-[var(--port-gore)] responsiveText mb-1">Avg. Transaction</p>
                    <p className="responsiveTextTotal font-medium text-[var(--chathams-blue)] truncate">
                      {formatCurrency(invoicesAccData.length > 0 ? (totals.totalIncome + totals.totalExpense) / invoicesAccData.length : 0)}
                    </p>
                  </div>
                  <div className="bg-[var(--bg-subtle)] rounded-2xl p-4 overflow-hidden border border-[var(--line)] shadow-sm">
                    <p className="text-[var(--port-gore)] responsiveText mb-1">Net Profit</p>
                    <p className="responsiveTextTotal font-medium text-[var(--chathams-blue)] truncate">{formatCurrency(totals.balance)}</p>
                  </div>
                  <div className="bg-[var(--bg-subtle)] rounded-2xl p-4 overflow-hidden border border-[var(--line)] shadow-sm">
                    <p className="text-[var(--port-gore)] responsiveText mb-1">Profit Margin</p>
                    <p className="responsiveTextTotal font-medium text-[var(--chathams-blue)]">
                      {formatPercent(totals.totalIncome > 0 ? (totals.balance / totals.totalIncome) * 100 : 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        }
      </div>
    </div>
  );
}

export default Accounting;
