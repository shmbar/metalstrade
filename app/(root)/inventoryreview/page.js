'use client';
import { useContext, useEffect, useState } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import MonthSelect from '@components/monthSelect';
import { loadData } from '@utils/utils'
import Customtable from '../contracts/table';
import { UserAuth } from "@contexts/useAuthContext"
import { getInvoices, getD, loadStockData } from '@utils/utils'
import SignOut from '@components/signOut';
import Spinner from '@components/spinner';
import Toast from '@components/toast.js'
import Spin from '@components/spinTable';
import MyDetailsModal from '../contracts/modals/dataModal.js'
import { ExpensesContext } from "@contexts/useExpensesContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import {EXD} from './excel'


const frm = (val) => {

    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 3
    }).format(val);
}

const setNum = (value, valueCon, settings) => {

    const qUnit = getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')

    let val = qUnit === 'KGS' ? value / 1000 :
        qUnit === 'LB' ? value / 2000 : value;

    return val;

}

const getReduced = (dt) => {
    let arr = []

    for (const obj of dt) {

        let q = dt.filter(x => x.invoice === obj.invoice)

        if (q.length === 1 || (q.length > 1 && (obj.invType !== '1111' && obj.invType !== 'Invoice'))) {
            arr = [...arr, obj];
        }
    }

    return arr;
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
    return getReduced(tmpInv)

}

const Total = (data, name, name1) => {
    let accumulatedTotalAmount = 0;

    data.forEach(innerObj => {
        innerObj[name].forEach(obj => {
            if (obj && obj[name1] !== '' && !innerObj.canceled) {
                accumulatedTotalAmount += parseFloat(obj[name1]);
            }
        });
    });

    return accumulatedTotalAmount;
}

const Inventory = () => {

    const { settings, lastAction, dateSelect, setLoading, loading, setDateYr } = useContext(SettingsContext);
    const { valueCon, setValueCon, contractsData, setContractsData, isOpen, setIsOpen } = useContext(ContractsContext);
    const { uidCollection } = UserAuth();
    const { blankInvoice, setIsInvCreationCNFL } = useContext(InvoiceContext);
    const { blankExpense } = useContext(ExpensesContext);
    const [dataTable, setDataTable] = useState([])

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { field: 'nname', header: 'Supplier', showcol: true },
        { field: 'order', header: 'PO#', showcol: true },
        { field: 'conQnty', header: 'Purchase QTY/MT', showcol: true },
        { field: 'shipped', header: 'Invoices QTY/MT', showcol: true },
        { field: 'remaining', header: 'Remaining QTY / MT', showcol: true },
        { field: 'stocks', header: 'Stocks', showcol: true },
    ];

    const SelectRow = (row) => {
        setValueCon(contractsData.find(x => x.id === row.id));
        blankInvoice();
        setDateYr(row.date.startDate.substring(0, 4));
        blankExpense();
        setIsInvCreationCNFL(false);
        setIsOpen(true);
    };

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

                    let stockData = x.stock.length > 0 ? await loadStockData(uidCollection, 'id', x.stock) : []

                    let ttl = 0
                    stockData.forEach(z => {
                        ttl += parseFloat(z.qnty)
                    })

                    let stockArr = []
                    stockData.forEach(a => {
                        stockArr.push(getD(settings.Stocks.Stocks, a, 'stock'))
                    })


                    return {
                        ...x,
                        invoicesData: Invoices,
                        stockPurchase: ttl,
                        stocks: stockArr
                    };
                })
            );
            dt = setCurFilterData(dt)
            setDataTable(dt)
            setLoading(false)
        }

        loadInv()
    }, [contractsData])

    const setCurFilterData = (arr) => {

        let dt = arr.map((x) => {

            const conQnty = setNum(x.stockPurchase, x, settings);
            const shipped = (Total(x.invoicesData, 'productsDataInvoice', 'qnty'));
            const remaining = (conQnty - shipped)
            let stcks = x.stocks.map((item, index) => {
                return <div key={index}>{item}</div>
            })


            return {
                ...x,
                nname: settings.Supplier.Supplier.find(q => q.id === x.supplier).nname,
                conQnty: frm(conQnty),
                shipped: frm(shipped),
                remaining: frm(remaining),
                stocks: stcks
            };
        })
        return dt;
    }

    return (
        <div className="lg:container mx-auto px-2 md:px-8 xl:px-10 ">
            {Object.keys(settings).length === 0 ? <Spinner /> :
                <>
                    <SignOut />
                    <Toast />
                    {loading && <Spin />}
                    <div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
                        <div className='flex items-center justify-between flex-wrap'>
                            <div className="text-3xl p-1 pb-2 text-slate-500">Inventory Review</div>
                            <MonthSelect />
                        </div>


                        <div className='mt-5'>
                            <Customtable data={loading ? [] : dataTable} propDefaults={propDefaults} SelectRow={SelectRow}
                                lastAction={lastAction} name='Inventory' 
                                excellReport={EXD(dataTable, getD, settings, 'Inventory Review')}/>
                        </div>
                    </div>

                    {valueCon && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
                        title={!valueCon.id ? 'New Contract' : `Contract No: ${valueCon.order}`} />}
                </>}
        </div>
    )
}

export default Inventory