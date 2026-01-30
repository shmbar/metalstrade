'use client';
import { useContext, useEffect, useState } from 'react';
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { SettingsContext } from "@contexts/useSettingsContext";
import Toast from '@components/toast.js'
import Spin from '@components/spinTable';
import { BarChart, BarChartContracts, PieChart, HorizontalBar } from './charts';
//import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { loadData, groupedArrayInvoice, getInvoices } from '@utils/utils'
import { setMonthsInvoices, calContracts, frmNum } from './funcs'
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';


ChartJS.register(
  CategoryScale,
  ArcElement,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  // ChartDataLabels
);

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

const Dash = () => {

  const { settings, dateSelect, setLoading, loading, ln, setToast } = useContext(SettingsContext);
  const [dataInvoices, setDataInvoices] = useState([])
  const [dataContracts, setDataContracts] = useState([])
  const [dataExpenses, setDataExpenses] = useState([])
  const [dataPL, setDataPL] = useState([])
  const [dataPieSupps, setDataPieSupps] = useState([])
  const [dataPieClnts, setDataPieClnts] = useState([])
  const [dataDebt, setDataDebt] = useState([])
  const { uidCollection } = UserAuth();

  useEffect(() => {

    const Load = async () => {
      setLoading(true)

      let ddt =
        dateSelect?.start?.substring(0, 4) !== dateSelect?.end?.substring(0, 4)
          ? {
            start: `${dateSelect?.end?.substring(0, 4)}-01-01`,
            end: dateSelect?.end
          }
          : dateSelect;


      let dtContracts = await loadData(uidCollection, 'contracts', ddt);
      let dtConTmp = [...dtContracts]
      dtConTmp = await Promise.all(
        dtConTmp.map(async (x) => {
          const Invoices = await loadInvoices(uidCollection, x)
          return {
            ...x,
            invoicesData: Invoices,
          };
        })
      );

      let tmpData = calContracts(dtConTmp, settings)
      setDataContracts(tmpData.accumulatedPmnt)
      setDataExpenses(tmpData.accumulatedExp)
      setDataPieSupps(tmpData.pieArrSupps)


      //sum together the contract + expenses 
      const summedArr = Object.keys(tmpData.accumulatedPmnt).reduce((acc, key) => {
        acc[key] = tmpData.accumulatedPmnt[key] + tmpData.accumulatedExp[key];
        return acc;
      }, {});

      let arrInvoices = setMonthsInvoices(dtConTmp, settings)

      setDataInvoices(arrInvoices.accumulatedPmnt)
      setDataPieClnts(arrInvoices.pieArrClnts)
      //  setDataDebt(arrInvoices.accumulatedActualPmnt)

      //calculate P&L
      const tmpPL = Object.keys(arrInvoices.accumulatedPmnt).reduce((acc, key) => {
        acc[key] = arrInvoices.accumulatedPmnt[key] - summedArr[key];
        return acc;
      }, {});


      setDataPL(tmpPL)
      setLoading(false)
    }

    // if (dateSelect?.start?.substring(0, 4) !== dateSelect?.end?.substring(0, 4)) {
    //   setToast({ show: true, text: getTtl('DashbordDatesAlert', ln), clr: 'fail' })
    //   return
    // }

    Object.keys(settings).length !== 0 && Load();


  }, [dateSelect, settings])

  let cons = Object.keys(dataPieSupps).length
  return (
    <div className="xl:container mx-auto px-2 md:px-8 xl:px-10 pb-8 md:pb-0">
      {Object.keys(settings).length === 0 ? <Spinner /> :
        <>
          <Toast />
          {loading && <Spin />}
          <div className="p-4 mt-8">
            <div className='flex items-center justify-end flex-wrap'>
              <div className='flex'>
                <DateRangePicker />
              </div>
            </div>
          </div>

          <div className='grid grid-cols-3 justify-between gap-4 mt-2'>
            <div className='dashBox relative'>
              <div className={`${Object.values(dataPL).reduce((acc, currentValue) => acc + currentValue, 0) > 0 ? 'bg-emerald-600' : 'bg-red-600'} py-0.5 text-white text-[0.8rem] absolute -top-3 flex gap-2 px-2 rounded-md`}>
                <p>{getTtl('Profit', ln)}: </p>
                <span className='text-white font-medium'>
                  {frmNum(Object.values(dataPL).reduce((acc, currentValue) => acc + currentValue, 0) / 1000000) + 'M'}</span>
              </div>
              <div className='flex justify-center text-slate-600 font-medium pt-1'>
                {getTtl('P&L', ln)} - $M
              </div>
              <div>
                <Bar data={BarChart(dataPL, 'silver').obj} options={BarChart().options} />
              </div>
            </div>
            <div className='dashBox relative'>
              <div className='bg-emerald-600 py-0.5 text-white text-[0.8rem] absolute -top-3 flex gap-2 px-2 rounded-md'>
                <p> {getTtl('Sales', ln)}: </p>
                <p>{frmNum(Object.values(dataInvoices).reduce((acc, currentValue) => acc + currentValue, 0) / 1000000) + 'M'}</p>
              </div>
              <div className='flex justify-center text-slate-600 font-medium pt-1'>
                {getTtl('Invoices', ln)} - $M
              </div>
              <div>
                <Bar data={BarChart(dataInvoices, '#42a5f5').obj} options={BarChart().options} />
              </div>
            </div>
            <div className='dashBox relative' >
              <div className='bg-red-600 py-0.5 text-white text-[0.8rem] absolute -top-3 flex gap-2 px-2 rounded-md'>
                <p>{getTtl('Costs', ln)}: </p>
                <p>
                  {frmNum((Object.values(dataInvoices).reduce((acc, currentValue) => acc + currentValue, 0) -
                    Object.values(dataPL).reduce((acc, currentValue) => acc + currentValue, 0)) / 1000000) + 'M'}</p>
              </div>
              <div className='flex justify-center text-slate-600 font-medium pt-1'>
                {getTtl('Contracts & Expenses', ln)} - $M
              </div>
              <div>
                <Bar data={BarChartContracts(dataContracts, dataExpenses, '#9c27b0', '#ed6c02').obj} options={BarChartContracts().options} />
              </div>
            </div>
          </div>



          <div className='grid grid-cols-2 justify-between gap-4 mt-4'>
            <div className='dashBox'>
              <div className='flex justify-center text-slate-600 font-medium'>
                {'Consignees - $'}
              </div>
              <div className={cons < 10 ? 'h-[250px]' : cons > 10 && cons < 15 ? 'h-[400px]' : 'h-[500px]'}>
                <Bar data={HorizontalBar(dataPieClnts, '#42a5f5').obj} options={HorizontalBar().options} />
              </div>
            </div>
            <div className='dashBox'>
              <div className='flex justify-center text-slate-600 font-medium'>
                {'Contracts - $'}
              </div>
              <div className={cons < 10 ? 'h-[250px]' : cons > 10 && cons < 15 ? 'h-[400px]' : 'h-[500px]'}>
                <Bar data={HorizontalBar(dataPieSupps, '#9c27b0').obj} options={HorizontalBar().options} />
              </div>
            </div>
          </div>

        </>}
    </div>
  )
}

export default Dash

/*

 <p className='text-slate-600 text-[0.6rem] font-medium'>Debt Balance:</p>
                    <p className={`text-[0.6rem]
                    ${Object.values(dataInvoices).reduce((acc, currentValue) => acc + currentValue, 0) -
                        Object.values(dataDebt).reduce((acc, currentValue) => acc + currentValue, 0) > 0 ?
                        'text-red-600' : 'text-emerald-600'} font-medium
                    `}> {frmNum(Object.values(dataInvoices).reduce((acc, currentValue) => acc + currentValue, 0) -
                          Object.values(dataDebt).reduce((acc, currentValue) => acc + currentValue, 0)
                        )}</p>

                        */