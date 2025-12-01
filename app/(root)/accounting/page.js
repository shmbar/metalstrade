'use client';
import { useContext, useEffect } from 'react';
import Customtable from './newTable';
//import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import { InvoiceContext } from "@contexts/useInvoiceContext";

import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import {
  loadData, sortArr, loadExpensesForAccounting, loadAdditionalCNFN,
  loadInvoice
} from '@utils/utils'
import Spin from '@components/spinTable';
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';


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
          clientInv: l.final ? l.client.nname : gQ(l.client, 'Client', 'nname'),
          amountInv: l.totalAmount,
          invType: getprefixInv1(l),
          invoice: l.invoice,
          curINV: l.final ? l.cur.cur : gQ(l.cur, 'Currency', 'cur')
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
          curEX: gQ(l.cur, 'Currency', 'cur')
        }
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
      accessorKey: 'num', header: '#', bgt: 'bg-yellow-200', bgr: 'bg-yellow-50', cell: (props) => <p className='text-center'>{props.getValue()}</p>,
      enableColumnFilter: false,
    },
    {
      accessorKey: 'dateExp', header: getTtl('Date', ln), bgt: 'bg-yellow-200', bgr: 'bg-yellow-50', cell: (props) => <p>{props.getValue() ? dateFormat(props.getValue(), 'dd-mmm-yy') : ''}</p>,
      meta: {
        filterVariant: 'dates',
      },
      filterFn: 'dateBetweenFilterFn'
    },
    { accessorKey: 'expInvoice', header: getTtl('Expense Invoice', ln) + '#', bgt: 'bg-yellow-200', bgr: 'bg-yellow-50', cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'clientExp', header: getTtl('Supplier', ln), bgt: 'bg-yellow-200', bgr: 'bg-yellow-50', cell: (props) => <p>{gQ(props.getValue(), 'Supplier', 'nname')}</p> ,},
    { accessorKey: 'amountExp', header: getTtl('Amount', ln), bgt: 'bg-yellow-200', bgr: 'bg-yellow-50', cell: (props) => <p>{showAmountExp(props)}</p> },
    {
      accessorKey: 'expType', header: getTtl('Expense Type', ln), bgt: 'bg-yellow-200', bgr: 'bg-yellow-50',
      cell: (props) => <p>{props.getValue() === 'Purchase' ? props.getValue() : gQ(props.getValue(), 'Expenses', 'expType')}</p>
    },


    { accessorKey: 'dateInv', header: getTtl('Date', ln), bgt: 'bg-green-200', bgr: 'bg-green-100', cell: (props) => <p>{props.getValue() ? dateFormat(props.getValue(), 'dd-mmm-yy') : ''}</p> },
    { accessorKey: 'saleInvoice', header: getTtl('Invoice', ln), bgt: 'bg-green-200', bgr: 'bg-green-100', cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'clientInv', header: getTtl('Consignee', ln), bgt: 'bg-green-200', bgr: 'bg-green-100', cell: (props) => <p>{props.getValue()}</p> ,},
    { accessorKey: 'amountInv', header: getTtl('Amount', ln), bgt: 'bg-green-200', bgr: 'bg-green-100', cell: (props) => <p>{showAmountInv(props)}</p> },
    { accessorKey: 'invType', header: getTtl('Invoice Type', ln), bgt: 'bg-green-200', bgr: 'bg-green-100', cell: (props) => <p>{props.getValue()}</p> },

  ];


  return (
    <div className="container mx-auto px-2 md:px-8 xl:px-10 mt-16 md:mt-0 pb-10">
      {Object.keys(settings).length === 0 ? <Spinner /> :
        <>

          <Toast />
          {loading && <Spin />}
          <div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
            <div className='flex items-center justify-between flex-wrap pb-2'>
              <div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Accounting', ln)}</div>
              <div className='flex'>
                <DateRangePicker />

              </div>
            </div>

            {<Customtable data={invoicesAccData} columns={propDefaults}
              excellReport={EXD(invoicesAccData, settings, getTtl('Accounting', ln), ln)} />
            }
          </div>


        </>}
    </div>
  );
};

export default Accounting;
