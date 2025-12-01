'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import Customtable from './newTable';
import MyDetailsModal from '../contracts/modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import { ExpensesContext } from "@contexts/useExpensesContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";

import { loadData } from '@utils/utils'
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { getInvoices, groupedArrayInvoice, getD } from '@utils/utils'
import Spin from '@components/spinTable';
import { ContractsValue, SumAllPayments, SumAllExp } from './funcs'
import CBox from '@components/combobox.js'
import { EXD } from './excel'
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';
import Tooltip from '@components/tooltip';


const TotalInvoicePayments = (data, val, mult) => {
    let accumulatedPmnt = 0;

    data.forEach(innerArray => {
        innerArray.forEach(obj => {
            if (obj && Array.isArray(obj.payments)) {
                obj.payments.forEach(payment => {
                    let mltTmp = obj.cur === val.cur ? 1 :
                        obj.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

                    if (payment && !isNaN(parseFloat(payment.pmnt))) {
                        accumulatedPmnt += parseFloat(payment.pmnt * 1 * mltTmp);
                    }
                });
            }
        });
    });

    return accumulatedPmnt;
}

const TotalArrsExp = (data, val, mult) => {
    let accumulatedExp = 0;

    data.forEach(obj => {
        if (obj) {
            let mltTmp = obj.cur === val.cur ? 1 :
                obj.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

            if (obj && !isNaN(parseFloat(obj.amount))) {
                accumulatedExp += parseFloat(obj.amount * 1 * mltTmp);
            }
        };

    });


    return accumulatedExp;
}

const Total = (data, name, val, mult, settings) => {
    let accumuLastInv = 0;
    let accumuDeviation = 0;

    data.forEach(innerArray => {
        innerArray.forEach(obj => {
            if (obj && !isNaN(obj[name])) {
                const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']
                let mltTmp = currentCur === val.cur ? 1 :
                    currentCur === 'us' && val.cur === 'eu' ? 1 / mult : mult

                let num = obj.canceled ? 0 : obj[name] * 1 * mltTmp
                accumuDeviation += (innerArray.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
                    innerArray.length > 1 && ['1111', 'Invoice'].includes(obj.invType)) ?
                    num : 0;

                accumuLastInv += (innerArray.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
                    innerArray.length > 1 && !['1111', 'Invoice'].includes(obj.invType)) ?
                    num : 0;

            }
        });
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
        <CBox data={settings.Currency.Currency} setValue={setValCur} value={valCur} name='cur' classes='input border-slate-300 shadow-sm items-center flex'
            classes2='text-lg' dis={true} />
    )
}
const Shipments = () => {

    const { settings, dateSelect, setLoading, loading, setDateYr, ln } = useContext(SettingsContext);
    const { valueCon, setValueCon, contractsData, setContractsData, isOpenCon, setIsOpenCon } = useContext(ContractsContext);
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

            dt = setCurFilterData(dt)
            setDataTable(dt)
            setFilteredData(dt)
            setLoading(false)
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
            let dt1 = setCurFilterData(dataTable)
            setDataTable(dt1)

            let dt2 = setTtl(filteredData)
            setTotals(dt2)

        }

        Load();
    }, [valCur])

    const setCurFilterData = (arr) => {

        let dt = arr.map((x) => {

            const conValue = ContractsValue(x, 'pmnt', valCur, x.euroToUSD);
            const totalInvoices = Total(x.invoicesData, 'totalAmount', valCur, x.euroToUSD, settings).accumuLastInv;
            const deviation = totalInvoices - Total(x.invoicesData, 'totalAmount', valCur, x.euroToUSD, settings).accumuDeviation;
            const totalPrepayment1 = Total(x.invoicesData, 'totalPrepayment', valCur, x.euroToUSD, settings).accumuLastInv;
            const prepaidPer = isNaN(totalPrepayment1 / totalInvoices) ? '-' : ((totalPrepayment1 / totalInvoices) * 100).toFixed(1) + '%'
            const inDebt = totalInvoices - totalPrepayment1;
            const payments = TotalInvoicePayments(x.invoicesData, valCur, x.euroToUSD);
            const debtaftr = totalPrepayment1 - payments;
            const debtBlnc = totalInvoices - payments;
            const expenses1 = TotalArrsExp(x.expenses, valCur, x.euroToUSD)//TotalArrsExp(x.invoicesData, valCur, euroToUsd);
            const profit = totalInvoices - conValue - expenses1;
            //    const supplier = settings.Supplier.Supplier.find(z => z.id === x.supplier).nname;

            return {
                ...x,
                conValue,
                totalInvoices,
                deviation,
                prepaidPer,
                totalPrepayment1,
                inDebt,
                payments,
                debtaftr,
                debtBlnc,
                expenses1,
                profit,
                //   supplier
            };
        })
        return dt;
    }

    const setTtl = (filteredData) => {

        // totals
        const totalContracts = filteredData.reduce((total, obj) => {
            return total + ContractsValue(obj, 'pmnt', valCur, obj.euroToUSD);
        }, 0);

        const totalInvoices1 = filteredData.reduce((total, obj) => {
            return total + Total(obj.invoicesData, 'totalAmount', valCur, obj.euroToUSD, settings).accumuLastInv;
        }, 0);

        const totalPrepayment2 = filteredData.reduce((total, obj) => {
            return total + Total(obj.invoicesData, 'totalPrepayment', valCur, obj.euroToUSD, settings).accumuLastInv;
        }, 0);

        const expenses2 = SumAllExp(filteredData, valCur)
        const payments1 = SumAllPayments(filteredData, valCur)


        let Ttls = [{
            date: '', order: '', supplier: '', conValue: totalContracts,
            totalInvoices: totalInvoices1, deviation: filteredData.reduce((total, obj) => { return total + obj.deviation }, 0),
            prepaidPer: isNaN(totalPrepayment2 / totalInvoices1) ? '-' : ((totalPrepayment2 / totalInvoices1) * 100).toFixed(2) + '%',
            totalPrepayment1: totalPrepayment2,
            inDebt: (totalInvoices1 - totalPrepayment2),
            payments: payments1, debtaftr: totalPrepayment2 - payments1, debtBlnc: totalInvoices1 - payments1,
            expenses1: expenses2, profit: (totalInvoices1 - totalContracts - expenses2),

            cur: 'us'
        }]

        return Ttls;
    }

    let showAmount = (x) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: getD(settings.Currency.Currency, valCur, 'cur'),
            minimumFractionDigits: 2
        }).format(x)
    }

    let propDefaults = Object.keys(settings).length === 0 ? [] : [

        {
            accessorKey: 'date', header: getTtl('Date', ln), enableSorting: false, cell: (props) => <p>{dateFormat(props.getValue(), 'dd-mmm-yy')}</p>,
            meta: {
                filterVariant: 'dates',
            },
            filterFn: 'dateBetweenFilterFn'
        },
        { accessorKey: 'order', header: getTtl('PO', ln) + '#', ttl: <span className='font-medium'>{getTtl('Total', ln) + ':'}</span> },
        {
            accessorKey: 'supplier', header: getTtl('Supplier', ln), meta: {
                filterVariant: 'selectSupplier',
            },
        },
        {
            accessorKey: 'conValue', header: getTtl('purchaseValue', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.conValue),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'totalInvoices', header: getTtl('invValueSale', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.totalInvoices),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'deviation', header: getTtl('Deviation', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.deviation),
        },
        { accessorKey: 'prepaidPer', header: getTtl('Prepaid', ln) + ' %', ttl: totals[0]?.prepaidPer },
        {
            accessorKey: 'totalPrepayment1', header: getTtl('Prepaid Amount', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.totalPrepayment1),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'inDebt', header: getTtl('Initial Debt', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.inDebt),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'payments', header: getTtl('Actual Payment', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.payments),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'debtaftr', header: getTtl('debtAfterPrepPmnt', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.debtaftr),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'debtBlnc', header: getTtl('Debt Balance', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.debtBlnc),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'expenses1', header: getTtl('Expenses', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.expenses1),
            meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'profit', header: getTtl('Profit', ln), cell: (props) => <p>{showAmount(props.getValue())}</p>, ttl: showAmount(totals[0]?.profit),
            meta: {
                filterVariant: 'range',
            },
        },

    ];

    let invisible = ['date', 'debtBlnc'].reduce((acc, key) => {
        acc[key] = false;
        return acc;
    }, {});

    const getFormatted = (arr) => {  //convert id's to values

        let newArr = []
        const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

        arr.forEach(row => {
            let formattedRow = {
                ...row,
                supplier: gQ(row.supplier, 'Supplier', 'nname'),
            }

            newArr.push(formattedRow)
        })

        return newArr;
    }

    const SelectRow = (row) => {
        setValueCon(contractsData.find(x => x.id === row.id));
        blankInvoice();
        setDateYr(row.dateRange.startDate.substring(0, 4));
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
                            <div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Contracts Review', ln)}</div>
                            <div className='flex group'>
                                <DateRangePicker />
                                <Tooltip txt='Select Dates Range' />
                            </div>
                        </div>


                        <div className='mt-5'>
                            <Customtable data={loading ? [] : getFormatted(dataTable)} datattl={loading ? [] : totals} columns={propDefaults} SelectRow={SelectRow}
                                invisible={invisible} 
                                excellReport={EXD(dataTable.filter(x => filteredData.map(z => z.id).includes(x.id)), settings, getTtl('Contracts Review', ln),
                                     ln, valCur)}
                                cb={CB(settings, setValCur, valCur)}
                                setFilteredData={setFilteredData}
                                valCur={valCur} setValCur={setValCur}
                                ln={ln}

                            />

                        </div>
                    </div>

                    {valueCon && <MyDetailsModal isOpen={isOpenCon} setIsOpen={setIsOpenCon}
                        title={!valueCon.id ? getTtl('New Contract', ln) : `${getTtl('Contract No', ln)}: ${valueCon.order}`} />}
                </>}
        </div>
    );
};

export default Shipments;

