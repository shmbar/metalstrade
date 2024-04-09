'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from './newTable';
import MyDetailsModal from './whModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import Toast from '@components/toast.js'
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { loadStockData, filteredArray } from '@utils/utils'
import Spin from '@components/spinTable';
import CBox from '@components/combobox.js'
import { EXD } from './excel'
import { getTtl } from '@utils/languages';


const CB = (settings, setSelectedStock, selectedStock) => {
  return (
    <CBox data={settings.Stocks.Stocks} setValue={setSelectedStock} value={selectedStock} name='stock' classes='input border-slate-300 shadow-sm items-center flex'
      classes2='text-lg' dis={true} />
  )
}



const Stocks = () => {

  const { settings, setLoading, loading, ln } = useContext(SettingsContext);
  const { isOpenCon, setIsOpenCon } = useContext(ContractsContext);
  const { uidCollection } = UserAuth();
  const [selectedStock, setSelectedStock] = useState({ stock: '' })
  const [selectedOpt, setSelectOpt] = useState({ opt: 3 })
  const [data, setData] = useState([])

  const [item, setItem] = useState(null)

  const opts = [{ id: 1, opt: getTtl('Less than 0 MT', ln) }, { id: 2, opt: getTtl('Between 0 to 1 MT', ln) }, 
  { id: 3, opt: getTtl('Greater than 1 MT', ln) },
  { id: 4, opt: getTtl('Show all', ln) }]

  const CB1 = (selectedOpt, setSelectOpt) => {
    return (
      <CBox data={opts} setValue={selectedOpt} value={setSelectOpt} name='opt' classes='input border-slate-300 shadow-sm items-center flex'
        classes2='text-lg' />
    )
  }

  useEffect(() => {
    const loadtStocks = async () => {

      setLoading(true)
      let stockData = await loadStockData(uidCollection, 'stock', [selectedStock.stock])

      let newArr = []
      stockData = stockData.map(x => (
        {
          ...x,
          descriptionName: x.type === 'in' && x.description ?  //Contract Invoice
            x.productsData.find(y => y.id === x.description)['description'] :
            x.isSelection ? x.productsData.find(y => y.id === x.descriptionId)?.['description'] : // Invoice 
              x.type === 'out' && x.moveType === "out" ? x.descriptionName :
                x.descriptionText,
        }))


      let destcriptionArr = [...new Set(stockData.map(x => (x.description || x.descriptionId)))]

      let fieldValues = propDefaults.map(item => item.accessorKey);

      for (const key in destcriptionArr) {
        let filteredstockData = stockData.filter(x => ((x.description === destcriptionArr[key]) ||
          (x.descriptionId === destcriptionArr[key])))

        filteredstockData = filteredArray(filteredstockData) //Filter Original invoices if there is final invoice

        let totalObj = {}

        for (const x in filteredstockData) {
          let currentObj = filteredstockData[x]

          fieldValues.forEach(key => {
            if (key === 'qnty') {
              totalObj[key] = (parseFloat(totalObj[key]) || 0) +
                (currentObj.type === 'in' ? (Math.abs(parseFloat(currentObj[key])) || 0) :
                  (parseFloat(currentObj[key]) * -1 || 0));
            } else if (currentObj.type === 'in' && currentObj.description) { //referring to Contract invoices
              totalObj[key] = currentObj[key];
            }

          })
          totalObj['id'] = currentObj.id
        }

        totalObj['total'] = (totalObj.qnty * totalObj.unitPrc)
        totalObj['data'] = filteredstockData
        totalObj['cur'] = filteredstockData[0]['cur']
        totalObj['ind'] = parseFloat(key) //row number
        totalObj['qnty'] = totalObj.qnty === 0 ? totalObj.qnty : parseFloat(totalObj.qnty).toFixed(3)


        if (selectedOpt.opt === 3 && totalObj.qnty * 1 > 1) {

          newArr.push(totalObj);
        }

        if (selectedOpt.opt === 2 && (totalObj.qnty * 1 <= 1 && totalObj.qnty * 1 > 0)) {
          newArr.push(totalObj);
        }

        if (selectedOpt.opt === 1 && totalObj.qnty * 1 <= 0) {
          newArr.push(totalObj);
        }

        if (selectedOpt.opt === 4) {
          newArr.push(totalObj);
        }

      }

      //Just to prevent showing errors in the table
      for (let i = 0; i < newArr.length; i++) {
        if (!newArr[i].supplier) {
          newArr[i] = {
            ...newArr[i], supplier: '-',
            descriptionName: newArr[i]?.data[0]?.productsData[0]?.description,
            total: '-'
          }
        }
      }

      setData(newArr)
      setLoading(false)
    }

    loadtStocks()
  }, [selectedStock, selectedOpt])

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
    return Number(x.getValue()) ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: x.row.original.cur,
      minimumFractionDigits: 2
    }).format(x.getValue())
      : x.getValue()
  }

  let propDefaults = Object.keys(settings).length === 0 ? [] : [
    { accessorKey: 'order', header: getTtl('PO', ln) + '#' },
    { accessorKey: 'supplier', header: getTtl('Supplier', ln) },
    { accessorKey: 'descriptionName', header: getTtl('Description', ln), cell: (props) => <p className='w-20 md:w-64 text-wrap'>{props.getValue()}</p> },
    { accessorKey: 'qnty', header: getTtl('Weight', ln) + ' MT', cell: (props) => <p>{showWeight(props)}</p> },
    { accessorKey: 'unitPrc', header: getTtl('UnitPrice', ln), cell: (props) => <p>{showAmount(props)}</p> },
    { accessorKey: 'total', header: getTtl('Total', ln), cell: (props) => <p>{showAmount(props)}</p> },
    { accessorKey: 'stock', header: getTtl('Stock', ln) },
  ];

  let invisible = ['stock'].reduce((acc, key) => {
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
        cur: gQ(row.cur, 'Currency', 'cur'),
        stock: gQ(row.stock, 'Stocks', 'stock'),
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
              <div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Stocks', ln)} </div>
            </div>


            <div className='mt-5'>
              <Customtable data={loading ? [] : getFormatted(data)} columns={propDefaults} SelectRow={SelectRow}
                cb={CB(settings, setSelectedStock, selectedStock)}
                cb1={CB1(setSelectOpt, selectedOpt)} settings={settings}
                type='stock' invisible={invisible}
                excellReport={EXD(data, settings, getTtl('Stocks', ln), ln)} ln={ln} />
            </div>
          </div>

          {isOpenCon && <MyDetailsModal isOpen={isOpenCon} setIsOpen={setIsOpenCon} data={data} setData={setData}
            title='' item={item} setItem={setItem} />}
        </>}
    </div>
  );

}

export default Stocks;