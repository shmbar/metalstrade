'use client';
import { useContext, useEffect, useMemo } from 'react';
import Customtable from './newTable';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import MonthSelect from '../../../components/monthSelect';
import Toast from '../../../components/toast.js'
import { InvoiceContext } from "../../../contexts/useInvoiceContext";

import Spinner from '../../../components/spinner';
import { UserAuth } from "../../../contexts/useAuthContext"
import {
  loadData, sortArr, loadExpensesForAccounting, loadAdditionalCNFN,
  loadInvoice
} from '../../../utils/utils'
import Spin from '../../../components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { FaWallet, FaArrowTrendUp, FaArrowTrendDown, FaPiggyBank } from 'react-icons/fa6';
import EditableCell from '../../../components/table/inlineEditing/EditableCell';
import EditableSelectCell from '../../../components/table/inlineEditing/EditableSelectCell';
import { updateExpenseField, updateInvoiceField } from '../../../utils/utils';
import { useGlobalSearch } from '../../../contexts/useGlobalSearchContext';



ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


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

const loadContracts = async (uidCollection, invoice) => {
  let obj = invoice[0][0].poSupplier

  let con = await loadInvoice(uidCollection, 'contracts', obj)
  return con;
}


const Accounting = () => {

  const { invoicesAccData, setInvoicesAccData } = useContext(InvoiceContext);
  
  const { settings, dateSelect, setLoading, loading, ln } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();
const { upsertSourceItems } = useGlobalSearch();


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
          clientInv: l.client,              // store ID
clientInvName: l.client.nname,    // for display
          amountInv: l.totalAmount,
          invType: getprefixInv1(l),
          invoice: l.invoice,
 curINV: l.final ? l.cur.cur : gQ(l.cur, 'Currency', 'cur'),
           invoiceId: l.id,
  invoiceDate: l.dateRange?.startDate ?? l.date        }
        invArr = [...invArr, item]
      }

      //load purchase invoice

      let arr1 = dt.map(z => z.poSupplier)

      arr1 = arr1.filter((item, index, self) => //filter duplicates
        index === self.findIndex((t) => (
          t.id === item.id && t.order === item.order && t.date === item.date
        ))
      );

      let arrContracts = [];
      for (let i = 0; i < arr1.length; i++) {
        let con = await loadInvoice(uidCollection, 'contracts', arr1[i])
        arrContracts = [...arrContracts, con]
      }


      let consArr = []
      arrContracts.forEach(contract => {
        contract.poInvoices.forEach(poInvoice => {
          poInvoice.invRef.forEach(ref => {
            if (invArr.map(z => z.saleInvoice).includes(ref)) {
              let item = {
                num: '',
                dateExp: contract.dateRange.endDate,
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



      let expArr = dt.filter(x => x.expenses.length).map(x => x.expenses).flat()
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
          invoice: l.salesInv.replace(/\D/g, ''),
 curEX: gQ(l.cur, 'Currency', 'cur'),
            expenseId: l.id,
  expenseDate: l.dateRange?.startDate ?? l.date        }
        expArr = [...expArr, item]
      }

      expArr = [...expArr, ...consArr] //merge contracts and expenses
      expArr = sortArr(expArr, 'invoice')

      dt = mergeArrays(invArr, expArr)

      setInvoicesAccData(dt)
      setLoading(false)
    }

    Object.keys(settings).length !== 0 && Load();
  }, [dateSelect, settings])
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
      currency: x.row.original.curEX,
      minimumFractionDigits: 2
    }).format(x.getValue()) : ''
  }

  let showAmountInv = (x) => {

    return x.row.original.saleInvoice ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: x.row.original.curINV,
      minimumFractionDigits: 2
    }).format(x.getValue()) : ''
  }



  let propDefaults = Object.keys(settings).length === 0 ? [] : [
    {
      accessorKey: 'num', header: '#', cell: (props) => <p className='text-center'>{props.getValue()}</p>,
      enableColumnFilter: false,
    },
    {
      accessorKey: 'dateExp', header: getTtl('Date', ln), cell: (props) => <p>{props.getValue() ? dateFormat(props.getValue(), 'dd-mmm-yy') : ''}</p>,
      meta: {
        filterVariant: 'dates',
      },
      filterFn: 'dateBetweenFilterFn'
    },
   { accessorKey: 'expInvoice', header: getTtl('Expense Invoice', ln) + '#', cell: EditableCell },
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
  }},


    { accessorKey: 'dateInv', header: getTtl('Date', ln), cell: (props) => <p>{props.getValue() ? dateFormat(props.getValue(), 'dd-mmm-yy') : ''}</p> },
    { accessorKey: 'saleInvoice', header: getTtl('Invoice', ln), cell: (props) => <p>{props.getValue()}</p> },
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
    const totalIncome = invoicesAccData.reduce((sum, item) => sum + (item.amountInv || 0), 0);
    const totalExpense = invoicesAccData.reduce((sum, item) => sum + (item.amountExp || 0), 0);
    const balance = totalIncome - totalExpense;
    return { totalIncome, totalExpense, balance, savings: balance > 0 ? balance * 0.2 : 0 };
  }, [invoicesAccData]);

  // Chart data for Debit & Credit Overview
  const chartData = useMemo(() => {
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return {
      labels: days,
      datasets: [
        {
          label: 'Debit',
          data: [45, 60, 55, 70, 50, 65, 40],
          backgroundColor: '#103a7a',
          borderRadius: 6,
          barPercentage: 0.6,
        },
        {
          label: 'Credit',
          data: [35, 50, 45, 55, 40, 50, 30],
          backgroundColor: '#9fb8d4',
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    };
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#28264f',
        bodyColor: '#838ca7',
        borderColor: '#ebf2fc',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(159,184,212,0.2)' },
        ticks: { color: '#838ca7', font: { size: 11 } },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#838ca7', font: { size: 11 } },
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
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    
    if (absAmount >= 1000000000000) {
      return sign + '$' + (absAmount / 1000000000000).toFixed(1) + 'T';
    } else if (absAmount >= 1000000000) {
      return sign + '$' + (absAmount / 1000000000).toFixed(1) + 'B';
    } else if (absAmount >= 1000000) {
      return sign + '$' + (absAmount / 1000000).toFixed(1) + 'M';
    } else if (absAmount >= 1000) {
      return sign + '$' + (absAmount / 1000).toFixed(1) + 'K';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyFull = (amount) => {
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
    return value.toFixed(1) + '%';
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
    <div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
      {Object.keys(settings).length === 0 ? <Spinner /> :
        <>
          <Toast />
          {loading && <Spin />}

          {/* Header Section */}
          <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
            <h1 className="text-[14px] text-[#11497c] font-poppins responsiveTextTitle border-l-4 border-[#11497c] pl-2" style={{ fontSize: '14px' }}>
              {getTtl('Accounting', ln)}
            </h1>
            <div className='flex group'>
              <DateRangePicker />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* My Balance */}
            <div className="bg-gradient-to-r from-[var(--endeavour)] to-[var(--chathams-blue)] rounded-2xl p-4 text-white shadow-lg min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaWallet className="text-white text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white/80 text-xs">My Balance</p>
                  <p className="text-lg font-bold truncate">{formatCurrency(totals.balance)}</p>
                </div>
              </div>
            </div>

            {/* Income */}
            <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-2xl p-4 text-white shadow-lg min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaArrowTrendUp className="text-white text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white/80 text-xs">Income</p>
                  <p className="text-lg font-bold truncate">{formatCurrency(totals.totalIncome)}</p>
                </div>
              </div>
            </div>

            {/* Expense */}
            <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-2xl p-4 text-white shadow-lg min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaArrowTrendDown className="text-white text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white/80 text-xs">Expense</p>
                  <p className="text-lg font-bold truncate">{formatCurrency(totals.totalExpense)}</p>
                </div>
              </div>
            </div>

            {/* Total Saving */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaPiggyBank className="text-white text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white/80 text-xs">Total Saving</p>
                  <p className="text-lg font-bold truncate">{formatCurrency(totals.savings)}</p>
                </div>
              </div>
            </div>
          </div>
           {/* Full Table */}
          <div className="rounded-2xl p-3 sm:p-5 mt-2 border-0 shadow-xl w-full backdrop-blur-[2px] bg-white">
            <h3 className="text-lg font-semibold text-[var(--port-gore)] mb-4">All Transactions</h3>
            <Customtable data={invoicesAccData} columns={propDefaults}  onCellUpdate={onCellUpdate}
              excellReport={EXD(invoicesAccData, settings, getTtl('Accounting', ln), ln)} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 mt-3">
            {/* Last Transaction */}
            <div className="rounded-2xl p-3 sm:p-5 mt-2 border-0 shadow-xl w-full backdrop-blur-[2px] bg-white xl:col-span-2">
              <h3 className="text-lg font-semibold text-[var(--port-gore)] mb-4">Last Transaction</h3>
              <div className="space-y-3">
                {recentTransactions.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--selago)] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--selago)] rounded-full flex items-center justify-center">
                        <span className="text-[var(--endeavour)] text-sm font-semibold">
                          {(item.clientExp || item.clientInv || 'N/A').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--port-gore)]">
                          {gQ(item.clientExp, 'Supplier', 'nname') || item.clientInv || 'Transaction'}
                        </p>
                        <p className="text-xs text-[var(--regent-gray)]">
                          {item.dateExp ? dateFormat(item.dateExp, 'dd mmm yyyy') : item.dateInv ? dateFormat(item.dateInv, 'dd mmm yyyy') : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--regent-gray)]">{item.expType || item.invType || ''}</p>
                      <p className={`text-sm font-semibold ${item.amountInv ? 'text-emerald-500' : 'text-red-500'}`}>
                        {item.amountInv ? '+' : '-'}{formatCurrency(item.amountInv || item.amountExp || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoices Sent */}
            <div className="rounded-2xl p-3 sm:p-5 mt-2 border-0 shadow-xl w-full backdrop-blur-[2px] bg-white">
              <h3 className="text-lg font-semibold text-[var(--port-gore)] mb-4">Invoices Sent</h3>
              <div className="space-y-3">
                {recentInvoices.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--selago)] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--rock-blue)]/30 rounded-full flex items-center justify-center">
                        <span className="text-[var(--chathams-blue)] text-sm font-semibold">
                          {(item.clientInv || 'C').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--port-gore)]">{item.clientInv || 'Client'}</p>
                        <p className="text-xs text-[var(--regent-gray)]">
                          {item.dateInv ? dateFormat(item.dateInv, 'dd mmm yyyy') : ''}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-[var(--port-gore)]">{formatCurrency(item.amountInv || 0)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            {/* Debit & Credit Overview */}
            <div className="rounded-2xl p-3 sm:p-5 mt-2 border-0 shadow-xl w-full backdrop-blur-[2px] bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-[var(--port-gore)]">Debit & Credit Overview</h3>
                  <p className="text-xs text-[var(--regent-gray)] truncate">
                    {formatCurrency(totals.totalExpense)} Debited & {formatCurrency(totals.totalIncome)} Credited
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[var(--chathams-blue)]"></span>
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
            <div className="bg-gradient-to-br from-[var(--endeavour)] to-[var(--bunting)] rounded-2xl p-6 shadow-lg text-white overflow-hidden">
              <h3 className="text-lg font-semibold mb-6">Financial Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 overflow-hidden">
                  <p className="text-white/70 text-xs mb-1">Total Transactions</p>
                  <p className="text-xl font-bold">{invoicesAccData.length}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 overflow-hidden">
                  <p className="text-white/70 text-xs mb-1">Avg. Transaction</p>
                  <p className="text-xl font-bold truncate">
                    {formatCurrency(invoicesAccData.length > 0 ? (totals.totalIncome + totals.totalExpense) / invoicesAccData.length : 0)}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 overflow-hidden">
                  <p className="text-white/70 text-xs mb-1">Net Profit</p>
                  <p className="text-xl font-bold truncate">{formatCurrency(totals.balance)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 overflow-hidden">
                  <p className="text-white/70 text-xs mb-1">Profit Margin</p>
                  <p className="text-xl font-bold">
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
