'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import Customtable from './newTable';
import MyDetailsModal from './whModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { ContractsContext } from "../../../contexts/useContractsContext";
import Toast from '../../../components/toast.js'
import Spinner from '../../../components/spinner';
import VideoLoader from '../../../components/videoLoader';
import { UserAuth } from "../../../contexts/useAuthContext"
import { loadStockData, filteredArray, loadAllStockData } from '../../../utils/utils'
import Spin from '../../../components/spinTable';
import CBox from '../../../components/comboboxSelectStock.js'
//import CBox from '../../../components/combobox.js'
import { EXD } from './excel'
import { getTtl } from '../../../utils/languages';
import SumTable from './sumtables/sumTable'
import { isNumber } from 'mathjs';
import dateFormat from 'dateformat';


const CB = (settings, handleSelectStock, selectedStock) => {
  if (!settings?.Stocks?.Stocks) return null;

  let dt = [{ stock: '..All Stocks', id: 'allStocks', nname: '..All Stocks' },
  ...settings.Stocks.Stocks.filter(x => !x.deleted)
  ]

  return (
    //   <CBox
    //     data={[...settings.Stocks.Stocks, { stock: '..All Stocks', id: 'allStocks' }]}
    //     setValue={setSelectedStock} value={selectedStock}
    //     name='stock'
    //     classes='input border-slate-300 shadow-sm items-center flex'
    //     classes2='text-lg' dis={true} />
    // )

    < CBox
      data={dt}
      setValue={handleSelectStock}
      value={dt.find(x => x.id === selectedStock.id)}
      idx={0}
      name='nname'
      classes='input border-slate-300 shadow-sm items-center flex'
      classes2='text-lg'
      plcHolder='Select Stock'
    />
  )
}



const Stocks = () => {

  const { settings, setLoading, loading, ln } = useContext(SettingsContext);
  const { isOpenCon, setIsOpenCon } = useContext(ContractsContext);
  const { uidCollection } = UserAuth();
  const [selectedStock, setSelectedStock] = useState({ stock: 'allStocks', id: 'allStocks', nname: '..All Stocks' })
  // const [selectedOpt, setSelectOpt] = useState({ opt: 4 })
  const [data, setData] = useState([])
  const [sumData, setSumData] = useState([])

  const [filteredArray1, setFilteredArray1] = useState([])
  const [item, setItem] = useState(null)


  const handleSelectStock = (x) => {
    setSelectedStock({ ...x, stock: x.id })
  }
  // const opts = [{ id: 1, opt: getTtl('Less than 0 MT', ln) }, { id: 2, opt: getTtl('Between 0 to 1 MT', ln) },
  // { id: 3, opt: getTtl('Greater than 1 MT', ln) },
  // { id: 4, opt: getTtl('Show all', ln) }]

  // const CB1 = (selectedOpt, setSelectOpt, dis) => {
  //   return (
  //     <CBox data={opts} setValue={selectedOpt} value={setSelectOpt} name='opt' classes='input border-slate-300 shadow-sm items-center flex'
  //       classes2='text-lg' disabled={dis.dis} />
  //   )
  // }

  useEffect(() => {
    setSelectedStock({ stock: 'allStocks', id: 'allStocks', nname: '..All Stocks' })
  }, [])

  let propDefaults = [
    { accessorKey: 'order', header: getTtl('PO', ln) + '#' },
    {
      accessorKey: 'date', header: getTtl('Date', ln),
      meta: {
        filterVariant: 'dates',
      },
      filterFn: 'dateBetweenFilterFn'
    },
    {
      accessorKey: 'supplier', header: getTtl('Supplier', ln),
      meta: {
        filterVariant: 'selectSupplier',
      },
    },
    {
      accessorKey: 'originSupplier', header: 'Original supplier',
    },
    { accessorKey: 'stock', header: getTtl('warehouse', ln) },
    { accessorKey: 'descriptionName', header: getTtl('Description', ln), cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'qnty', header: getTtl('Quantity', ln), cell: (props) => <p>{showWeight(props)}</p> },
    { accessorKey: 'qTypeTable', header: getTtl('WeightType', ln), },
    { accessorKey: 'unitPrc', header: getTtl('UnitPrice', ln), cell: (props) => <p>{showAmount(props)}</p> },
    {
      accessorKey: 'total', header: getTtl('Total', ln), cell: (props) => <p>{showAmount(props)}</p>,
      meta: {
        filterVariant: 'range',

      },
    },
    {
      accessorKey: 'sType', header: getTtl('Warehouse type', ln), meta: {
        filterVariant: 'selectStockType',
        filterFn: 'equals',
      },
      filterFn: 'equals',
    },
  ];

  useEffect(() => {
    const loadtStocks = async () => {

      // Only show full-page loader on initial load (no data yet)
      if (data.length === 0) setLoading(true)
      let stockData = null;

      if (selectedStock.stock !== 'allStocks') {
        stockData = await loadStockData(uidCollection, 'stock', [selectedStock.stock])
      } else {
        stockData = await loadAllStockData(uidCollection)
      }


      let newArr = []
      stockData = stockData.map(x => (
        {
          ...x,
          descriptionName: x.type === 'in' && x.description ?  //Contract Invoice
            x.productsData.find(y => y.id === x.description)?.description :
            x.mtrlStatus === "select" || x.isSelection ? x.productsData.find(y => y.id === x.descriptionId)?.description : // Invoice
              x.type === 'out' && x.moveType === "out" ? x.descriptionName :
                x.descriptionText,
        }))


      let tempArr = stockData.filter(q => q.stock !== '').map(x => ({ stock: x.stock, description: x.description || x.descriptionId }))
      //Remove duplicates
      tempArr = Array.from(new Map(tempArr.map(item => [`${item.stock}|${item.description}`, item])).values());

      let fieldValues = propDefaults.map(item => item.accessorKey);

      for (const key in tempArr) {

        let item = tempArr[key];
        let filteredstockData = stockData.filter(x => ((x.description === item.description ||
          x.descriptionId === item.description) && x.stock === item.stock))

        filteredstockData = filteredArray(filteredstockData) //Filter Original invoices if there is final invoice

        let totalObj = {}

        for (const x in filteredstockData) {
          let currentObj = filteredstockData[x]

          fieldValues.forEach(key => {
            if (key === 'qnty') {
              totalObj[key] = (parseFloat(totalObj[key]) || 0) +
                (currentObj.type === 'in' ? (Math.abs(parseFloat(currentObj[key])) || 0) +
                  ((currentObj.finalqnty && currentObj.finalqnty * 1 !== currentObj.qnty * 1) ?
                    (currentObj.qnty * 1 - currentObj.finalqnty * 1) * -1 : 0)
                  : (parseFloat(currentObj[key]) * -1 || 0));
            } else if (currentObj.type === 'in' && currentObj.description) { //referring to Contract invoices
              totalObj[key] = currentObj[key];
            }

          })
          totalObj['id'] = currentObj.id
          totalObj['qTypeTable'] = currentObj.qTypeTable || ''
        }



        totalObj['total'] = totalObj.qnty === 0 && !filteredstockData.some(item =>
          item.hasOwnProperty("finalqnty") && item.type === "in"
        ) ? totalObj.unitPrc : parseFloat(totalObj.qnty * totalObj.unitPrc)

        totalObj['data'] = filteredstockData
        totalObj['date'] = dateFormat(filteredstockData.find(z => z.contractData)?.contractData?.date, 'dd.mm.yy')
        totalObj['cur'] = filteredstockData[0]['cur']
        totalObj['sType'] = settings?.Stocks?.Stocks?.find(x => x.id === totalObj.stock)?.sType || ''
        totalObj['ind'] = parseFloat(key) //row number
        totalObj['qnty'] = totalObj.qnty === 0 ? totalObj.qnty : parseFloat(totalObj.qnty).toFixed(3)


        //    if (selectedOpt.opt === 3 && totalObj.qnty * 1 > 1) {
        newArr.push(totalObj);
        //   }

        //   if (selectedOpt.opt === 2 && (totalObj.qnty * 1 <= 1 && totalObj.qnty * 1 > 0)) {
        //     newArr.push(totalObj);
        //   }

        //   if (selectedOpt.opt === 1 && totalObj.qnty * 1 <= 0) {
        //     newArr.push(totalObj);
        //   }

        //   if (selectedOpt.opt === 4) {
        //     newArr.push(totalObj);
        //   }

      }

      newArr = newArr.filter(x => x.qnty * 1 > 0.1)

      //Just to prevent showing errors in the table
      for (let i = 0; i < newArr.length; i++) {
        if (!newArr[i].supplier) {

          const description = Array.isArray(newArr[i]?.data?.[0]?.productsData)
            ? newArr[i].data[0].productsData[0]?.description
            : '-';

          newArr[i] = {
            ...newArr[i], supplier: '-',
            descriptionName: description ?? '-',
            total: '-'
          }
        }
      }


      setTotals(newArr)

      setData(newArr)
      setFilteredArray1(newArr)
      setLoading(false)
    }

    Object.keys(settings).length !== 0 && loadtStocks()

  }, [selectedStock, settings])

  useEffect(() => {

    //**Totals */
    const arrId = filteredArray1/*.map(z => z.original)*/.map(a => a.id)
    setTotals(data.filter(z => arrId.includes(z.id)))
  }, [filteredArray1])


  const setTotals = (newArr) => {

    let tmpArr = newArr.map(x => ({ cur: x.cur, qTypeTable: x.qTypeTable, stock: x.stock, qnty: 0, total: 0 }))
    let sumArr = Array.from(new Set(tmpArr.map(item => JSON.stringify(item)))).map(item => JSON.parse(item))

    sumArr.forEach(z => {
      let filteredGroup = newArr.filter(q => q.stock === z.stock && q.qTypeTable === z.qTypeTable && q.cur === z.cur)

      filteredGroup.forEach(item => {
        z.qnty += parseFloat(item.qnty);
        z.total += item.total === '-' ? 0 : parseFloat(item.total);
      });
    })


    setSumData(sumArr)
  }


  const SelectRow = (obj) => {
    setItem(data.find((x, i) => x.id === obj.id));
    setIsOpenCon(true);
  }


  let showWeight = (x) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 3
    }).format(x.getValue())
  }

  let showAmount = (x) => {

    return x.getValue() !== null && x.getValue() !== undefined
      ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: x.row.original.cur,
        minimumFractionDigits: 2,
      }).format(Number(x.getValue()))
      : x.getValue();
  }



  let invisible = ['date', 'originSupplier'].reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});

  const getFormatted = (arr) => {  //convert id's to values

    let newArr = []
    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

    arr.forEach(row => {
      let formattedRow = {
        ...row,
        supplier: row.supplier !== '-' ? gQ(row.supplier, 'Supplier', 'nname') : '-',
        originSupplier: gQ(row.originSupplier, 'Supplier', 'nname'),
        cur: gQ(row.cur, 'Currency', 'cur'),
        stock: gQ(row.stock, 'Stocks', 'nname'),
        qTypeTable: gQ(row.qTypeTable, 'Quantity', 'qTypeTable'),
      }

      newArr.push(formattedRow)
    })
    return newArr
  }


  const stockSelector = useMemo(() => CB(settings, handleSelectStock, selectedStock), [settings, selectedStock]);

  return (
    <div className="w-full " style={{ background: "#f8fbff" }}>
      <div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
        {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
          <>
            <Toast />
            <VideoLoader loading={loading} fullScreen={true} />
            {/* Main Card */}
            <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] shadow-xl w-full backdrop-blur-[2px] bg-[#f8fbff]">
              {/* Header Section */}
              <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                <h1 className="text-[14px] text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2" style={{ fontSize: '14px' }}>
                  {getTtl('Stocks', ln)}
                </h1>
              </div>

              {/* Table Component */}
              <div className='mt-5'>
                <Customtable
                  data={getFormatted(data)}
                  columns={propDefaults}
                  SelectRow={SelectRow}
                  cb={stockSelector}
                  type='stock'
                  invisible={invisible}
                  excellReport={EXD(
                    data.filter(x => filteredArray1.map(z => z.id).includes(x.id)),
                    settings,
                    getTtl('Stocks', ln),
                    ln,
                    sumData
                  )}
                  ln={ln}
                  setFilteredArray1={setFilteredArray1}
                />
              </div>

              {/* Totals Section */}
              <div className='flex gap-6 flex-wrap'>
                <SumTable
                  sumData={sumData}
                  loading={loading}
                  settings={settings}
                  dataTable={data}
                  ln={ln}
                />
              </div>
            </div>

            {/* Modal */}
            {isOpenCon && (
              <MyDetailsModal
                isOpen={isOpenCon}
                setIsOpen={setIsOpenCon}
                data={data}
                setData={setData}
                title=''
                item={item}
                setItem={setItem}
              />
            )}
          </>
        }
      </div>
    </div>
  );

}

export default Stocks;
