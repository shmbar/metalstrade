'use client';
import { useContext, useEffect, useState } from 'react';
import Customtable from './table';
import MyDetailsModal from './whModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import Toast from '@components/toast.js'
import SignOut from '@components/signOut';
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { loadStockData, filteredArray } from '@utils/utils'
import Spin from '@components/spinTable';
import CBox from '@components/combobox.js'
import {EXD} from './excel'


const CB = (settings, setSelectedStock, selectedStock) => {
  return (
    <CBox data={settings.Stocks.Stocks} setValue={setSelectedStock} value={selectedStock} name='stock' classes='-mt-1 input border-slate-300 shadow-sm items-center flex'
      classes2='text-lg' dis={true} />
  )
}

const opts = [{ id: 1, opt: 'Less than 0 MT' }, { id: 2, opt: 'Between 0 to 1 MT' }, { id: 3, opt: 'Greater than 1 MT' },
{ id: 4, opt: 'Show all' }]
const CB1 = (selectedOpt, setSelectOpt) => {
  return (
    <CBox data={opts} setValue={selectedOpt} value={setSelectOpt} name='opt' classes='-mt-1 input border-slate-300 shadow-sm items-center flex'
      classes2='text-lg' />
  )
}

const Stocks = () => {

  const { settings, lastAction, dateSelect, setLoading, loading } = useContext(SettingsContext);
  const { isOpen, setIsOpen } = useContext(ContractsContext);
  const { uidCollection } = UserAuth();
  const [filteredData, setFilteredData] = useState([]);
  const [selectedStock, setSelectedStock] = useState({ stock: '' })
  const [selectedOpt, setSelectOpt] = useState({ opt: 3 })
  const [data, setData] = useState([])

  const [item, setItem] = useState(null)

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
    
      let fieldValues = propDefaults.map(item => item.field);
     
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

      setData(newArr)
      setFilteredData(newArr)
      setLoading(false)
    }

    loadtStocks()
  }, [selectedStock, selectedOpt])

  const SelectRow = (obj) => {
    setItem(data.find((x, i) => x.id === obj.id));
    setIsOpen(true);
  }


  let propDefaults = Object.keys(settings).length === 0 ? [] : [
    { field: 'order', header: 'PO#', showcol: true },
    { field: 'supplier', header: 'Supplier', showcol: true, arr: settings.Supplier.Supplier },
    { field: 'descriptionName', header: 'Description', showcol: true },
    { field: 'qnty', header: 'Weight MT', showcol: true },
    { field: 'unitPrc', header: 'Price', showcol: true, arr: settings.Currency.Currency },
    { field: 'total', header: 'Final Value', showcol: true, arr: settings.Currency.Currency },
    { field: 'stock', header: 'Stock', showcol: false, arr: settings.Stocks.Stocks },

  ];

  return (

    <div className="lg:container mx-auto px-2 md:px-8 xl:px-10 ">
      {Object.keys(settings).length === 0 ? <Spinner /> :
        <>
          <SignOut />
          <Toast />
          {loading && <Spin />}
          <div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
            <div className='flex items-center justify-between flex-wrap'>
              <div className="text-3xl p-1 pb-2 text-slate-500">Stocks</div>
            </div>


            <div className='mt-5'>
              <Customtable data={loading ? [] : data} propDefaults={propDefaults} SelectRow={SelectRow}
                lastAction={lastAction} name='Stock' cb={CB(settings, setSelectedStock, selectedStock)}
                cb1={CB1(setSelectOpt, selectedOpt)} settings={settings}
                filteredData={filteredData} setFilteredData={setFilteredData}
                type='stock' 
                excellReport={EXD(data, settings, 'Stock')}/>
            </div>
          </div>

          {isOpen && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen} data={data} setData={setData}
            title='' item={item} setItem={setItem} />}
        </>}
    </div>
  );

}

export default Stocks;