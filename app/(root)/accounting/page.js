'use client';
import { useContext, useEffect, useMemo , useRef , useState } from 'react';
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
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import KpiStrip from '../../../components/KpiStrip';
import EditableCell from '../../../components/table/inlineEditing/EditableCell';
import EditableSelectCell from '../../../components/table/inlineEditing/EditableSelectCell';
import Tltip from '../../../components/tlTip';
import { updateExpenseField, updateInvoiceField } from '../../../utils/utils';
import { useGlobalSearch } from '../../../contexts/useGlobalSearchContext';
import { useUndo } from '@hooks/useUndo';





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

  const { settings, dateSelect, setLoading, loading, ln , setToast } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();
  const { upsertSourceItems } = useGlobalSearch();
  const settingsLoaded = Object.keys(settings).length > 0;
  const clientCount = settings.Client?.Client?.length || 0;
  const supplierCount = settings.Supplier?.Supplier?.length || 0;
  const currencyCount = settings.Currency?.Currency?.length || 0;


  const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

  // expType is stored as an ID into settings.Expenses.Expenses — only the
  // contract-derived purchase rows carry a literal ('Purchase'), and older
  // expense docs may already hold the label. So: resolve the id, else pass the
  // value through. The table's select and the Excel export both do this; any
  // call site that prints the raw field renders the settings UUID instead.
  const expTypeLabel = (x) => settings.Expenses?.Expenses?.find(q => q.id === x)?.expType || x || ''


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
          expTypeLabel(row.expType),
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
        avatar: true,
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
        avatar: true,
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

  // Rows the table has left after its filters, reported up by Customtable.
  // The Excel export is built from THESE, not from the full period: filtering to
  // one vendor and pressing Excel used to hand back every vendor in the range.
  const [filteredAcc, setFilteredAcc] = useState(null);

  const excelReport = useMemo(() => {
    // null = the table has not reported yet (first paint); export everything
    // rather than nothing, so the button is never silently empty.
    const rows = Array.isArray(filteredAcc) ? filteredAcc : invoicesAccData;
    return EXD(rows, settings, getTtl('Accounting', ln), ln);
  }, [filteredAcc, invoicesAccData, settings, ln]);

  // ── Undo of inline cell edits ──────────────────────────────────────────────
  // A row here is a JOIN: some columns belong to the expense document, one to the
  // invoice, and the field written is not the column's own id (amountExp -> amount,
  // clientExp -> supplier). So the undo has to replay the same branching rather
  // than patch { [columnId]: value } — which is why writeCell is shared by both
  // directions instead of the inverse being hand-written.
  const invoicesAccDataRef = useRef(invoicesAccData); invoicesAccDataRef.current = invoicesAccData;
  const { record: recordUndo, undo, count: undoCount, busy: undoBusy, lastLabel: undoLabel } = useUndo();

  // column -> the document field it actually writes
  const EXPENSE_FIELD = { expInvoice: 'expense', amountExp: 'amount', expType: 'expType', clientExp: 'supplier' };

  const columnLabel = (columnId) => {
    const h = propDefaults.find(c => (c.accessorKey ?? c.id) === columnId)?.header;
    return typeof h === 'string' ? h : columnId;
  };

  const writeCell = async ({ row, columnId, value }) => {
    const key = row.expenseId || row.invoiceId;
    const prev = invoicesAccDataRef.current;
    setInvoicesAccData(prev.map(x =>
      (x.expenseId || x.invoiceId) === key ? { ...x, [columnId]: value } : x
    ));

    try {
      // EXPENSE SIDE
      if (EXPENSE_FIELD[columnId]) {
        if (!row.expenseId || !row.expenseDate) throw new Error("Missing expense mapping");
        const field = EXPENSE_FIELD[columnId];
        const patch = { [field]: field === 'amount' ? (parseFloat(value) || 0) : value };
        await updateExpenseField(uidCollection, row.expenseId, row.expenseDate, patch);
      }

      // INVOICE SIDE
      if (columnId === 'clientInv') {
        if (!row.invoiceId || !row.invoiceDate) throw new Error("Missing invoice mapping");
        await updateInvoiceField(uidCollection, row.invoiceId, row.invoiceDate, { client: value });
      }

      return true;
    } catch (e) {
      console.error(e);
      setInvoicesAccData(prev); // revert
      return false;
    }
  };

  const onCellUpdate = async ({ rowIndex, columnId, value }) => {
    const row = invoicesAccData[rowIndex];
    if (!row) return;

    if (row.expType === 'Purchase') return;

    const before = row[columnId];
    const ok = await writeCell({ row, columnId, value });

    // Only offer to undo a change that actually landed.
    if (ok) {
      recordUndo({
        label: `${columnLabel(columnId)} on ${row.expenseId ? `expense ${row.expInvoice ?? ''}` : `invoice ${row.saleInvoice ?? ''}`}`.trim(),
        apply: () => writeCell({ row, columnId, value: before }),
      });
    }
  };

  // useUndo puts a failed entry back on the stack so the button can retry — but
  // the user has to be told the change was NOT reversed.
  const handleUndo = async () => {
    try {
      const entry = await undo();
      if (entry) setToast({ show: true, text: `Undone — ${entry.label}`, clr: 'success' });
    } catch (e) {
      setToast({ show: true, text: `Could not undo — nothing was changed. (${e?.message || e})`, clr: 'fail' });
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
                undoCount={undoCount} onUndo={handleUndo} undoBusy={undoBusy} undoLabel={undoLabel}
                setFilteredData={setFilteredAcc}
                excellReport={excelReport} />
            </div>
          </>
        }
      </div>
    </div>
  );
}

export default Accounting;
