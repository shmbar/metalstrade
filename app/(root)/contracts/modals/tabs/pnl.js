import React from 'react'
import { useContext, useEffect, useState } from 'react'
import CBox from '@components/combobox.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { getD, saveData, getInvoices, groupedArrayInvoice } from '@utils/utils'
//import { ImCancelCircle } from "react-icons/im";
import { UserAuth } from "@contexts/useAuthContext";
import PnlTables from './pnlTables';
import Switch from '@components/switch'
import TotalPnlTable from './totalPnlTable'
import { getCur } from '@components/exchangeApi';
import { VscSaveAs } from 'react-icons/vsc';

import TableIbvPurchs from './refPurchaseInvoices'
import { getTtl } from '@utils/languages';

const setNum = (value, contractValue, settings) => {

  const formattedNumber2 = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: value.cur !== '' ? getD(settings.Currency.Currency, value, 'cur') : 'USD',
    maximumFractionDigits: 2
  }).format(contractValue);

  return formattedNumber2;
}


const Total = (data, name, val, mult, settings) => {
  let accumulatedTotalAmount = 0;

  data.forEach(innerArray => {
    innerArray.forEach(obj => {
      if (obj && !isNaN(obj[name])) {
        const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']

        let mltTmp = currentCur === val.cur ? 1 :
          currentCur === 'us' && val.cur === 'eu' ? 1 / mult : mult

        let num = obj.canceled ? 0 : obj[name] * 1 * mltTmp
        accumulatedTotalAmount += innerArray.length === 1 ? num :
          obj.invType !== '1111' ? num : 0;
      }
    });
  });

  return accumulatedTotalAmount;
}

const TotalArrsPmnt = (data, name, valCon, val, mult) => {
  let accumulatedPmnt = 0;

  data.forEach(obj => {
    let mltTmp = valCon.cur === val.cur ? 1 :
      valCon.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult
    if (obj && !isNaN(parseFloat(obj[name]))) {
      accumulatedPmnt += parseFloat(obj[name] * 1 * mltTmp);
    }


  });


  return accumulatedPmnt;
}

const TotalArrsExp = (data, val, mult) => {
  let accumulatedExp = 0;

  data.forEach(innerArray => {
    innerArray.forEach(obj => {
      if (obj && Array.isArray(obj.expenses)) {
        obj.expenses.forEach(exp => {

          let mltTmp = exp.cur === val.cur ? 1 :
            exp.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

          if (exp && !isNaN(parseFloat(exp.amount))) {
            accumulatedExp += parseFloat(exp.amount * 1 * mltTmp);
          }
        });
      }
    });
  });

  return accumulatedExp;
}

const PNL = () => {

  const { settings, ln } = useContext(SettingsContext);
  const { valueCon, setValueCon, contractsData, setContractsData, saveContractStatus,
    saveData_PoInvoices } = useContext(ContractsContext);

  const { uidCollection } = UserAuth();
  const [pnlData, setPnlData] = useState([])
  const [enabledSwitch, setEnabledSwitch] = useState(false)

  const [valCur, setValCur] = useState({ cur: valueCon.cur })


  useEffect(() => {

    const loadInvoices = async () => {
      let yrs = [...new Set(valueCon.invoices.map(x => x.date.substring(0, 4)))]
      let arrTmp = [];
      for (let i = 0; i < yrs.length; i++) {
        let yr = yrs[i]
        let tmpDt = [...new Set(valueCon.invoices.filter(x => x.date.substring(0, 4) === yr).map(y => y.invoice))]
        let obj = { yr: yr, arrInv: tmpDt }
        arrTmp.push(obj)
      }

      let tmpInv = await getInvoices(uidCollection, 'invoices', arrTmp)
      let dt = groupedArrayInvoice(tmpInv)
      setPnlData(dt)
    }
    loadInvoices()
  }, [])

  /*
    const setNewValue = () => {
      setedit(true)
    }
    
      const handleKeyPress = async (e) => {
        if (e.key === 'Enter') {
          setedit(false)
          let newObj = { ...valueCon, newContractValue: newContractValue }
          setValueCon(newObj)
    
          const tmpArr = contractsData.map((k) => (k.id === valueCon.id ? newObj : k));
          setContractsData(tmpArr)
          await saveData(uidCollection, 'contracts', newObj)
        }
      }
    */
  const conSttusArr = [{ id: 'A1234', conStatus: 'Shipped' },
  { id: 'B5678', conStatus: 'Not Shipped' },
  { id: 'F7546', conStatus: 'Partly Shipped' },
  { id: 'C6567', conStatus: 'Finished' },
  { id: 'D8456', conStatus: 'Closed' },
  { id: 'E34656', conStatus: 'Unsold' }]


  return (
    <div className='p-1'>
      <div className='grid grid-cols-12 pt-3 gap-4 '>
        <div className='col-span-12 md:col-span-3 border border-slate-300 p-2 rounded-lg '>
          <p className='text-[0.8rem]'>{getTtl('selectCurr', ln)}:</p>
          <CBox data={settings.Currency.Currency} setValue={setValCur} value={valCur} name='cur' classes='shadow-md -mt-1' dis={true} />
          <div className='flex gap-2 pt-2 flex-wrap'>
            <p className='text-[0.8rem]'>{getTtl('purchaseValue', ln)}:</p>
            <p className='text-[0.8rem] items-center flex text-slate-800 font-medium'>
              {setNum(valCur, TotalArrsPmnt(valueCon.poInvoices, 'pmnt', valueCon, valCur, valueCon.euroToUSD), settings)}</p>

            {/*edit ? <input className="input w-20 text-[15px] shadow-lg h-5 text-xs" value={newContractValue} onChange={(e) => setNewContrctValue(e.target.value)} onKeyDown={handleKeyPress} /> :
              <div className='group flex gap-1'>
                <p className='text-[0.8rem] items-center flex text-slate-800 font-medium'>{setNum(valCur, newContractValue * mult, settings)}</p>
                <ImCancelCircle className='hidden group-hover:block cursor-pointer text-slate-600 hover:block' onClick={setNewValue} />
              </div>
  */}

          </div>
        </div>
        <div className='col-span-12 md:col-span-3 border border-slate-300 p-2 rounded-lg'>
          <div className='flex justify-between'>
            <p className='text-[0.8rem]'>{getTtl('invValueSale', ln)}:</p>
            <p className='text-[0.8rem]'>{setNum(valCur, Total(pnlData, 'totalAmount', valCur, valueCon.euroToUSD, settings), settings)}</p>
          </div>
          <div className='w-full text-right h-4 -mt-2'>-</div>
          <div className='flex justify-between'>
            <p className='text-[0.8rem] w-full'>{getTtl('purchaseValue', ln)}:</p>
            <p className='text-[0.8rem]'>{setNum(valCur, TotalArrsPmnt(valueCon.poInvoices, 'pmnt', valueCon, valCur, valueCon.euroToUSD), settings)}</p>
          </div>
          <div className='w-full text-right h-4 -mt-2'>-</div>
          <div className='flex justify-between'>
            <p className='text-[0.8rem] w-28'>{getTtl('Expenses', ln)}:</p>
            <p className='text-[0.8rem]'>{setNum(valCur, TotalArrsExp(pnlData, valCur, valueCon.euroToUSD), settings)}</p>
          </div>
          <div className='pt-1.5 border-t border-slate-500'></div>
          <div className='flex justify-between font-bold'>
            <p className='text-[0.8rem] w-28'>{getTtl('Profit', ln)}:</p>
            <p className='text-[0.8rem]'>{setNum(valCur, (Total(pnlData, 'totalAmount', valCur, valueCon.euroToUSD, settings) -
              TotalArrsPmnt(valueCon.poInvoices, 'pmnt', valueCon, valCur, valueCon.euroToUSD) - TotalArrsExp(pnlData, valCur, valueCon.euroToUSD)), settings)}</p>
          </div>
        </div>
        {/*
        <div className='col-span-12 md:col-span-2 border border-slate-300 p-2 rounded-lg'>
          <p className='text-[0.8rem]'>Contract Status:</p>
          <CBox data={conSttusArr} setValue={setValueCon} value={valueCon} name='conStatus' classes='shadow-md -mt-1' dis={true} />
          <button className='mt-2 py-0.5 bg-slate-100  px-2 border border-slate-400 shadow-md rounded-lg text-slate-700
                    flex items-center gap-1'
            onClick={() => saveContractStatus(uidCollection)}
          >
            <VscSaveAs className='text-slate-700' />
            <p className='text-sm'>Save</p></button>
        </div>
          */}
        <div className='col-span-12 hidden md:flex md:col-span-4'>
          <TableIbvPurchs valueCon={valueCon} setValueCon={setValueCon} saveData_PoInvoices={saveData_PoInvoices} ln={ln} />
        </div>
      </div>

      <div className='block md:flex flex-wrap mt-4 gap-2 '>
        <p className='p-2'>{getTtl('Invoices summary', ln)}:</p>
        <TotalPnlTable data={pnlData} val={valCur} mult={valueCon.euroToUSD} />
      </div>


      <div className='flex items-center pt-4 gap-2'>
        <p className='text-xs'>{enabledSwitch ? getTtl('Hide Details', ln) : getTtl('Show Details', ln)}</p>
        <Switch enabled={enabledSwitch} setEnabled={setEnabledSwitch} />
      </div>

      {enabledSwitch && <PnlTables data={pnlData} setPnlData={setPnlData} val={valCur} mult={valueCon.euroToUSD} />}




    </div>
  )
}

export default PNL
