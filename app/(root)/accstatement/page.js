'use client';
import React, { useContext, useEffect, useState, } from 'react';
import Customtable from './newTable';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import Toast from '../../../components/toast.js'
import { InvoiceContext } from "../../../contexts/useInvoiceContext";

import { loadAcntStatement, loadData, loadDataWeightAnalysis, loadInvoice, sortArr } from '../../../utils/utils'
import Spinner from '../../../components/spinner';
import { UserAuth } from "../../../contexts/useAuthContext"
import { groupedArrayInvoice, getD } from '../../../utils/utils'
import Spin from '../../../components/spinTable';
import { Numcur, SumValuesSupplier } from '../ContractsReview&Statement/funcs'
import CBox from '../../../components/combobox.js'
import dateFormat from "dateformat";
import { EXD } from './excel'
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';
import { FaFilePdf } from 'react-icons/fa';
import { PdfAccountStatement } from '../contracts/modals/pdf/pdfAccountStatement';
import Tooltip from '../../../components/tooltip';
import Tltip from '../../../components/tlTip';
import MyComboboxSelect from './components/comboboxSelect';
import { Button } from '../../../components/ui/button';
import Datepicker from "react-tailwindcss-datepicker";
// import { userAgentFromString } from '@node_modules/next/server';
import { disabledDates } from './disabledDates';
import VideoLoader from '../../../components/videoLoader';

const fieldOrder = [
  "invoice",
  "date",
  "amount",
  "cur",
  "due",
  "paid",
  "notPaid"
];

const AccountStatement = () => {

  const { settings, dateSelect, compData, setLoading, loading, ln, setToast } = useContext(SettingsContext);
  const { setInvoicesData, invoicesData } = useContext(InvoiceContext);
  const { uidCollection, gisAccount } = UserAuth();
  const [totals, setTotals] = useState([]);
  const [valCur, setValCur] = useState({ cur: 'us' })
  const [filteredData, setFilteredData] = useState([]);
  const [dataTable, setDataTable] = useState([])
  const [selectedClient, setselectedClient] = useState({ client: '' })

  const [valueDate, setValueDate] = useState({
    startDate: null,
    endDate: null
  });


  const handleDateChange = (newValue) => {

    const date = new Date(newValue.startDate);
    const day = date.getDate();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    if (day !== 15 && day !== lastDay) {
      setToast({ show: true, text: 'You must select 15 or the last day of the month', clr: 'fail' })
      return;
    }

    setValueDate(newValue);
  }

  const handleUpdateClient = (e) => {
    setselectedClient({ client: e.id })
  }

  const CB = (settings, selectedClient) => {
    return (
      <div className='flex flex-col sm:flex-row items-start sm:items-center gap-2'>
        <MyComboboxSelect
          data={sortArr(settings.Client.Client.filter(x => !x.deleted), 'nname')}
          setValue={handleUpdateClient}
          idx={0}
          value={settings.Client.Client.find(z => z.id === selectedClient.client)}
          name='nname'
          classes='shadow-md h-10 w-full sm:max-w-[140px]'
          plcHolder='Select client' />
        <div className='flex group datepicker-wrapper w-full sm:w-auto'>
          <Datepicker
            inputClassName='border border-[#0366ae] py-2 pl-3 pr-3 rounded-full text-[#103a7a] placeholder:text-[#103a7a] w-full sm:w-44
              focus:outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer bg-white shadow-sm text-[0.68rem]'
            useRange={false}
            asSingle={true}
            value={valueDate}
            onChange={handleDateChange}
            displayFormat={"DD-MMM-YY"}
            placeholder="Select date"
            showShortcuts={false}
            readOnly={true}
            containerClassName="z-20 relative"
            disabledDates={disabledDates}
          />
        </div>
      </div>
    )
  }

  useEffect(() => {
    const loadData = async () => {
      if (valueDate.startDate && selectedClient.client) {
        setLoading(true)

        const year = new Date(valueDate.startDate).getFullYear();
        const month = new Date(valueDate.startDate).toLocaleString("en-US", { month: "long" });
        let date1 = new Date(valueDate.startDate).getDate() === 15 ? `mid${month.substring(0, 3)}` : month

        let dt = await loadAcntStatement(uidCollection, String(year), selectedClient.client, date1);
        dt = dt?.data?.map(z => ({ ...z, invoice: (z.invoice).toString() })).map(item => {
          const orderedItem = {};
          fieldOrder.forEach(key => {
            orderedItem[key] = item[key] ?? ""; // empty string if missing
          });
          return orderedItem;
        }) || []


        setDataTable(dt)
        setFilteredData(dt)
        setLoading(false)
      }
    }


    loadData()
  }, [valueDate, selectedClient])

  /*
    useEffect(() => {
  
      const Load = async () => {
        setLoading(true)
  
        let dt = await loadDataWeightAnalysis(uidCollection, 'invoices', dateSelect, 'client', selectedClient.client);
        dt = dt.map(z => ({ ...z, invoice: (z.invoice).toString() }))
  
        setInvoicesData(dt)
        setLoading(false)
      }
  
  
      Object.keys(settings).length !== 0 && dateSelect.start && dateSelect.end &&
        selectedClient.client !== '' && Load();
  
    }, [dateSelect, settings, selectedClient])
  */
  /*
    useEffect(() => {
  
      const loadInv = async () => {
  
        let groupedArr = groupedArrayInvoice(invoicesData)
  
        let arr = []
  
        groupedArr.forEach(x => {
  
          let totalPayments = 0;
          let finalInv = null;
  
          if (x.length > 1) {
            finalInv = x.find(q => q.invType !== '1111')
  
            x.forEach(obj => {
              obj.payments.forEach(payment => {
                totalPayments += parseFloat(payment.pmnt);  // Ensure the value is parsed as a number
              });
            });
  
          } else {
            finalInv = x[0];
  
            finalInv.payments.forEach(payment => {
              totalPayments += parseFloat(payment.pmnt);  // Ensure the value is parsed as a number
            });
  
          }
  
          const date1 = new Date(finalInv?.date);  // Create a Date object from the string
          const daysToAdd = 5;  // Example: Add 5 days
          date1.setDate(date1.getDate() + daysToAdd);  // Add the number of days
          const formattedDate = date1.toISOString().split('T')[0];
  
          let obj = {
            invoice: finalInv.invoice, date: finalInv.date, amount: Math.round(finalInv.totalAmount * 100) / 100,
            cur: finalInv.cur, due: formattedDate, paid: Math.round(totalPayments * 100) / 100,
            notPaid: Math.round(finalInv.totalAmount * 100) / 100 - Math.round(totalPayments * 100) / 100
          }
  
          arr.push(obj)
  
        })
  
        setDataTable(arr)
        setFilteredData(arr)
      }
  
      loadInv()
  
    }, [invoicesData])
  */

  useEffect(() => {

    const Load = () => {
      let dt2 = setTtl(filteredData)
      setTotals(dt2)
    }

    Load();
  }, [filteredData])


  const setTtl = (filteredData) => {

    const curArr = ['us', 'eu']
    let Ttls = [];

    // totals
    for (let i = 0; i < curArr.length; i++) {

      const amount = filteredData.reduce((total, obj) => {
        return total + Numcur(obj, 'amount', curArr[i], settings);
      }, 0);
      //////////////////////////////////////////
      const paid = filteredData.reduce((total, obj) => {
        return total + Numcur(obj, 'paid', curArr[i], settings);
      }, 0);

      const notPaid = filteredData.reduce((total, obj) => {
        return total + Numcur(obj, 'notPaid', curArr[i], settings);
      }, 0);

      let ttls = { amount, paid, notPaid }
      Ttls = [...Ttls, { [curArr[i]]: ttls }]

    }

    return Ttls;

  }

  let showAmountInv = (x) => {

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: x.row.original.cur === 'us' ? 'USD' : 'EUR',//x.row?.original?.final ? x.row.original?.cur?.cur || 'USD' : x.row?.original?.cur,
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
      accessorKey: 'invoice', header: getTtl('Invoice', ln),
      ttlUS: getTtl('Total', ln) + ' $:', ttlEU: getTtl('Total', ln) + ' €:',
      meta: { excludeFromQuickSum: true }
    },
    {
      accessorKey: 'date', header: getTtl('Date', ln), cell: (props) => <div>{dateFormat(props.getValue(), 'dd.mm.yy')} </div>,
      meta: {
        filterVariant: 'dates',
        excludeFromQuickSum: true,
      },
      filterFn: 'dateBetweenFilterFn'
    },
    {
      accessorKey: 'amount', header: getTtl('Amount', ln), cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.amount, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.amount, 'EUR'),
      meta: {
        filterVariant: 'range',
      },
    },

    { accessorKey: 'cur', header: getTtl('Currency', ln), cell: (props) => { const v = (props.getValue() || '').toLowerCase(); const isUsd = v === 'us' || v === 'usd'; const isEur = v === 'eu' || v === 'eur'; return <span style={{ background: isUsd ? '#b7d1b5' : isEur ? '#dbeeff' : '#f0f0f0', color: isUsd ? '#2d6a2d' : isEur ? 'var(--chathams-blue)' : '#555', borderRadius: '8px', padding: '3px 14px', fontWeight: 500, fontSize: '12px', display: 'inline-block' }}>{isUsd ? '$' : isEur ? '€' : v}</span> } },
    {
      accessorKey: 'due', header: getTtl('DuePayment', ln), cell: (props) => <div>{dateFormat(props.getValue(), 'dd.mm.yy')} </div>,
      meta: {
        filterVariant: 'dates',
        excludeFromQuickSum: true,
      },
      filterFn: 'dateBetweenFilterFn'
    },
    {
      accessorKey: 'paid', header: getTtl('Paid', ln), cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.paid, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.paid, 'EUR'),
      meta: {
        filterVariant: 'range',
      },
    },
    {
      accessorKey: 'notPaid', header: getTtl('UnPaid', ln), cell: (props) => <p>{showAmountInv(props)}</p>,
      ttlUS: showAmountTtl(totals[0]?.us.notPaid, 'USD'), ttlEU: showAmountTtl(totals[1]?.eu.notPaid, 'EUR')
    },
  ];


  let invisible = ['cur'].reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});

  const getFormatted = (arr) => {  //convert id's to values

    let newArr = []
    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

    arr.forEach(row => {
      let formattedRow = {
        ...row,
        //      cur: gQ(row.cur, 'Currency', 'cur'),

      }
      newArr.push(formattedRow)
    })

    return newArr
  }


  return (
    <div className="w-full " style={{ background: "#f8fbff" }}>
      <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
        {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
          <>
            <Toast />
            {/* Main Card */}
            <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] shadow-xl w-full bg-[#f8fbff]">
              {/* Header Section */}
              <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                  {getTtl('Account Statement', ln)}
                </h1>
              </div>

              {/* Table Component */}
              <div className='mt-5'>
                <Customtable
                  data={loading ? [] : getFormatted(dataTable)}
                  datattl={loading ? [] : totals}
                  columns={propDefaults}
                  cb={CB(settings, setselectedClient, selectedClient)}
                  settings={settings}
                  setFilteredData={setFilteredData}
                  valCur={valCur}
                  setValCur={setValCur}
                  invisible={invisible}
                  excellReport={EXD(filteredData, settings, getTtl('Account Statement', ln), ln)}
                  ln={ln}
                />
              </div>
            </div>

            {/* PDF Button Section */}
            <div className="responsiveText font-medium leading-5 text-[var(--port-gore)] p-3 flex gap-4 flex-wrap justify-center md:justify-start ">
              <Tltip direction='top' tltpText='Create PDF document'>
                <button
                  type="button"
                  className="blackButton"
                  onClick={() => PdfAccountStatement(filteredData.map(obj => Object.values(obj))
                    .map((values, index) => {
                      const invoice = values[0];
                      const date = dateFormat(values[1], "dd-mmm-yy");
                      const cur = settings.Currency.Currency.find(q => q.id === values[3])?.cur;
                      const amount = new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 2
                      }).format(values[2]);
                      const due = dateFormat(values[4], "dd-mmm-yy");
                      const paid = new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 2
                      }).format(values[5]);
                      const notPaid = new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 2
                      }).format(values[6]);
                      return [invoice, date, amount, cur, due, paid, notPaid];
                    })
                    , settings, compData, selectedClient.client, totals, gisAccount)
                  }
                >
                  <FaFilePdf />
                  PDF
                </button>
              </Tltip>
            </div>
          </>
        }
      </div>
    </div>
  );
};

export default AccountStatement;

