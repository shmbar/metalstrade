'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from './table';
import MyDetailsModal from '../contracts/modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import { ExpensesContext } from "@contexts/useExpensesContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";

import { loadData } from '@utils/utils'
import SignOut from '@components/signOut';
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { getInvoices, groupedArrayInvoice } from '@utils/utils'
import Spin from '@components/spinTable';
import { Numcur } from '../contractsreview/funcs'
import CBox from '@components/combobox.js'
import {OutTurn, Finalizing, relStts} from '@components/const'
import dateFormat from "dateformat";
import {EXD} from './excel'

const TotalInvoicePayments = (data) => {
  let accumulatedPmnt = 0;

  data.forEach(obj => {
    if (obj && Array.isArray(obj.payments)) {
      obj.payments.forEach(payment => {
       
      
        if (payment && !isNaN(parseFloat(payment.pmnt))) {
          accumulatedPmnt += parseFloat(payment.pmnt * 1 );
        }
      });
    }

  });

  return accumulatedPmnt;
}

const Total = (data, name, val, mult, settings) => {
  let accumuLastInv = 0;
  let accumuDeviation = 0;

  data.forEach(obj => {
    if (obj && !isNaN(obj[name])) {

      let num = obj.canceled ? 0 : obj[name] * 1

      accumuDeviation += (data.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
        data.length > 1 && ['1111', 'Invoice'].includes(obj.invType)) ?
        num : 0;

      accumuLastInv += (data.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
        data.length > 1 && !['1111', 'Invoice'].includes(obj.invType)) ?
        num : 0;

    }
  });

  return { accumuDeviation, accumuLastInv };
}


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

}

const CB = (settings, setValCur, valCur) => {
  return (
    <CBox data={settings.Currency.Currency} setValue={setValCur} value={valCur} name='cur' classes='-mt-1 input border-slate-300 shadow-sm items-center flex'
      classes2='text-lg' dis={true} />
  )
}

const sortedData = (arr) => {
  return arr.map(z => ({
    ...z,
    d: z.final ? z.invType === 'Invoice' ? '1111' :
      z.invType === 'Credit Note' ? '2222' : '3333'
      : z.invType
  })).sort((a, b) => {
    const invTypeOrder = { '1111': 1, '2222': 2, '3333': 3 };
    const invTypeA = a.d || '';
    const invTypeB = b.d || '';
    return invTypeOrder[invTypeA] - invTypeOrder[invTypeB]
  })
}

const Shipments = () => {

  const { settings, lastAction, dateSelect, setLoading, loading, setDateYr } = useContext(SettingsContext);
  const { valueCon, setValueCon, contractsData, setContractsData, isOpen, setIsOpen } = useContext(ContractsContext);
  const { blankInvoice, setIsInvCreationCNFL } = useContext(InvoiceContext);
  const { blankExpense } = useContext(ExpensesContext);
  const { uidCollection } = UserAuth();
  const [totals, setTotals] = useState([]);
  const [valCur, setValCur] = useState({ cur: 'us' })
  const [filteredData, setFilteredData] = useState([]);
  const [dataTable, setDataTable] = useState([])


  useEffect(() => {

    const Load = async () => {
      setLoading(true)
      let dt = await loadData(uidCollection, 'contracts', dateSelect);

      setContractsData(dt)
      setLoading(false)
    }

    Object.keys(settings).length !== 0 && Load();


  }, [dateSelect, settings])


  useEffect(() => {

    const loadInv = async () => {

      let dt = [...contractsData]
      dt = await Promise.all(
        dt.map(async (x) => {
          const Invoices = await loadInvoices(uidCollection, x)
          return {
            ...x,
            invoicesData: Invoices,
          };
        })
      );

      let newArr = []

      dt.forEach(innerObj => {
        if (innerObj.invoicesData && Array.isArray(innerObj.invoicesData)) {
          innerObj.invoicesData.forEach(obj => {
            newArr.push({ arr: obj, order: innerObj.order, supplier: innerObj.supplier, euroToUSD: innerObj.euroToUSD })
          })
        }
      })

      dt = setCurFilterData(newArr)

      setDataTable(dt)
      setFilteredData(dt)
    }

    loadInv()

  }, [contractsData])


  useEffect(() => {

    const Load = () => {

      let dt2 = setTtl(filteredData)
      setTotals(dt2)
    }

    Load();
  }, [filteredData])


  useEffect(() => {

    const Load = async () => {

      let dt2 = setTtl(filteredData)
      setTotals(dt2)

    }

    Load();
  }, [valCur])

  const getprefixInv = (x) => {
    return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
      (x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN'
  }

  const setCurFilterData = (arr) => {

    let dt = arr.map((x) => {
      let srtX = sortedData(x.arr)
      const order = x.order;
      const supplier = x.supplier;
      const euroToUSD = x.euroToUSD; 
      const cn = srtX.length > 1 ? srtX[srtX.length - 1].invoice + getprefixInv(srtX[srtX.length - 1]) : '-'
      const totalAmount = Total(srtX, 'totalAmount', valCur, x.euroToUSD, settings).accumuLastInv
      const deviation = totalAmount - Total(srtX, 'totalAmount', valCur, x.euroToUSD, settings).accumuDeviation
      const totalPrepayment1 = Total(srtX, 'totalPrepayment', valCur, x.euroToUSD, settings).accumuLastInv;
      const prepaidPer = isNaN(totalPrepayment1 / totalAmount) ? '-' : ((totalPrepayment1 / totalAmount) * 100).toFixed(1) + '%'
      const payments = TotalInvoicePayments(srtX);
      const inDebt = totalAmount - totalPrepayment1;
      const debtaftr = totalPrepayment1 - payments;
      const debtBlnc = totalAmount - payments;

      const addData=srtX[0].shipData
      const rcvd = addData.rcvd;
      const fnlzing = addData.fnlzing;
      const status = addData.status;
      const etd = addData.etd==='' ? '' : dateFormat(addData.etd.startDate, 'dd-mmm-yy');
      const eta = addData.eta==='' ? '' : dateFormat(addData.eta.startDate, 'dd-mmm-yy');
     

      return {
        ...x.arr[0],
        supplier,
        order,
        cn,
        totalAmount,
        deviation,
        totalPrepayment1,
        prepaidPer,
        payments,
        inDebt,
        debtaftr,
        debtBlnc,
        euroToUSD,

        rcvd,
        fnlzing,
        status,
        etd,
        eta

      };
    })
    return dt;
  }

  const setTtl = (filteredData) => {

    // totals

    const totalInvoices1 = filteredData.reduce((total, obj) => {
      return total + Numcur(obj, 'totalAmount', valCur, obj.euroToUSD, settings);
    }, 0);

    const totalPrepayment2 = filteredData.reduce((total, obj) => {
      return total + Numcur(obj, 'totalPrepayment1', valCur, obj.euroToUSD, settings);
    }, 0);

    const payments1 = filteredData.reduce((total, obj) => {
      return total + Numcur(obj, 'payments', valCur, obj.euroToUSD, settings);
    }, 0);

    let Ttls = [{
      order: '', supplier: '',
      totalAmount: totalInvoices1,
      totalPrepayment1: totalPrepayment2,
      deviation: filteredData.reduce((total, obj) => { return total + Numcur(obj, 'deviation', valCur, obj.euroToUSD, settings) }, 0),
      prepaidPer: isNaN(totalPrepayment2 / totalInvoices1) ? '-' : ((totalPrepayment2 / totalInvoices1) * 100).toFixed(2) + '%',
      inDebt: (totalInvoices1 - totalPrepayment2),
      payments: payments1, debtaftr: totalPrepayment2 - payments1,
      debtBlnc: totalInvoices1 - payments1,
      cur: 'us'
    }]

    return Ttls;

  }

  let propDefaults = Object.keys(settings).length === 0 ? [] : [
    { field: 'order', header: 'PO#', showcol: false },
    { field: 'supplier', header: 'Supplier', showcol: true, arr: settings.Supplier.Supplier },
    { field: 'client', header: 'Consignee', showcol: true, arr: settings.Client.Client },
    { field: 'invoice', header: 'Invoice', showcol: true },
    { field: 'cn', header: 'Credit/Final Note', showcol: true },
    { field: 'totalAmount', header: 'Inv Value Sales', showcol: true, arr: settings.Currency.Currency },
    { field: 'deviation', header: 'Deviation', showcol: true, arr: settings.Currency.Currency },
    { field: 'prepaidPer', header: 'Prepaid %', showcol: true },
    { field: 'totalPrepayment1', header: 'Prepaid Amount', showcol: true, arr: settings.Currency.Currency },
    { field: 'inDebt', header: 'Initial Debt', showcol: false, arr: settings.Currency.Currency },
    { field: 'payments', header: 'Actual Payment', showcol: false, arr: settings.Currency.Currency },
    { field: 'debtaftr', header: 'Debt After Prepayment', showcol: false, arr: settings.Currency.Currency },
    { field: 'debtBlnc', header: 'Debt Balance', showcol: false, arr: settings.Currency.Currency },
  
    { field: 'rcvd', header: 'Outturn', showcol: false, arr: OutTurn},
    { field: 'fnlzing', header: 'Finalizing', showcol: false, arr: Finalizing},
    { field: 'status', header: 'Release Status', showcol: false, arr: relStts},
    { field: 'etd', header: 'ETD', showcol: false,},
    { field: 'eta', header: 'ETA', showcol: false,},
  ];



  const SelectRow = (row) => {
    setValueCon(contractsData.find(x => x.id === row.poSupplier.id));
    blankInvoice();
    setDateYr(row.poSupplier.date.substring(0, 4));
    blankExpense();
    setIsInvCreationCNFL(false);
    setIsOpen(true);
  };

  return (
    <div className="lg:container mx-auto px-2 md:px-8 xl:px-10 ">
      {Object.keys(settings).length === 0 ? <Spinner /> :
        <>
          <SignOut />
          <Toast />
          {loading && <Spin />}
          <div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
            <div className='flex items-center justify-between flex-wrap'>
              <div className="text-3xl p-1 pb-2 text-slate-500">Invoices Review</div>
              <MonthSelect />
            </div>


            <div className='mt-5'>
              <Customtable data={loading ? [] : dataTable} datattl={loading ? [] : totals} propDefaults={propDefaults} SelectRow={SelectRow}
                lastAction={lastAction} name='Invoices Review' cb={CB(settings, setValCur, valCur)} settings={settings}
                filteredData={filteredData} setFilteredData={setFilteredData} valCur={valCur}
                setCurFilterData={setCurFilterData} setValCur={setValCur} 
                excellReport={EXD(dataTable, settings, 'Invoices Review')}/>
            </div>
          </div>

          {valueCon && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
            title={!valueCon.id ? 'New Contract' : `Contract No: ${valueCon.order}`} />}
        </>}
    </div>
  );
};

export default Shipments;

