'use client'

import { useContext, useEffect, useState } from 'react';
import Customtable from './newTable';

import { SettingsContext } from "@contexts/useSettingsContext";
import { ContractsContext } from "@contexts/useContractsContext";
import Toast from '@components/toast.js'
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { loadStockData, filteredArray, loadAllStockData, loadDataWeightAnalysis, getInvoices, groupedArrayInvoice, sortArr } from '@utils/utils'
import Spin from '@components/spinTable';
import CBox from '@components/combobox.js'
import { EXD } from './excel'
import { getTtl } from '@utils/languages';

import { isNumber } from 'mathjs';
import DateRangePicker from '@components/dateRangePicker';

const CB = (settings, setSelectedStock, selectedStock) => {
  return (
    <CBox data={settings.Supplier.Supplier} setValue={setSelectedStock} value={selectedStock} name='supplier' classes='input border-slate-300 shadow-sm items-center flex '
      classes2='text-lg ]' dis={false} />
  )
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
  //  return groupedArrayInvoice(tmpInv)
  return tmpInv

}

const extractData = (x, type) => {

  const elements = {};
  const regex = /(\d+(\.\d+)?)(Ni|Cr|Mo)/g;
  let match;

  while ((match = regex.exec(x)) !== null) {
    const [, value, , element] = match;
    if (type === '1111') {
      elements['To' + element] = parseFloat(value);
    } else {
      elements['Back' + element] = parseFloat(value);
    }
  }
  return elements;
}

const mergeObj = (data) => {

  const merged = [];
  let i = 0; // Pointer for the 1111 type
  let j = 0; // Pointer for the 3333 type

  // Get arrays of the two types of objects
  const inv1111 = data.filter(item => item.invType === "1111");
  const inv3333 = data.filter(item => item.invType === "3333");

  // Merge corresponding pairs of inv1111 and inv3333
  while (i < inv1111.length && j < inv3333.length) {
    const mergedObject = {
      ...inv1111[i],  // Take the current 1111 object
      ...inv3333[j],  // Merge with the current 3333 object
      invType: inv1111[i].invType + "/" + inv3333[j].invType, // Merge invType
      Toqnty: inv1111[i].qnty,
      Backqnty: inv3333[j].qnty,
      cert: inv1111[i].cert
    };
    merged.push(mergedObject);
    i++;
    j++;
  }

  return merged;
}

const calc = (z) => {
  return isNaN(z) ? '' :
    isNumber(z) && z !== 0 ? z.toFixed(2) :
      isNumber(z) && z === 0 ? 0 : ''
}

const calcAverage = (arr) => {

  const groupedArray1 = arr.sort((a, b) => {
    return a.order - b.order;
  }).reduce((result, obj) => {

    const group = result.find((group) => group[0]?.order === obj.order);

    if (group) {
      group.push(obj);
    } else {
      result.push([obj]);
    }

    return result;
  }, []); // Initialize result as an empty array


  const calculateAverage = (numbers) =>
    numbers.length ? calc(numbers.reduce((acc, num) => acc + num * 1, 0) / numbers.length) : 0;

  const calculateSum = (numbers) =>
    numbers.length ? calc(numbers.reduce((acc, num) => acc + num * 1, 0)) : 0;

  const updatedArr = groupedArray1.map(group => {
    return group.length > 1 ? [...group, {
      cert: 'Average', order: group[0].order, ToNi: calculateAverage(group.map(x => x.ToNi).filter(item => item !== null && item !== undefined)),
      ToCr: calculateAverage(group.map(x => x.ToCr).filter(item => item !== null && item !== undefined)),
      ToMo: calculateAverage(group.map(x => x.ToMo).filter(item => item !== null && item !== undefined)),
      BackNi: calculateAverage(group.map(x => x.BackNi).filter(item => item !== null && item !== undefined)),
      BackCr: calculateAverage(group.map(x => x.BackCr).filter(item => item !== null && item !== undefined)),
      BackMo: calculateAverage(group.map(x => x.BackMo).filter(item => item !== null && item !== undefined)),
      Toqnty: calculateSum(group.map(x => x.Toqnty).filter(item => item !== null && item !== undefined)),
      Backqnty: calculateSum(group.map(x => x.Backqnty).filter(item => item !== null && item !== undefined)),
      date: group[0].date, invoice: '', supplier: group[0].supplier,
      diffCr: '', diffMo: '', diffNi: '', diffqnty: ''
    }
    ] : group

  });


  return updatedArr.flat();

}


const Analyss = () => {

  const { settings, setLoading, loading, ln, dateSelect } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();
  const [selectedSup, setSelectedSup] = useState({ supplier: '' })
  const [dataTable, setDataTable] = useState([])
  const [conData, setConData] = useState([])

  useEffect(() => {
    const loadtStocks = async () => {
      setLoading(true)

      let dt = await loadDataWeightAnalysis(uidCollection, 'contracts', dateSelect, 'supplier', selectedSup.supplier);
      setConData(dt)
      setLoading(false)
    }

    (dateSelect.start && dateSelect.end && selectedSup.supplier !== '') && loadtStocks()

  }, [selectedSup, dateSelect])

  useEffect(() => {

    const loadInv = async () => {
      let dt = [...conData]
      dt = await Promise.all(
        dt.map(async (x) => {
          const Invoices = await loadInvoices(uidCollection, x)

          return {
            ...x,
            invoicesData: Invoices,
          };
        })
      );

      dt = createData(dt)
      setDataTable(dt)
      setLoading(false)
    }

    conData.length > 0 && loadInv()
    if (conData.length === 0) setDataTable([])

  }, [conData])



  const createData = (arr) => {

    let newArr = []

    arr.forEach(obj => {

      let order = obj.order
      //   let supplier = obj.supplier
      let date = obj.date
      //   let cert = ''

      obj.invoicesData.forEach(z => {
        let tempObj = { invoice: z.invoice, invType: z.invType, order, date }

        z.productsDataInvoice.forEach(q => {
          let desc = q.descriptionText === '' ? obj.productsData.find(x => x.id === q.descriptionId)?.description : q.descriptionText

          tempObj = {
            ...tempObj, ...extractData(desc, z.invType), descriptionText: desc,
            qnty: q.qnty, cert: q.cert ?? ''
          }

          newArr.push(tempObj)
        });

      })
    })

    let newArr1 = []
    groupedArrayInvoice(newArr).forEach(z => {
      let tmp = mergeObj(z) //merge 1111 with 3333
      newArr1.push(tmp)
    })

    let flatArr = newArr1.flat()
    flatArr = flatArr.map(z => ({
      ...z, diffNi: calc(z.BackNi - z.ToNi),
      diffCr: calc(z.BackCr - z.ToCr), diffMo: calc(z.BackMo - z.ToMo),
      diffqnty: calc(z.Backqnty - z.Toqnty)
    }))


    return sortArr(calcAverage(flatArr), 'date')

  }


  let propDefaults = Object.keys(settings).length === 0 ? [] : [
    {
      accessorKey: 'order', header: getTtl('PO', ln) + '#',
    },
    // { accessorKey: 'supplier', header: getTtl('Supplier', ln), cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'cert', header: 'Cert', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'ToNi', header: 'Ni', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'ToCr', header: 'Cr', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'ToMo', header: 'Mo', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'Toqnty', header: 'Weight MT', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'invoice', header: ' IMS ref', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'BackNi', header: 'Ni', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'BackCr', header: 'Cr', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'BackMo', header: 'Mo', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'Backqnty', header: 'Weight MT', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'diffNi', header: 'Diff Ni', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'diffCr', header: 'Diff Cr', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'diffMo', header: 'Diff Mo', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'diffqnty', header: 'Diff Weight', cell: (props) => <p>{props.getValue()} </p> },

  ];


  const getFormatted = (arr) => {  //convert id's to values

    let newArr = []
    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

    arr.forEach(row => {
      let formattedRow = {
        ...row,
        supplier: row.supplier !== '-' ? gQ(row.supplier, 'Supplier', 'nname') : '-',
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
              <div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Weight Analysis', ln)} </div>
              <div className='flex group'>
                <DateRangePicker />
              </div>
            </div>


            <div className='mt-5'>
              <Customtable data={loading ? [] : (dataTable)} columns={propDefaults} SelectRow={() => { }}
                cb={CB(settings, setSelectedSup, selectedSup)}
                //     cb1={CB1(setSelectOpt, selectedOpt)} settings={settings}
                type='analysis'
                excellReport={EXD(dataTable, settings, getTtl('Weight Analysis', ln), ln)}
                ln={ln}
              />
            </div>


          </div>

        </>}
    </div>
  );

}

export default Analyss;