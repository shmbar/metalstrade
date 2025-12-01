'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from './newTable.js';
import MyDetailsModal from '../contracts/modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import Toast from '@components/toast.js'
import { ExpensesContext } from "@contexts/useExpensesContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";

import { getD, loadData } from '@utils/utils'
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { getInvoices, groupedArrayInvoice, getExpenses } from '@utils/utils'
import Spin from '@components/spinTable';
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import { OutTurn, Finalizing, relStts } from '@components/const'
import { sumClients, sumSuppliers } from './sumtables/sumTablesFuncs.js';
import SumTableSupplier from './sumtables/sumTablesSuppliers.js'
import SumTableClient from './sumtables/sumTablesClients.js'
import { EXD } from './excel.js'
import DateRangePicker from '@components/dateRangePicker';


const Total = (data, name, mult, settings) => {
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


const loadInvoices = async (uidCollection, con, invNum) => {

    let yrs = [...new Set(con.invoices.map(x => x.date.substring(0, 4)))]
    let arrTmp = [];

    for (let i = 0; i < yrs.length; i++) {
        let yr = yrs[i]
        let tmpDt = [...new Set(con.invoices.filter(x => x.date.substring(0, 4) === yr).map(y => y.invoice))]
        let obj = { yr: yr, arrInv: tmpDt.filter(item => item === invNum) }
        arrTmp.push(obj)
    }

    let tmpInv = await getInvoices(uidCollection, 'invoices', arrTmp)

    return groupedArrayInvoice(tmpInv)
}

const setInvoicesDT = async (con) => {
    let arr = [];
    let custInvArr = [...new Set(con.poInvoices.map(x => x.invRef).flat())].map(x => parseFloat(x))

    custInvArr.forEach(invNum => {
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

    });
    return arr;
}




const Shipments = () => {

    const { settings, lastAction, dateSelect, setLoading, loading, setDateYr, ln } = useContext(SettingsContext);
    const { valueCon, setValueCon, contractsData, setContractsData, isOpenCon, setIsOpenCon } = useContext(ContractsContext);
    const { blankInvoice, setIsInvCreationCNFL } = useContext(InvoiceContext);
    const { blankExpense } = useContext(ExpensesContext);
    const { uidCollection } = UserAuth();

    const [dataTable, setDataTable] = useState([])
    const [dtSumSupplers, setDtSumSupplers] = useState([])
    const [dtSumClients, setDtSumClients] = useState([])
    const [filteredArray, setFilteredArray] = useState([])


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
            let newArr = []

            const promises = dt.map(async innerObj => {


                const tmpdata = await setInvoicesDT(innerObj)

                const innerPromises = tmpdata.map(async obj => {

                    const Invoices = await loadInvoices(uidCollection, innerObj, obj.key)

                    newArr.push({ ...obj, ...innerObj, invData: Invoices, type: 'con' })

                    //Expenses
                    let expArr = [];
                    Invoices[0].forEach(obj => {
                        if (Array.isArray(obj.expenses)) {
                            expArr.push(...obj.expenses);
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
                        newArr.push({ ...obj, ...innerObj, invData: obj1, type: 'exp' })
                    });

                })
                return Promise.all(innerPromises);
            })
            await Promise.all(promises);
            //sort through "key"
            newArr = newArr.sort((a, b) => {
                return a.key - b.key;
            });

            dt = setCurFilterData(newArr)


            // totals
            setDtSumSupplers(sumSuppliers(dt))
            setDtSumClients(sumClients(dt))

            setDataTable(dt)
            setLoading(false)
        }

        loadInv()
    }, [contractsData])

    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

    useEffect(() => {

        //Client
        const invNumsArr = filteredArray.map(z => z.original.InvNum * 1)
        const filteredArrayDT = dataTable.filter(obj => invNumsArr.includes(obj.InvNum)).filter(z => z.client !== '');
        setDtSumClients(sumClients(filteredArrayDT))

        //Suppliers
        const idArr = filteredArray.map(z => z.original.id)
        let filteredArrayDTs = dataTable.filter(obj => idArr.includes(obj.id)).map(z => ({
            ...z,
            supplierName: gQ(z.supplier, 'Supplier', 'nname')
        }))
        filteredArrayDTs = filteredArrayDTs.filter(obj => filteredArray.map(z => z.original.supplier).includes(obj.supplierName))
        setDtSumSupplers(sumSuppliers(filteredArrayDTs))

    }, [filteredArray])

    const setCurFilterData = (arr) => {

        let dt = arr.map((x) => {

            const supplier = x.type === 'con' ? x.supplier : x.invData.supplier
            const supInvoices = x.type === 'con' ? x.poInvArr : x.invData.expense
            const expType = x.type === 'con' ? 'Commercial' : x.invData.expType
            const invAmount = x.type === 'con' ? x.totalAmnt : x.invData.amount
            const pmntAmount = x.type === 'con' ? x.totalPmnt : '';
            const blnc = x.type === 'con' ? x.totalBlnc : '';

            const InvNum = x.key
            let tmp = x.type === 'con' ? x.invData[0][x.invData[0].length - 1] : ''
            let dateInv = x.type === 'con' ? tmp.final ? tmp.date : tmp.dateRange.startDate : ''
            let client = x.type === 'con' ? tmp.client : ''
            const totalInvoices = x.type === 'con' ? Total(x.invData[0], 'totalAmount', x.euroToUSD, settings) : '';
            const totalPrepayment1 = x.type === 'con' ? Total(x.invData[0], 'totalPrepayment', x.euroToUSD, settings) : ''
            const prepaidPer = x.type === 'con' ? isNaN(totalPrepayment1 / totalInvoices) ? '-' : ((totalPrepayment1 / totalInvoices) * 100).toFixed(1) + '%' : ''
            const inDebt = x.type === 'con' ? totalInvoices - totalPrepayment1 : ''
            const cmnts = x.type === 'con' ? tmp.comments : ''

            const rcvd = tmp.shipData?.rcvd
            const fnlzing = tmp.shipData?.fnlzing
            const status = tmp.shipData?.status
            const etd = tmp ? tmp.shipData.etd.startDate == null || tmp.shipData.etd.startDate === '' ? '' : dateFormat(tmp.shipData?.etd.startDate, 'dd-mmm-yy') : ''
            const eta = tmp ? tmp.shipData.eta.startDate == null || tmp.shipData.eta.startDate === '' ? '' : dateFormat(tmp.shipData?.eta.startDate, 'dd-mmm-yy') : ''

            const cur = x.type === 'con' ? x.cur : x.invData.cur
            const curInvoice = x.type === 'con' ? tmp.cur : ''

            return {
                ...x,
                supplier,
                supInvoices,
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
                curInvoice
            };
        })
        return dt;
    }




    let showAmount = (x) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: x.row.original.cur,
            minimumFractionDigits: 2
        }).format(x.getValue())
    }

    let showAmountInv = (x) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: x.row.original?.curInvoice || 'USD',
            minimumFractionDigits: 2
        }).format(x.getValue())
    }

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'supplier', header: getTtl('Supplier', ln) },
        {
            accessorKey: 'supInvoices', header: getTtl('Supplier inv', ln), cell: (props) => <div>{Array.isArray(props.getValue()) ? props.getValue().map((item, index) => {
                return <div key={index}>{item}</div>
            }) : props.getValue()}</div>
        },
        { accessorKey: 'expType', header: getTtl('Invoice Type', ln), },
        {
            accessorKey: 'invAmount', header: getTtl('Invoices amount', ln), cell: (props) => <div>{showAmount(props)}</div>, meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'pmntAmount', header: getTtl('Prepayment', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmount(props)}</div>, meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'blnc', header: getTtl('Balance', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmount(props)}</div>, meta: {
                filterVariant: 'range',
            },
        },
        { accessorKey: 'InvNum', header: getTtl('Invoice', ln) + ' #', },
        {
            accessorKey: 'dateInv', header: getTtl('Date', ln), cell: (props) => <p>{props.getValue() === '' ? '' : dateFormat(props.getValue(), 'dd-mmm-yy')}</p>,
            meta: {
                filterVariant: 'dates',
            },
            filterFn: 'dateBetweenFilterFn'
        },
        {
            accessorKey: 'client', header: getTtl('Consignee', ln), meta: {
                filterVariant: 'select',
            },
        },
        {
            accessorKey: 'totalInvoices', header: getTtl('Amount', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmountInv(props)}</div>, meta: {
                filterVariant: 'range',
            },
        },
        { accessorKey: 'prepaidPer', header: getTtl('Prepaid', ln) + ' %', },
        {
            accessorKey: 'totalPrepayment1', header: getTtl('Prepaid Amount', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmountInv(props)}</div>, meta: {
                filterVariant: 'range',
            },
        },
        {
            accessorKey: 'inDebt', header: getTtl('Initial Debt', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmountInv(props)}</div>, meta: {
                filterVariant: 'range',
            },
        },
        { accessorKey: 'cmnts', header: getTtl('Comments', ln), cell: (props) => <p className='text-balance w-[200px] py-1'>{props.getValue()}</p> },

        { accessorKey: 'rcvd', header: 'Outturn', }, //false
        { accessorKey: 'fnlzing', header: getTtl('Finalizing', ln) },//false
        { accessorKey: 'status', header: getTtl('Release Status', ln), }, //false
        { accessorKey: 'etd', enableSorting: false, header: 'ETD', },//false
        { accessorKey: 'eta', enableSorting: false, header: 'ETA', },//false
    ];

    let invisible = ['rcvd', 'fnlzing', 'status', 'etd', 'eta'].reduce((acc, key) => {
        acc[key] = false
        return acc;
    }, {});


    const getFormatted = (arr) => {  //convert id's to values

        let newArr = []
        const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

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
                <div>
                    <Toast />
                    {loading && <Spin />}
                    <div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">

                        <div className='flex items-center justify-between flex-wrap'>
                            <div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Invoices Statement', ln)}</div>
                            <div className='flex'>
                                <DateRangePicker />
                            </div>
                        </div>
                        <div className='mt-5'>
                            <Customtable data={loading ? [] : getFormatted(dataTable)} columns={propDefaults} SelectRow={SelectRow}
                                ln={ln} invisible={invisible}
                                excellReport={EXD(dataTable, settings, getTtl('Invoices Statement', ln), ln,
                                    dtSumSupplers, dtSumClients)} setFilteredArray={setFilteredArray}
                            />
                        </div>

                        <div className='flex gap-2 flex-wrap xl:flex-nowrap'>
                            <SumTableSupplier dtSumSupplers={dtSumSupplers} loading={loading} settings={settings}
                                ln={ln} />
                            <SumTableClient dtSumClients={dtSumClients} loading={loading} settings={settings}
                                ln={ln} />
                        </div>

                    </div>



                    {valueCon && <MyDetailsModal isOpen={isOpenCon} setIsOpen={setIsOpenCon}
                        title={!valueCon.id ? getTtl('New Contract', ln) : `${getTtl('Contract No', ln)}: ${valueCon.order}`} />}
                </div>}
        </div>
    );
};

export default Shipments;

