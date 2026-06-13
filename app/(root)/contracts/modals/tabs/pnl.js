import React from 'react'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import { getD,  getInvoices, groupedArrayInvoice } from '@utils/utils'
import { UserAuth } from "@contexts/useAuthContext";
import PnlTables from './pnlTables';
import Switch from '@components/switch'
import TotalPnlTable from './totalPnlTable'
import TableIbvPurchs from './refPurchaseInvoices'
import { getTtl } from '@utils/languages';
import { Selector } from '@components/selectors/selectShad';


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
      const invoices = valueCon.invoices || [];
      let yrs = [...new Set(invoices.map(x => x.date.substring(0, 4)))]
      let arrTmp = [];
      for (let i = 0; i < yrs.length; i++) {
        let yr = yrs[i]
        let tmpDt = [...new Set(invoices.filter(x => x.date.substring(0, 4) === yr).map(y => y.invoice))]
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

  const handleChange = (e, name) => {
    setValCur(prev => {
      return { ...prev, [name]: e }
    })
  }

  // Per-contract freight allocation: freight-type expenses on this contract ÷ contracted MT,
  // shown in the selected currency. Same freight-label detection and currency conversion the
  // rest of this tab uses, so it lines up with the Expenses total.
  const freightIds = new Set(
    (settings.Expenses?.Expenses || [])
      .filter(e => String(e.expType || '').toLowerCase().includes('freight'))
      .map(e => e.id)
  )
  const contractMT = (valueCon.productsData || []).reduce((s, p) => s + (parseFloat(p.qnty) || 0), 0)
  const freightTotal = (valueCon.expenses || []).reduce((s, exp) => {
    if (!exp || !freightIds.has(exp.expType)) return s
    const amt = parseFloat(exp.amount)
    if (isNaN(amt)) return s
    const mltTmp = exp.cur === valCur.cur ? 1
      : exp.cur === 'us' && valCur.cur === 'eu' ? 1 / valueCon.euroToUSD
        : valueCon.euroToUSD
    return s + amt * mltTmp
  }, 0)
  const freightPerMT = contractMT > 0 ? freightTotal / contractMT : 0


  return (
    <div className='p-1'>
      <div className='grid grid-cols-12 pt-3 gap-4 '>
        <div className='col-span-3 border border-[#b8ddf8] p-2 rounded-2xl '>
          <p className='responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('selectCurr', ln)}:</p>
          <Selector arr={settings.Currency.Currency} value={valCur}
            onChange={(e) => handleChange(e, 'cur')}
            name='cur'
           />
          <div className='flex gap-2 pt-2 flex-wrap'>
            <p className='responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('purchaseValue', ln)}:</p>
            <p className='responsiveText items-center flex text-[var(--port-gore)] font-medium'>
              {setNum(valCur, TotalArrsPmnt(valueCon.poInvoices, 'pmnt', valueCon, valCur, valueCon.euroToUSD), settings)}</p>

            {/*edit ? <input className="input w-20 shadow-lg h-5 text-xs" value={newContractValue} onChange={(e) => setNewContrctValue(e.target.value)} onKeyDown={handleKeyPress} /> :
              <div className='group flex gap-1'>
                <p className='responsiveText items-center flex text-[var(--port-gore)] font-medium'>{setNum(valCur, newContractValue * mult, settings)}</p>
                <ImCancelCircle className='hidden group-hover:block cursor-pointer text-slate-600 hover:block' onClick={setNewValue} />
              </div>
  */}

          </div>
          <div className='flex gap-2 pt-2 flex-wrap'>
            <p className='responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>Freight / MT:</p>
            <p className='responsiveText items-center flex text-[var(--port-gore)] font-medium'>{setNum(valCur, freightPerMT, settings)}</p>
          </div>
        </div>
        <div className='col-span-3 border border-[#b8ddf8] p-2 rounded-2xl'>
          <div className='flex justify-between whitespace-nowrap gap-2'>
            <p className='responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('invValueSale', ln)}:</p>
            <p className='responsiveText'>{setNum(valCur, Total(pnlData, 'totalAmount', valCur, valueCon.euroToUSD, settings), settings)}</p>
          </div>
          <div className='w-full text-right h-4 -mt-2'>-</div>
          <div className='flex justify-between whitespace-nowrap gap-2'>
            <p className='responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('purchaseValue', ln)}:</p>
            <p className='responsiveText'>{setNum(valCur, TotalArrsPmnt(valueCon.poInvoices, 'pmnt', valueCon, valCur, valueCon.euroToUSD), settings)}</p>
          </div>
          <div className='w-full text-right h-4 -mt-2'>-</div>
          <div className='flex justify-between whitespace-nowrap gap-2'>
            <p className='responsiveText w-28 font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Expenses', ln)}:</p>
            <p className='responsiveText'>{setNum(valCur, TotalArrsExp(pnlData, valCur, valueCon.euroToUSD), settings)}</p>
          </div>
          <div className='pt-1.5 border-t border-slate-500'></div>
          <div className='flex justify-between whitespace-nowrap gap-2 font-medium'>
            <p className='responsiveText w-28 font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Profit', ln)}:</p>
            <p className='responsiveText'>{setNum(valCur, (Total(pnlData, 'totalAmount', valCur, valueCon.euroToUSD, settings) -
              TotalArrsPmnt(valueCon.poInvoices, 'pmnt', valueCon, valCur, valueCon.euroToUSD) - TotalArrsExp(pnlData, valCur, valueCon.euroToUSD)), settings)}</p>
          </div>
        </div>
        <div className='flex col-span-6 border border-[#b8ddf8] rounded-2xl overflow-hidden'>
          <TableIbvPurchs valueCon={valueCon} setValueCon={setValueCon} saveData_PoInvoices={saveData_PoInvoices} ln={ln} />
        </div>

        {/* Contract Status — drives the Cashflow "Unsold Stocks" tab. A contract with
            status "Unsold" (or no status set yet) is treated as unsold there. */}
        <div className='col-span-12 flex items-center gap-3 flex-wrap border border-[#b8ddf8] p-2 rounded-2xl'>
          <p className='responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem] whitespace-nowrap'>Contract Status:</p>
          <div className='w-44'>
            <Selector
              arr={conSttusArr}
              value={valueCon}
              onChange={(e) => setValueCon({ ...valueCon, conStatus: e })}
              name='conStatus'
              classes='h-7'
            />
          </div>
          <button
            type='button'
            className='blackButton h-7 px-4 rounded-lg'
            onClick={() => saveContractStatus(uidCollection)}
          >
            {getTtl('save', ln)}
          </button>
        </div>
      </div>

      <div className='flex flex-wrap mt-4 gap-2 '>
        <p className='p-2 responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{getTtl('Invoices summary', ln)}:</p>
        <TotalPnlTable data={pnlData} val={valCur} mult={valueCon.euroToUSD} />
      </div>


      <div className='flex items-center pt-4 gap-2'>
        <p className='responsiveText font-medium text-[var(--chathams-blue)] text-[0.75rem]'>{enabledSwitch ? getTtl('Hide Details', ln) : getTtl('Show Details', ln)}</p>
        <Switch enabled={enabledSwitch} setEnabled={setEnabledSwitch} />
      </div>

      {enabledSwitch && <PnlTables data={pnlData} setPnlData={setPnlData} val={valCur} mult={valueCon.euroToUSD} />}




    </div>
  )
}

export default PNL
