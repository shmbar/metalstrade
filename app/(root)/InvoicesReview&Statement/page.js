'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from './newTable';
import CustomtableStatement from '../invoicesstatement/newTable';
import MyDetailsModal from '../contracts/modals/dataModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { ContractsContext } from "../../../contexts/useContractsContext";
import Toast from '../../../components/toast.js'
import { ExpensesContext } from "../../../contexts/useExpensesContext";
import { InvoiceContext } from "../../../contexts/useInvoiceContext";

import { loadData, loadInvoice, getD } from '../../../utils/utils'
import Spinner from '../../../components/spinner';
import { UserAuth } from "../../../contexts/useAuthContext"
import { getInvoices, groupedArrayInvoice, getExpenses } from '../../../utils/utils'
import Spin from '../../../components/spinTable';
import { Numcur, SumValuesSupplier } from '../ContractsReview&Statement/funcs'
import { OutTurn, Finalizing, relStts } from '../../../components/const'
import dateFormat from "dateformat";
import { EXD } from './excel'
import { EXD as EXDStatement } from '../invoicesstatement/excel'
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';
import Tooltip from '../../../components/tooltip';
import { sumClients, sumSuppliers } from '../invoicesstatement/sumtables/sumTablesFuncs';
import SumTableSupplier from '../invoicesstatement/sumtables/sumTablesSuppliers'
import SumTableClient from '../invoicesstatement/sumtables/sumTablesClients'
import VideoLoader from '../../../components/videoLoader';
import Tltip from '../../../components/tlTip';

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

/*
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
*/

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

// Statement-specific functions
const makeGroupStatement = (arr) => {
  const groupedByPoSupplierId = arr.reduce((acc, invoice) => {
    const poSupplierId = invoice.poSupplier?.id;
    if (poSupplierId) {
      if (!acc[poSupplierId]) {
        acc[poSupplierId] = [];
      }
      acc[poSupplierId].push([invoice]);
    }
    return acc;
  }, {});

  return groupedByPoSupplierId;
}

const TotalStatement = (data, name, mult, settings) => {
  let accumuLastInv = 0;

  data.forEach(obj => {
    if (obj && !isNaN(obj[name])) {
      const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']
      let mltTmp = currentCur === 'us' ? 1 : mult

      let num = obj.canceled ? 0 : obj[name] * 1 * mltTmp

      accumuLastInv += (data.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
        data.length > 1 && !['1111', 'Invoice'].includes(obj.invType)) ?
        num : 0;

    }
  });

  return accumuLastInv;
}

const setInvoicesDTStatement = async (con, invArr) => {
  let arr = [];
 let custInvArr = [...new Set((con.poInvoices || []).map(x => x.invRef).flat())].map(x => parseFloat(x))

  custInvArr.forEach(invNum => {
    if (invArr.includes(invNum)) {
      let obj = {}
      let totalAmnt = 0;
      let totalPmnt = 0;
      let totalBlnc = 0;
      let poInvArr = []
      con.poInvoices.forEach(poInv => {
        if (parseFloat(poInv.invRef[0]) === invNum) {
          totalAmnt += parseFloat(poInv.invValue * 1);
          totalPmnt += parseFloat(poInv.pmnt * 1);
          totalBlnc += parseFloat(poInv.blnc * 1);
          poInvArr.push(poInv.inv)
        }
      })

      obj = { key: invNum, totalAmnt, totalPmnt, totalBlnc, poInvArr }

      arr.push(obj)
    }

  });
  return arr;
}

const loadContractsStatement = async (uidCollection, invoice) => {
  let obj = invoice[0][0].poSupplier

  let con = await loadInvoice(uidCollection, 'contracts', obj)
  return con;
}

const Shipments = () => {

  const { settings, dateSelect, setLoading, loading, setDateYr, ln } = useContext(SettingsContext);
  const { valueCon, setValueCon, contractsData, setContractsData, isOpenCon, setIsOpenCon } = useContext(ContractsContext);
  const { blankInvoice, setIsInvCreationCNFL, setInvoicesData, invoicesData } = useContext(InvoiceContext);
  const { blankExpense } = useContext(ExpensesContext);
  const { uidCollection } = UserAuth();
  const [totals, setTotals] = useState([]);
  const [valCur, setValCur] = useState({ cur: 'us' })
  const [filteredData, setFilteredData] = useState([]);
  const [dataTable, setDataTable] = useState([])

  // Tab state - 'review' or 'statement'
  const [activeTab, setActiveTab] = useState('review')

  // Statement specific states
  const [dataTableStatement, setDataTableStatement] = useState([])
  const [dtSumSupplers, setDtSumSupplers] = useState([])
  const [dtSumClients, setDtSumClients] = useState([])
  const [filteredArrayStatement, setFilteredArrayStatement] = useState([])
  const [invDataStatement, setInvDataStatement] = useState([])

  const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

  const makeGroup = (arr) => {
    /* const groupedByPoSupplierId = arr.reduce((acc, invoice) => {
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
     */
    const groupedByInvoiceNum = arr.reduce((acc, invoice) => {
      const invoiceNum = invoice.invoice; // Safely access poSupplier.id
      if (invoiceNum) {
        // If the poSupplier.id exists, group by this id
        if (!acc[invoiceNum]) {
          acc[invoiceNum] = [];
        }
        acc[invoiceNum].push(invoice);
      }
      return acc;
    }, {});

    return groupedByInvoiceNum;

  }


  const loadContracts = async (uidCollection, invoice) => {
    let obj = invoice[0].poSupplier

    let con = await loadInvoice(uidCollection, 'contracts', obj)
    return con;
  }

  useEffect(() => {

    const Load = async () => {
      setLoading(true)

      let dt = await loadData(uidCollection, 'invoices', dateSelect);

      setInvoicesData(dt)
      setLoading(false)
    }

    Object.keys(settings).length !== 0 && Load();

  }, [dateSelect, settings])


  useEffect(() => {

    const loadInv = async () => {

      let dt = makeGroup(invoicesData)
      dt = Object.values(dt)

      dt = await Promise.all(
        dt.map(async (x) => {
          const con = await loadContracts(uidCollection, x)
          return {
            ...con,
            invoicesData: x,
          };
        })
      );


      setContractsData(dt.map(data => {
        const { invoicesData, ...rest } = data;
        return rest;
      }));

      let newArr = []

      dt.forEach(innerObj => {
        if (innerObj.invoicesData && Array.isArray(innerObj.invoicesData)) {
          let reducedArr = innerObj.poInvoices.filter(invoice => invoice.invRef.includes((innerObj.invoicesData[0].invoice).toString()));

          newArr.push({
            arr: innerObj.invoicesData, poCur: innerObj.cur, order: innerObj.order, supplier: innerObj.supplier, euroToUSD: innerObj.euroToUSD,
            poInvoices: reducedArr.map(invoice => invoice.inv),
            invAmntSup: reducedArr.map(invoice => invoice.invValue),
            prpMntSup: reducedArr.map(item => item.pmnt),
            blncSup: reducedArr.map(item => item.blnc),
          })

        }
      })

      dt = setCurFilterData(newArr)

      setDataTable(dt)
      setFilteredData(dt)
    }

    loadInv()

  }, [invoicesData])


  useEffect(() => {

    const Load = () => {
      let dt2 = setTtl(dataTable.filter(x => filteredData.map(z => z.id).includes(x.id)))
      setTotals(dt2)
    }

    Load();
  }, [filteredData])

  // Statement data loading
  useEffect(() => {
    if (invoicesData.length > 0) {
      setInvDataStatement(invoicesData)
    }
  }, [invoicesData])

  useEffect(() => {

    const loadInvStatement = async () => {

      let dt = Object.values(makeGroupStatement(invDataStatement))

      let newArr = []
      let consArr = []
      const promises = dt.map(async innerObj => {

        const con = await loadContractsStatement(uidCollection, innerObj)
        consArr = [...consArr, con]

        let invArr = innerObj.flatMap(dt => dt.map(item => item.invoice,))

        const tmpdata = await setInvoicesDTStatement(con, invArr)

        const innerPromises = tmpdata.map(async obj => {

          newArr.push({ ...obj, ...con, invData: innerObj, type: 'con' })

          let expArr = [];

          innerObj.forEach(obj1 => {
            if (Array.isArray(obj1[0].expenses) && obj1[0].invoice === obj.key) {
              expArr.push(...obj1[0].expenses);
            }
          });

          let yrs = [...new Set(expArr.map(x => x.date.substring(0, 4)))]
          let arrTmp = [];

          for (let i = 0; i < yrs.length; i++) {
            let yr = yrs[i];
            let tmpDt = [...new Set(expArr.filter(x => x.date.substring(0, 4) === yr).map(y => y.id))]
            let obj2 = { yr: yr, arrInv: tmpDt }
            arrTmp.push(obj2)
          }

          let tmpInv = await getExpenses(uidCollection, 'expenses', arrTmp)

          tmpInv.forEach(obj1 => {
            newArr.push({ ...obj, ...con, invData: obj1, type: 'exp' })
          });

        })
        return Promise.all(innerPromises);

      })
      await Promise.all(promises);

      newArr = newArr.sort((a, b) => {
        return a.key - b.key;
      });

      dt = setCurFilterDataStatement(newArr)

      setDtSumSupplers(sumSuppliers(dt))
      setDtSumClients(sumClients(dt))

      setDataTableStatement(dt)
      setFilteredArrayStatement(dt)
    }

    if (invDataStatement.length > 0) {
      loadInvStatement()
    }
  }, [invDataStatement])

  // Statement filter effects
  useEffect(() => {
    if (filteredArrayStatement.length > 0 && dataTableStatement.length > 0) {
      const invNumsArr = filteredArrayStatement.map(z => z.InvNum * 1)
      const filteredArrayDT = dataTableStatement.filter(obj => invNumsArr.includes(obj.InvNum)).filter(z => z.client !== '');
      setDtSumClients(sumClients(filteredArrayDT))

      const idArr = filteredArrayStatement.map(z => z.id)
      let filteredArrayDTs = dataTableStatement.filter(obj => idArr.includes(obj.id)).map(z => ({
        ...z,
      }))

      filteredArrayDTs = filteredArrayDTs.filter(obj => filteredArrayStatement.map(z => z.supplier))

      setDtSumSupplers(sumSuppliers(filteredArrayDTs))
    }
  }, [filteredArrayStatement])


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
      const etd = addData.etd === '' ? '' : dateFormat(addData.etd.startDate, 'dd.mm.yy');
      const eta = addData.eta === '' ? '' : dateFormat(addData.eta.startDate, 'dd.mm.yy');
      const poCur = x.poCur

      const orderFull = order;
      const orderTrunc = (() => { const s = String(order || ''); return s.length > 10 ? s.slice(0, 10) + '\u2026' : s; })();

      return {
        ...x.arr[0],
        supplier,
        supplierInv: x.poInvoices,
        supplierInvAmount: x.invAmntSup,
        supplierPrepayment: x.prpMntSup,
        supBlnc: x.blncSup,
        order: orderTrunc,
        orderFull,
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

  const setCurFilterDataStatement = (arr) => {

    let dt = arr.map((x) => {

      const supplier = x.type === 'con' ? x.supplier : x.invData.supplier
      const supInvoices = x.type === 'con' ? x.poInvArr : x.invData.expense
      const expType = x.type === 'con' ? 'Commercial' : x.invData.expType
      const invAmount = x.type === 'con' ? x.totalAmnt : x.invData.amount
      const pmntAmount = x.type === 'con' ? x.totalPmnt : '';
      const blnc = x.type === 'con' ? x.totalBlnc : '';

      const InvNum = x.key
      let invTmp = x.type === 'con' ? x.invData.flatMap(item => item)
        .filter(z => z.invoice === InvNum) : {}

      let tmp = x.type === 'con' ? invTmp[invTmp.length - 1] : ''
      let dateInv = x.type === 'con' ? tmp.final ? tmp.date : tmp.dateRange.startDate : ''
      let client = x.type === 'con' ? tmp.client : ''
      const totalInvoices = x.type === 'con' ? TotalStatement(invTmp, 'totalAmount', x.euroToUSD, settings) : '';
      const totalPrepayment1 = x.type === 'con' ? TotalStatement(invTmp, 'totalPrepayment', x.euroToUSD, settings) : ''
      const prepaidPer = x.type === 'con' ? isNaN(totalPrepayment1 / totalInvoices) ? '-' : ((totalPrepayment1 / totalInvoices) * 100).toFixed(1) + '%' : ''

      let totalPmnts = x.type === 'con' ? x.invData.map(z => z[0]).filter(z => z.invoice === x.key).map(x => x.payments)
        .flat().reduce((sum, item) => sum + parseFloat(item.pmnt || 0), 0)
        : 0

      const inDebt = x.type === 'con' ? totalInvoices - totalPmnts : ''
      const cmnts = x.type === 'con' ? tmp.comments : ''

      const rcvd = tmp.shipData?.rcvd
      const fnlzing = tmp.shipData?.fnlzing
      const status = tmp.shipData?.status
      const etd = tmp ? tmp.shipData.etd.startDate == null || tmp.shipData.etd.startDate === '' ? '' : dateFormat(tmp.shipData?.etd.startDate, 'dd.mm.yy') : ''
      const eta = tmp ? tmp.shipData.eta.startDate == null || tmp.shipData.eta.startDate === '' ? '' : dateFormat(tmp.shipData?.eta.startDate, 'dd.mm.yy') : ''

      const cur = x.type === 'con' ? x.cur : x.invData.cur
      const curInvoice = x.type === 'con' ? tmp.cur : ''

      const supInvArr = Array.isArray(supInvoices) ? supInvoices : [supInvoices];
      const supInvoicesFull = supInvArr;
      const supInvoicesTrunc = supInvArr.map(truncInv);

      return {
        ...x,
        supplier,
        supInvoices: supInvoicesTrunc,
        supInvoicesFull,
        expType,
        invAmount,
        pmntAmount,
        blnc,
        InvNum,
        dateInv,
        client,
        totalInvoices,
        totalPrepayment1,
        prepaidPer,
        inDebt,
        cmnts,

        rcvd,
        fnlzing,
        status,
        etd,
        eta,

        cur,
        curInvoice,
        totalPmnts

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
      cell: (props) => { const val = props.getValue(); const full = props.row.original.orderFull; const isTrunc = full && full !== val; return <Tltip tltpText={full} show={isTrunc} direction="top"><span className="cursor-default">{val}</span></Tltip>; },
      ttlUS: getTtl('Total', ln) + ' $:', ttlEU: getTtl('Total', ln) + ' €:',
      meta: { excludeFromQuickSum: true }
    }, //false
    {
      accessorKey: 'supplier', header: getTtl('Supplier', ln), bgt: 'bg-green-500', bgr: 'bg-green-50',
      meta: {
        filterVariant: 'selectSupplier',
      },
    },
    {
      accessorKey: 'supplierInv', header: getTtl('Supplier inv', ln), bgt: 'bg-green-500', bgr: 'bg-green-50', cell: (props) => { const arr = props.getValue(); const full = props.row.original.supplierInvFull || []; return <div>{arr.map((item, i) => { const isTrunc = full[i] && full[i] !== item; return <Tltip key={i} tltpText={full[i]} show={isTrunc} direction="top"><div className={i < arr.length - 1 ? 'border-b border-[var(--rock-blue)] py-0.5 cursor-default' : 'py-0.5 cursor-default'}>{item}</div></Tltip>; })}</div>; },
      meta: { excludeFromQuickSum: true },
    },
    {
      accessorKey: 'supplierInvAmount', header: getTtl('Sup Inv amount', ln), bgt: 'bg-green-500', bgr: 'bg-green-50', cell: (props) => { const arr = props.getValue(); return <div>{arr.map((item, i) => <div key={i} className={i < arr.length - 1 ? 'border-b border-[var(--rock-blue)] py-0.5' : 'py-0.5'}>{showAmountPO(item, props)}</div>)}</div>; }, ttlUS: showAmountTtl(totals[0]?.us.supplierInvAmount, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.supplierInvAmount, 'EUR'),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'supplierPrepayment', header: getTtl('Sup Prepayment', ln), bgt: 'bg-green-500', bgr: 'bg-green-50', cell: (props) => { const arr = props.getValue(); return <div>{arr.map((item, i) => <div key={i} className={i < arr.length - 1 ? 'border-b border-[var(--rock-blue)] py-0.5' : 'py-0.5'}>{showAmountPO(item, props)}</div>)}</div>; }, ttlUS: showAmountTtl(totals[0]?.us.supplierPrepayment, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.supplierPrepayment, 'EUR'),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'supBlnc', header: getTtl('Balance', ln), bgt: 'bg-green-500', bgr: 'bg-green-50', cell: (props) => { const arr = props.getValue(); return <div>{arr.map((item, i) => <div key={i} className={i < arr.length - 1 ? 'border-b border-[var(--rock-blue)] py-0.5' : 'py-0.5'}>{showAmountPO(item, props)}</div>)}</div>; }, ttlUS: showAmountTtl(totals[0]?.us.supBlnc, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.supBlnc, 'EUR'),
      meta: {
        filterVariant: 'range',
      },
    },

    { accessorKey: 'invoice', header: getTtl('Invoice', ln), bgt: 'bg-amber-400', bgr: 'bg-amber-50',  cell: (props) => <div>{String(props.getValue()).padStart(4, "0") }</div>, meta: { excludeFromQuickSum: true } },
    {
      accessorKey: 'client', header: getTtl('Consignee', ln), bgt: 'bg-amber-400', bgr: 'bg-amber-50', meta: {
        filterVariant: 'selectClient',
      },
    },
    {
      accessorKey: 'totalAmount', header: getTtl('invValueSale', ln), bgt: 'bg-amber-400', bgr: 'bg-amber-50', cell: (props) => <p>{showAmountInv(props)}</p>,
      meta: {
        filterVariant: 'range',
      },
      ttlUS: showAmountTtl(totals[0]?.us.totalAmount, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.totalAmount, 'EUR')
    },
    {
      accessorKey: 'prepaidPer', header: getTtl('Prepaid', ln) + ' %', bgt: 'bg-amber-400', bgr: 'bg-amber-50',
      ttlUS: totals[0]?.us.prepaidPer, ttlEU: totals[1]?.eu.prepaidPer,
      meta: { excludeFromQuickSum: true }
    },
    {
      accessorKey: 'totalPrepayment1', header: getTtl('Prepaid Amount', ln), bgt: 'bg-amber-400', bgr: 'bg-amber-50', cell: (props) => <p>{showAmountInv(props)}</p>,
      meta: {
        filterVariant: 'range',
      },
      ttlUS: showAmountTtl(totals[0]?.us.totalPrepayment1, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.totalPrepayment1, 'EUR')
    },
    {
      accessorKey: 'debtaftr', header: getTtl('debtAfterPrepPmnt', ln), bgt: 'bg-amber-400', bgr: 'bg-amber-50', cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.debtaftr, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.debtaftr, 'EUR')
    }, //false


    { accessorKey: 'status', header: getTtl('Release Status', ln), bgt: 'bg-purple-800', bgr: 'bg-purple-50' }, //false
    {
      accessorKey: 'etd', enableSorting: false, header: 'ETD', bgt: 'bg-purple-800', bgr: 'bg-purple-50',
      meta: {
        filterVariant: 'dates',
        excludeFromQuickSum: true,
      },
      filterFn: 'dateBetweenFilterFn'
    },//false
    {
      accessorKey: 'eta', enableSorting: false, header: 'ETA', bgt: 'bg-purple-800', bgr: 'bg-purple-50',
      meta: {
        filterVariant: 'dates',
        excludeFromQuickSum: true,
      },
      filterFn: 'dateBetweenFilterFn'
    },//false

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
      ttlUS: showAmountTtl(totals[0]?.us.payments, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.payments, 'EUR'),
      meta: {
        filterVariant: 'range',
      },
    },
  ];


  let invisible = ['supBlnc', 'etd', 'eta', 'rcvd', 'outrnamnt', 'fnlzing',
    'inDebt', 'payments'].reduce((acc, key) => {
      acc[key] = false
      return acc;
    }, {});

  // Statement columns
  let showAmountStatement = (x) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: x.row.original.cur,
      minimumFractionDigits: 2
    }).format(x.getValue())
  }

  let showAmountInvStatement = (x) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: x.row.original?.curInvoice || 'USD',
      minimumFractionDigits: 2
    }).format(x.getValue())
  }

  let propDefaultsStatement = Object.keys(settings).length === 0 ? [] : [
    {
      accessorKey: 'supplier', header: getTtl('Supplier', ln), meta: {
        filterVariant: 'selectSupplier',
      },
    },
    {
      accessorKey: 'supInvoices', header: getTtl('Supplier inv', ln), cell: (props) => { const arr = Array.isArray(props.getValue()) ? props.getValue() : [props.getValue()]; const full = props.row.original.supInvoicesFull || arr; return <div>{arr.map((item, i) => { const isTrunc = full[i] && full[i] !== item; return <Tltip key={i} tltpText={full[i]} show={isTrunc} direction="top"><div className={i < arr.length - 1 ? 'border-b border-[var(--rock-blue)] py-0.5 cursor-default' : 'py-0.5 cursor-default'}>{item}</div></Tltip>; })}</div>; },
      meta: { excludeFromQuickSum: true },
    },
    { accessorKey: 'expType', header: getTtl('Invoice Type', ln), },
    {
      accessorKey: 'invAmount', header: getTtl('Invoices amount', ln), cell: (props) => <div>{showAmountStatement(props)}</div>, meta: {
        filterVariant: 'range',
      },
    },
    {
      accessorKey: 'pmntAmount', header: getTtl('Prepayment', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmountStatement(props)}</div>, meta: {
        filterVariant: 'range',
      },
    },
    {
      accessorKey: 'blnc', header: getTtl('Balance', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmountStatement(props)}</div>, meta: {
        filterVariant: 'range',
      },
    },
    { accessorKey: 'InvNum', header: getTtl('Invoice', ln) + ' #', cell: (props) => <div>{String(props.getValue()).padStart(4, "0")}</div>, meta: { excludeFromQuickSum: true } },
    {
      accessorKey: 'dateInv', header: getTtl('Date', ln), cell: (props) => <p>{props.getValue() === '' ? '' : dateFormat(props.getValue(), 'dd.mm.yy')}</p>,
      meta: {
        filterVariant: 'dates',
        excludeFromQuickSum: true,
      },
      filterFn: 'dateBetweenFilterFn'
    },
    {
      accessorKey: 'client', header: getTtl('Consignee', ln), meta: {
        filterVariant: 'selectClient',
      },
    },
    {
      accessorKey: 'totalInvoices', header: getTtl('Amount', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmountInvStatement(props)}</div>, meta: {
        filterVariant: 'range',
      },
    },
    { accessorKey: 'prepaidPer', header: getTtl('Prepaid', ln) + ' %', meta: { excludeFromQuickSum: true } },
    {
      accessorKey: 'totalPrepayment1', header: getTtl('Prepaid Amount', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmountInvStatement(props)}</div>, meta: {
        filterVariant: 'range',
      },
    },
    {
      accessorKey: 'inDebt', header: getTtl('Initial Debt', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmountInvStatement(props)}</div>, meta: {
        filterVariant: 'range',
      },
    },
    { accessorKey: 'cmnts', header: getTtl('Comments', ln), cell: (props) => <p className='text-balance w-[200px] py-1'>{props.getValue()}</p> },

    { accessorKey: 'rcvd', header: 'Outturn', },
    { accessorKey: 'fnlzing', header: getTtl('Finalizing', ln) },
    { accessorKey: 'status', header: getTtl('Release Status', ln), },
    { accessorKey: 'etd', enableSorting: false, header: 'ETD', meta: { excludeFromQuickSum: true } },
    { accessorKey: 'eta', enableSorting: false, header: 'ETA', meta: { excludeFromQuickSum: true } },
  ];

  let invisibleStatement = ['rcvd', 'fnlzing', 'status', 'etd', 'eta'].reduce((acc, key) => {
    acc[key] = false
    return acc;
  }, {});


  const truncInv = (inv) => {
    const s = String(inv || '');
    return s.length > 23 ? s.slice(0, 23) + '\u2026' : s;
  };

  const getFormatted = (arr) => {  //convert id's to values

    let newArr = []

    arr.forEach(row => {
      let formattedRow = {
        ...row, supplier: gQ(row.supplier, 'Supplier', 'nname'),
        cur: gQ(row.cur, 'Currency', 'cur'),
        poCur: gQ(row.poCur, 'Currency', 'cur'),
        client: gQ(row.client, 'Client', 'nname'),
        status: getD(relStts, row, 'status'),
        rcvd: getD(OutTurn, row, 'rcvd'),
        fnlzing: getD(Finalizing, row, 'fnlzing'),
        supplierInvFull: row.supplierInv || [],
        supplierInv: (row.supplierInv || []).map(truncInv),
      }

      newArr.push(formattedRow)
    })

    return newArr
  }

  const getFormattedStatement = (arr) => {

    let newArr = []

    arr.forEach(row => {
      let formattedRow = {
        ...row,
        supplier: gQ(row.supplier, 'Supplier', 'nname'),
        expType: row.expType !== 'Commercial' ? gQ(row.expType, 'Expenses', 'expType') : 'Commercial',
        cur: gQ(row.cur, 'Currency', 'cur'),
        client: typeof row.client === 'object' ? row.client.nname : gQ(row.client, 'Client', 'nname'),
        fnlzing: getD(Finalizing, row, 'fnlzing'),
        status: getD(relStts, row, 'status'),
        rcvd: getD(OutTurn, row, 'rcvd'),
        InvNum: (row.InvNum).toString(),
        curInvoice: gQ(row.curInvoice, 'Currency', 'cur'),
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

  const SelectRowStatement = (row) => {
    setValueCon(contractsData.find(x => x.id === row.id));
    blankInvoice();
    setDateYr(row.dateRange.startDate.substring(0, 4));
    blankExpense();
    setIsInvCreationCNFL(false);
    setIsOpenCon(true);
  };

  return (
    <div className="w-full " style={{ background: "#f8fbff" }}>
      <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
        {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
          <>
            <Toast />
            {/* Main Card */}
            <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8]  w-full bg-white">
              {/* Header Section */}
              <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                <h1 className="text-[14px] text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2" style={{ fontSize: '14px' }}>
                  {getTtl('Invoices', ln)}
                </h1>
                {/* <div className='flex group'>
                  <DateRangePicker />
                  <Tooltip txt='Select Dates Range' />
                </div> */}
              </div>

              {/* Tabs */}
              <div className='flex gap-8 mt-4 mb-6'>
                <button
                  onClick={() => setActiveTab('review')}
                  className={`pb-1 text-xs font-semibold transition-all border-b-2 ${
                    activeTab === 'review'
                      ? 'border-[var(--endeavour)] text-[var(--endeavour)]'
                      : 'border-transparent text-[var(--port-gore)] hover:text-[var(--endeavour)]'
                  }`}
                  style={{ background: 'none', boxShadow: 'none', borderRadius: 0 }}
                >
                  {getTtl('Invoices Review', ln)}
                </button>
                <button
                  onClick={() => setActiveTab('statement')}
                  className={`pb-1 text-xs font-semibold transition-all border-b-2 ${
                    activeTab === 'statement'
                      ? 'border-[var(--endeavour)] text-[var,--endeavour)]'
                      : 'border-transparent text-[var(--port-gore)] hover:text-[var(--endeavour)]'
                  }`}
                  style={{ background: 'none', boxShadow: 'none', borderRadius: 0 }}
                >
                  {getTtl('Invoices Statement', ln)}
                </button>
              </div>

              {/* Review Tab Content */}
              {activeTab === 'review' && (
                <div className='mt-5'>
                  <Customtable data={loading ? [] : getFormatted(dataTable)} columns={propDefaults} SelectRow={SelectRow}
                    setFilteredData={setFilteredData} valCur={valCur}
                    setValCur={setValCur} invisible={invisible}
                    excellReport={EXD(dataTable.filter(x => filteredData.map(z => z.id).includes(x.id)),
                      settings, getTtl('Invoices Review', ln), ln, totals)} ln={ln} />
                </div>
              )}

              {/* Statement Tab Content */}
              {activeTab === 'statement' && (
                <>
                  <div className='mt-5'>
                    <CustomtableStatement data={loading ? [] : getFormattedStatement(dataTableStatement)} columns={propDefaultsStatement} SelectRow={SelectRowStatement}
                      ln={ln} invisible={invisibleStatement}
                      excellReport={EXDStatement(dataTableStatement.filter(x => new Set(filteredArrayStatement.map(z => `${z.id}-${z.type}`)).has(`${x.id}-${x.type}`)),
                        settings, getTtl('Invoices Statement', ln), ln, dtSumSupplers, dtSumClients)}
                      setFilteredArray={setFilteredArrayStatement}
                    />
                  </div>

                  <div className='flex gap-2 flex-wrap xl:flex-nowrap'>
                    <SumTableSupplier dtSumSupplers={dtSumSupplers} loading={loading} settings={settings}
                      ln={ln} dataTable={getFormattedStatement(dataTableStatement)} rmrk='sup' />
                    <SumTableClient dtSumClients={dtSumClients} loading={loading} settings={settings}
                      ln={ln} dataTable={getFormattedStatement(dataTableStatement)} rmrk='clnt' />
                  </div>
                </>
              )}
            </div>

            {/* Modal */}
            {valueCon && <MyDetailsModal isOpen={isOpenCon} setIsOpen={setIsOpenCon}
              title={!valueCon.id ? getTtl('New Contract', ln) : `${getTtl('Contract No', ln)}: ${valueCon.order}`} />}
          </>
        }
      </div>
    </div>
  );
};

export default Shipments;

