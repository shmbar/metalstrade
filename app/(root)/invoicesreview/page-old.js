'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from './newTable.js';
import MyDetailsModal from '../contracts/modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import Toast from '@components/toast.js'
import { ExpensesContext } from "@contexts/useExpensesContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";

import { loadData, loadInvoice } from '@utils/utils'
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { getInvoices, groupedArrayInvoice, getD } from '@utils/utils'
import Spin from '@components/spinTable';
import { Numcur, SumValuesSupplier } from '../contractsreview/funcs.js'
//import CBox from '@components/combobox.js'
import { OutTurn, Finalizing, relStts } from '@components/const'
import dateFormat from "dateformat";
import { EXD } from './excel.js'
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';

const TotalInvoicePayments = (data) => {
  let accumulatedPmnt = 0;

  data.forEach(obj => {
    if (obj && Array.isArray(obj.payments)) {
      obj.payments.forEach(payment => {


        if (payment && !isNaN(parseFloat(payment.pmnt))) {
          accumulatedPmnt += parseFloat(payment.pmnt * 1);
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

// const CB = (settings, setValCur, valCur) => {
//   return (
//     <CBox data={settings.Currency.Currency} setValue={setValCur} value={valCur} name='cur' classes='input border-slate-300 shadow-sm items-center flex'
//       classes2='text-lg' dis={true} />
//   )
// }

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

  const { settings, lastAction, dateSelect, setLoading, loading, setDateYr, ln } = useContext(SettingsContext);
  const { valueCon, setValueCon, contractsData, setContractsData, isOpenCon, setIsOpenCon } = useContext(ContractsContext);
  const { blankInvoice, setIsInvCreationCNFL } = useContext(InvoiceContext);
  const { blankExpense } = useContext(ExpensesContext);
  const { uidCollection } = UserAuth();
  const [totals, setTotals] = useState([]);
  const [valCur, setValCur] = useState({ cur: 'us' })
  const [filteredData, setFilteredData] = useState([]);
  const [dataTable, setDataTable] = useState([])

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
      console.log(dt)
      let newArr = []

      dt.forEach(innerObj => {
        if (innerObj.invoicesData && Array.isArray(innerObj.invoicesData)) {

          innerObj.invoicesData.forEach(obj => {
            let reducedArr = innerObj.poInvoices.filter(invoice => invoice.invRef.includes((obj[0].invoice).toString()));

            newArr.push({
              arr: obj, poCur: innerObj.cur, order: innerObj.order, supplier: innerObj.supplier, euroToUSD: innerObj.euroToUSD,
              poInvoices: reducedArr.map(invoice => invoice.inv),
              invAmntSup: reducedArr.map(invoice => invoice.invValue),
              prpMntSup: reducedArr.map(item => item.pmnt),
              blncSup: reducedArr.map(item => item.blnc),
            })
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

      const addData = srtX[0].shipData
      const rcvd = addData.rcvd;
      const outrnamnt = addData.outrnamnt != null ? addData.outrnamnt : '';
      const fnlzing = addData.fnlzing;
      const status = addData.status;
      const etd = addData.etd === '' ? '' : dateFormat(addData.etd.startDate, 'dd-mmm-yy');
      const eta = addData.eta === '' ? '' : dateFormat(addData.eta.startDate, 'dd-mmm-yy');
      const poCur = x.poCur

      return {
        ...x.arr[0],
        supplier,
        supplierInv: x.poInvoices,
        supplierInvAmount: x.invAmntSup,
        supplierPrepayment: x.prpMntSup,
        supBlnc: x.blncSup,
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
        outrnamnt,
        fnlzing,
        status,
        etd,
        eta,
        poCur
      };
    })
    return dt;
  }

  const setTtl = (filteredData) => {

    const curArr = ['us', 'eu']
    let Ttls = [];

    // totals
    for (let i = 0; i < curArr.length; i++) {

      const supplierInvAmount = SumValuesSupplier(filteredData, 'supplierInvAmount', curArr[i])
      const supplierPrepayment = SumValuesSupplier(filteredData, 'supplierPrepayment', curArr[i])
      const supplierBlnc = SumValuesSupplier(filteredData, 'supBlnc', curArr[i])

      const outrnamnt = filteredData.reduce((total, obj) => {
        return total + Numcur(obj, 'outrnamnt', curArr[i], settings);
      }, 0);
      //////////////////////////////////////////
      const totalInvoices1 = filteredData.reduce((total, obj) => {
        return total + Numcur(obj, 'totalAmount', curArr[i], settings);
      }, 0);

      const totalPrepayment2 = filteredData.reduce((total, obj) => {
        return total + Numcur(obj, 'totalPrepayment1', curArr[i], settings);
      }, 0);

      const payments1 = filteredData.reduce((total, obj) => {
        return total + Numcur(obj, 'payments', curArr[i], settings);
      }, 0);

      let ttls = {
        order: '', supplier: '',
        totalAmount: totalInvoices1,
        totalPrepayment1: totalPrepayment2,
        deviation: filteredData.reduce((total, obj) => { return total + Numcur(obj, 'deviation', curArr[i], settings) }, 0),
        prepaidPer: isNaN(totalPrepayment2 / totalInvoices1) ? '-' : ((totalPrepayment2 / totalInvoices1) * 100).toFixed(2) + '%',
        inDebt: (totalInvoices1 - totalPrepayment2),
        payments: payments1, debtaftr: totalPrepayment2 - payments1,
        debtBlnc: totalInvoices1 - payments1,
        cur: curArr[i],
        supplierInvAmount: supplierInvAmount,
        supplierPrepayment: supplierPrepayment,
        supBlnc: supplierBlnc,
        outrnamnt: outrnamnt
      }

      Ttls = [...Ttls, { [curArr[i]]: ttls }]

    }
    return Ttls;

  }


  let showAmountPO = (x, obj) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: obj.row.original.poCur,
      minimumFractionDigits: 2
    }).format(x)
  }

  let showAmountInv = (x) => {

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: x.row?.original?.final ? x.row.original?.cur?.cur || 'USD' : x.row?.original?.cur,
      minimumFractionDigits: 2
    }).format(x.getValue())
  }

  let showAmountTtl = (x, cur) => {

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2
    }).format(x)
  }

  let propDefaults = Object.keys(settings).length === 0 ? [] : [
    {
      accessorKey: 'order', header: getTtl('PO', ln) + '#', bgt: 'bg-green-500', bgr: 'bg-green-50',
      ttlUS: getTtl('Total', ln) + ' $:', ttlEU: getTtl('Total', ln) + ' €:'
    }, //false
    { accessorKey: 'supplier', header: getTtl('Supplier', ln), bgt: 'bg-green-500', bgr: 'bg-green-50' },
    {
      accessorKey: 'supplierInv', header: getTtl('Supplier inv', ln), bgt: 'bg-green-500', bgr: 'bg-green-50', cell: (props) => <div>{props.getValue().map((item, index) => {
        return <div key={index}>{item}</div>
      })}</div>
    },
    {
      accessorKey: 'supplierInvAmount', header: getTtl('Sup Inv amount', ln), bgt: 'bg-green-500', bgr: 'bg-green-50', cell: (props) => <div>{props.getValue().map((item, index) => {
        return <div key={index}>{showAmountPO(item, props)}</div>
      })}</div>, ttlUS: showAmountTtl(totals[0]?.us.supplierInvAmount, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.supplierInvAmount, 'EUR')
    },
    {
      accessorKey: 'supplierPrepayment', header: getTtl('Sup Prepayment', ln), bgt: 'bg-green-500', bgr: 'bg-green-50', cell: (props) => <div>{props.getValue().map((item, index) => {
        return <div key={index}>{showAmountPO(item, props)}</div>
      })}</div>, ttlUS: showAmountTtl(totals[0]?.us.supplierPrepayment, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.supplierPrepayment, 'EUR')
    },
    {
      accessorKey: 'supBlnc', header: getTtl('Balance', ln), bgt: 'bg-green-500', bgr: 'bg-green-50', cell: (props) => <div>{props.getValue().map((item, index) => {
        return <div key={index}>{showAmountPO(item, props)}</div>
      })}</div>, ttlUS: showAmountTtl(totals[0]?.us.supBlnc, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.supBlnc, 'EUR')
    },

    { accessorKey: 'invoice', header: getTtl('Invoice', ln), bgt: 'bg-amber-400', bgr: 'bg-amber-50' },
    { accessorKey: 'client', header: getTtl('Consignee', ln), bgt: 'bg-amber-400', bgr: 'bg-amber-50' },
    {
      accessorKey: 'totalAmount', header: getTtl('invValueSale', ln), bgt: 'bg-amber-400', bgr: 'bg-amber-50', cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.totalAmount, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.totalAmount, 'EUR')
    },
    {
      accessorKey: 'prepaidPer', header: getTtl('Prepaid', ln) + ' %', bgt: 'bg-amber-400', bgr: 'bg-amber-50',
      ttlUS: totals[0]?.us.prepaidPer, ttlEU: totals[1]?.eu.prepaidPer
    },
    {
      accessorKey: 'totalPrepayment1', header: getTtl('Prepaid Amount', ln), bgt: 'bg-amber-400', bgr: 'bg-amber-50', cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.totalPrepayment1, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.totalPrepayment1, 'EUR')
    },
    {
      accessorKey: 'debtaftr', header: getTtl('debtAfterPrepPmnt', ln), bgt: 'bg-amber-400', bgr: 'bg-amber-50', cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.debtaftr, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.debtaftr, 'EUR')
    }, //false


    { accessorKey: 'status', header: getTtl('Release Status', ln), bgt: 'bg-purple-800', bgr: 'bg-purple-50' }, //false
    { accessorKey: 'etd', enableSorting: false, header: 'ETD', bgt: 'bg-purple-800', bgr: 'bg-purple-50' },//false
    { accessorKey: 'eta', enableSorting: false, header: 'ETA', bgt: 'bg-purple-800', bgr: 'bg-purple-50' },//false

    { accessorKey: 'rcvd', header: 'Outturn', bgt: 'bg-[#0070C0]', bgr: 'bg-blue-50' }, //false
    { accessorKey: 'outrnamnt', header: 'Outturn Amount', bgt: 'bg-[#0070C0]', bgr: 'bg-blue-50', cell: (props) => <p>{props.getValue() !== '' && showAmountInv(props)}</p> }, //false
    {
      accessorKey: 'deviation', header: getTtl('Deviation', ln), bgt: 'bg-[#0070C0]', bgr: 'bg-blue-50', cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.deviation, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.deviation, 'EUR')
    },
    {
      accessorKey: 'debtBlnc', header: getTtl('Debt Balance', ln), bgt: 'bg-[#0070C0]', bgr: 'bg-blue-50', cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.debtBlnc, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.debtBlnc, 'EUR')
    },//false
    { accessorKey: 'cn', header: getTtl('Credit/Final Note', ln), bgt: 'bg-[#0070C0]', bgr: 'bg-blue-50' },
    { accessorKey: 'fnlzing', header: getTtl('Finalizing', ln), bgt: 'bg-[#0070C0]', bgr: 'bg-blue-50' },//false


    {
      accessorKey: 'inDebt', header: getTtl('Initial Debt', ln), bgt: 'bg-slate-400', cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.inDebt, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.inDebt, 'EUR')
    },
    {
      accessorKey: 'payments', header: getTtl('Actual Payment', ln), bgt: 'bg-slate-400', cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.payments, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.payments, 'EUR')
    },
  ];


  let invisible = ['supBlnc', 'etd', 'eta', 'rcvd', 'outrnamnt', 'fnlzing',
    'inDebt', 'payments'].reduce((acc, key) => {
      acc[key] = false
      return acc;
    }, {});


  const getFormatted = (arr) => {  //convert id's to values

    let newArr = []
    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

    arr.forEach(row => {
      let formattedRow = {
        ...row, supplier: gQ(row.supplier, 'Supplier', 'nname'),
        cur: gQ(row.cur, 'Currency', 'cur'),
        poCur: gQ(row.poCur, 'Currency', 'cur'),
        client: gQ(row.client, 'Client', 'nname'),
        status: getD(relStts, row, 'status'),
        rcvd: getD(OutTurn, row, 'rcvd'),
        fnlzing: getD(Finalizing, row, 'fnlzing'),
      }

      newArr.push(formattedRow)
    })

    return newArr
  }

  const SelectRow = (row) => {
    setValueCon(contractsData.find(x => x.id === row.poSupplier.id));
    blankInvoice();
    setDateYr(row.poSupplier.date.substring(0, 4));
    blankExpense();
    setIsInvCreationCNFL(false);
    setIsOpenCon(true);
  };

  return (
    <div className="container mx-auto px-2 md:px-8 xl:px-10 mt-16 md:mt-0">
      {Object.keys(settings).length === 0 ? <Spinner /> :
        <>
          <Toast />
          {loading && <Spin />}
          <div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
            <div className='flex items-center justify-between flex-wrap'>
              <div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Invoices Review', ln)}</div>
              <div className='flex'>
                <DateRangePicker />
              </div>
            </div>


            <div className='mt-5'>
              <Customtable data={loading ? [] : getFormatted(dataTable)} datattl={loading ? [] : totals} columns={propDefaults} SelectRow={SelectRow}
                //  cb={CB(settings, setValCur, valCur)} settings={settings}
                setFilteredData={setFilteredData} valCur={valCur}
                setValCur={setValCur} invisible={invisible}
                excellReport={EXD(dataTable, settings, getTtl('Invoices Review', ln), ln)} ln={ln} />
            </div>
          </div>

          {valueCon && <MyDetailsModal isOpen={isOpenCon} setIsOpen={setIsOpenCon}
            title={!valueCon.id ? getTtl('New Contract', ln) : `${getTtl('Contract No', ln)}: ${valueCon.order}`} />}
        </>}
    </div>
  );
};

export default Shipments;

