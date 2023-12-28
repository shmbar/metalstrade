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
import { getInvoices, groupedArrayInvoice, getExpenses } from '@utils/utils'
import Spin from '@components/spinTable';
import { ContractsValue, SumAllPayments, SumAllExp } from './funcs'


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

            setDataTable(dt)
            setFilteredData(dt)
            setLoading(false)
        }

        loadInv()
    }, [contractsData])

  

    const setCurFilterData = (arr) => {

        let dt = arr.map((x) => {

            const supplier = x.type === 'con' ? x.supplier : x.invData.supplier
            const supInvoices = x.type === 'con' ? x.poInvArr.map((item, index) => {
                return <div key={index}>{item}</div>
            }) : x.invData.expense
            const expType = x.type === 'con' ? 'Commercial' : x.invData.expType
            const invAmount = x.type === 'con' ? x.totalAmnt : x.invData.amount
            const pmntAmount = x.type === 'con' ? x.totalPmnt : '';
            const blnc = x.type === 'con' ? x.totalBlnc : '';

            const InvNum = x.key
            let tmp = x.type === 'con' ? x.invData[0][x.invData[0].length - 1] : ''
            let dateInv = x.type === 'con' ? tmp.final ? tmp.date : tmp.date.startDate : ''
            let client = x.type === 'con' ? tmp.client : ''
            const totalInvoices = x.type === 'con' ? Total(x.invData[0], 'totalAmount', x.euroToUSD, settings) : '';
            const totalPrepayment1 = x.type === 'con' ? Total(x.invData[0], 'totalPrepayment', x.euroToUSD, settings) : ''
            const prepaidPer = x.type === 'con' ? isNaN(totalPrepayment1 / totalInvoices) ? '-' : ((totalPrepayment1 / totalInvoices) * 100).toFixed(1) + '%' : ''
            const inDebt = x.type === 'con' ? totalInvoices - totalPrepayment1 : ''

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

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { field: 'supplier', header: 'Supplier', showcol: true, arr: settings.Supplier.Supplier },
        { field: 'supInvoices', header: 'Supplier Invoice#', showcol: true, },
        { field: 'expType', header: 'Invoice type', showcol: true, arr: settings.Expenses.Expenses },
        { field: 'invAmount', header: 'Invoices amount', showcol: true, arr: settings.Currency.Currency },
        { field: 'pmntAmount', header: 'Prepayment', showcol: true, arr: settings.Currency.Currency },
        { field: 'blnc', header: 'Balance', showcol: true, arr: settings.Currency.Currency },
        { field: 'InvNum', header: 'Invoice #', showcol: true, },
        { field: 'dateInv', header: 'Issue date', showcol: true, },
        { field: 'client', header: 'Customer', showcol: true, arr: settings.Client.Client },
        { field: 'totalInvoices', header: 'Amount in USD', showcol: true, arr: settings.Currency.Currency },
        { field: 'prepaidPer', header: 'Prepaid %', showcol: true },
        { field: 'totalPrepayment1', header: 'Prepaid Amount', showcol: true, arr: settings.Currency.Currency },
        { field: 'inDebt', header: 'Initial Debt', showcol: true, arr: settings.Currency.Currency },
    ];



    const SelectRow = (row) => {
        setValueCon(contractsData.find(x => x.id === row.id));
        blankInvoice();
        setDateYr(row.date.startDate.substring(0, 4));
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
                            <div className="text-3xl p-1 pb-2 text-slate-500">Invoices Statement</div>
                            <MonthSelect />
                        </div>


                        <div className='mt-5'>
                            <Customtable data={loading ? [] : dataTable} propDefaults={propDefaults} SelectRow={SelectRow}
                                lastAction={lastAction} name='Invoices Statement' filteredData={filteredData} setFilteredData={setFilteredData} valCur={valCur}
                                setCurFilterData={setCurFilterData} />
                        </div>
                    </div>

                    {valueCon && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
                        title={!valueCon.id ? 'New Contract' : `Contract No: ${valueCon.order}`} />}
                </>}
        </div>
    );
};

export default Shipments;

