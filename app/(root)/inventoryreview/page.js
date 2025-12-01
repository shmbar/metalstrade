'use client';
import { useContext, useEffect, useState } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import MonthSelect from '@components/monthSelect';
import { loadData } from '@utils/utils'
import Customtable from '../contracts/newTable';
import { UserAuth } from "@contexts/useAuthContext"
import { getInvoices, getD, loadStockData } from '@utils/utils'
import Spinner from '@components/spinner';
import Toast from '@components/toast.js'
import Spin from '@components/spinTable';
import MyDetailsModal from '../contracts/modals/dataModal.js'
import { ExpensesContext } from "@contexts/useExpensesContext";
import { InvoiceContext } from "@contexts/useInvoiceContext";
import { EXD } from './excel'
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';
import Tooltip from '@components/tooltip';


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

    const { settings, dateSelect, setLoading, loading, setDateYr, ln } = useContext(SettingsContext);
    const { valueCon, setValueCon, contractsData, setContractsData, isOpenCon, setIsOpenCon } = useContext(ContractsContext);
    const { uidCollection } = UserAuth();
    const { blankInvoice, setIsInvCreationCNFL } = useContext(InvoiceContext);
    const { blankExpense } = useContext(ExpensesContext);
    const [dataTable, setDataTable] = useState([])


    let showAmount = (x) => {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 3
        }).format(x.getValue())
    }

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        {
            accessorKey: 'supplier', header: getTtl('Supplier', ln),
            meta: {
                filterVariant: 'selectSupplier',
            },
        },
        { accessorKey: 'order', header: getTtl('PO', ln) + '#' },
        { accessorKey: 'conQnty', header: getTtl('Purchase QTY', ln) + ' / MT', cell: (props) => <p>{showAmount(props)}</p> },
        { accessorKey: 'shipped', header: getTtl('Invoices', ln) + ' / MT', cell: (props) => <p>{showAmount(props)}</p> },
        { accessorKey: 'remaining', header: getTtl('Remaining QTY', ln) + ' / MT', cell: (props) => <p>{showAmount(props)}</p> },
        {
            accessorKey: 'stocks', header: getTtl('Stocks', ln), cell: (props) => <div>{props.getValue().map((item, index) => {
                return <p key={index}>{item}</p>
            })}</div>,
        },
    ];

    const SelectRow = (row) => {
        setValueCon(contractsData.find(x => x.id === row.id));
        blankInvoice();
        setDateYr(row.dateRange.startDate.substring(0, 4));
        blankExpense();
        setIsInvCreationCNFL(false);
        setIsOpenCon(true);
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
            let stcks = [...new Set(x.stocks.map(item => item))]


            return {
                ...x,
                //   nname: settings.Supplier.Supplier.find(q => q.id === x.supplier).nname,
                conQnty: conQnty,
                shipped: shipped,
                remaining: remaining,
                stocks: stcks
            };
        })
        return dt;
    }



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
        return newArr
    }


    return (
        <div className="container mx-auto px-2 md:px-8 xl:px-10 mt-16 md:mt-0">
            {Object.keys(settings).length === 0 ? <Spinner /> :
                <>
                    <Toast />
                    {loading && <Spin />}
                    <div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
                        <div className='flex items-center justify-between flex-wrap'>
                            <div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Inventory Review', ln)}</div>
                            <div className='flex group'>
                                <DateRangePicker />
                                <Tooltip txt='Select Dates Range' />
                            </div>
                        </div>


                        <div className='mt-5'>
                            <Customtable data={loading ? [] : getFormatted(dataTable)} columns={propDefaults} SelectRow={SelectRow}
                                excellReport={EXD(dataTable, settings, getTtl('Inventory Review', ln), ln)} />
                        </div>
                    </div>

                    {valueCon && <MyDetailsModal isOpen={isOpenCon} setIsOpen={setIsOpenCon}
                        title={!valueCon.id ? getTtl('New Contract', ln) : `${getTtl('Contract No', ln)}: ${valueCon.order}`} />}
                </>}
        </div>
    )
}

export default Inventory