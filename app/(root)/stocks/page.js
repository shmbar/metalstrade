'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import Customtable from './newTable';
import CollapsibleSection, { useSectionOpen, SectionFigure, FIT_BELOW_FOLDED } from '../../../components/CollapsibleSection';
import SharedStock from './SharedStock';
import KpiStrip from '../../../components/KpiStrip';
import { NameCell } from '../../../components/Avatar';
import { oneOf } from '../../../components/table/filters/oneOfFilter';
import { Boxes, Warehouse, Factory, Layers } from 'lucide-react';
import MyDetailsModal from './whModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import Toast from '../../../components/toast.js'
import Spinner from '../../../components/spinner';
import VideoLoader from '../../../components/videoLoader';
import { TableSkeleton } from "../../../components/skeletons";
import { UserAuth } from "../../../contexts/useAuthContext"
import { isTradingAccount } from '@utils/activeAccount'
import { loadStockData, filteredArray, loadAllStockData } from '../../../utils/utils'
import { settledInQty, settlementReduction, toMT } from '../../../utils/finance'
import { effectiveUnitPrice } from '../../../utils/lotPrice'
import { Selector } from '../../../components/selectors/selectShad.js'
import { EXD } from './excel'
import { getTtl } from '../../../utils/languages';
import SumTable from './sumtables/sumTable'
import GradeTable from './sumtables/gradeTable'
import { groupByGrade } from './byGrade'
import ChemistryPopover from '../../../components/ChemistryPopover'
import { parseSpecQuery, assayMatches, assayOf, describeSpec } from '../../../utils/grades'
import StorageAging from './storageAging'
import { rowSpecs, specLabel, specText } from './specs'
import { lineOfRow } from './rowLine'
import StockAudit from './stockAudit'
import { BtnIcon, SearchAdornment } from '../../../components/buttonIcons'
import { isNumber } from 'mathjs';
import dateFormat from 'dateformat';


const CB = (settings, handleSelectStock, selectedStock) => {
  if (!settings?.Stocks?.Stocks) return null;

  let dt = [{ stock: '..All Stocks', id: 'allStocks', nname: '..All Stocks' },
  ...settings.Stocks.Stocks.filter(x => !x.deleted)
  ]

  return (
    <div className='w-full sm:w-44'>
      <Selector
        /* Toolbar, not a form: the caption rung and the same ink as the Search and
           Quick Sum pills beside it. sizeVar also reaches the open panel, so the
           list and its search box stop being a rung larger than the trigger. */
        sizeVar='var(--fs-caption)'
        arr={dt}
        value={selectedStock}
        onChange={(e) => handleSelectStock(dt.find(x => x.id === e))}
        name='stock'
        secondaryName='nname'
        classes='w-full font-medium data-[placeholder]:text-[var(--chathams-blue)]'
      />
    </div>
  )
}



/* The description, with the chemistry behind it one click away. A grade row (By grade)
   carries its lines in _all; a line row carries its lots in data. */
const DescriptionCell = ({ row, value }) => {
  const lines = row?._all || [row]
  const lots = lines.flatMap(l => l?.data || []).filter(l => l && l.type === 'in')
  return (
    <span className='inline-flex items-center gap-1 min-w-0 max-w-full'>
      <span className='truncate'>{value}</span>
      <ChemistryPopover lots={lots} description={value} />
    </span>
  )
}

/* Spec — what the lots in a row actually are (a typed spec, else their chemistry), and
   how much of each is left when a line holds more than one. Estimated shares (part of
   the line sold, lot unknown) carry a ≈. */
const SpecCell = ({ row }) => {
  const { settings } = useContext(SettingsContext)
  const parts = rowSpecs(row)
  const unit = row?.qTypeTable || 'MT'
  const fmtQ = (q) => (Number(q) || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const named = parts.map(p => ({ ...p, text: specLabel(p, settings) }))
  // Nothing to show: the table renders an empty value as a blank cell before this is
  // ever called (newTable.js), like every other empty column.
  if (!named.some(p => p.text)) return null
  if (named.length === 1) {
    const p = named[0]
    return (
      <span className={`block truncate max-w-[240px] mx-auto ${p.source === 'description' ? 'text-[var(--ink-secondary)]' : 'font-medium text-[var(--ink)]'}`} title={p.text}>
        {p.text}
      </span>
    )
  }
  const line = (p) => `${p.text || p.label} ${p.estimated ? '≈' : ''}${fmtQ(p.qnty)}`
  return (
    // Capped: several specs would otherwise widen the column and squeeze the figures;
    // the full list, with every share, is in the tooltip.
    <span className='block truncate max-w-[240px] mx-auto' title={named.map(p => `${line(p)} ${unit}`).join('\n')}>
      {named.slice(0, 2).map(line).join(' · ')}
      {named.length > 2 && <span className='text-[var(--ink-muted)]'> +{named.length - 2}</span>}
    </span>
  )
}

const Stocks = () => {

  const { settings, setLoading, loading, ln } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();
  const [selectedStock, setSelectedStock] = useState({ stock: 'allStocks', id: 'allStocks', nname: '..All Stocks' })
  const [activeTab, setActiveTab] = useState('mine') // 'mine' = this account's stock, 'shared' = IMS+GIS shared pool
  // The shared pool is IMS / GIS only (utils/activeAccount isTradingAccount).
  const trading = isTradingAccount(uidCollection)
  // const [selectedOpt, setSelectOpt] = useState({ opt: 4 })
  const [data, setData] = useState([])
  const [sumData, setSumData] = useState([])
  // The two summary cards under the table: folded on a short laptop screen, open
  // elsewhere, and whatever the user last chose after that (CollapsibleSection).
  const [summaryOpen, toggleSummary] = useSectionOpen('summary')

  const [filteredArray1, setFilteredArray1] = useState([])
  const [item, setItem] = useState(null)
  /* The row window's own switch. It used to borrow the contract window's (isOpenCon in
     ContractsContext), which every page shares and which outlives a page: the window's
     Contract button turns it on for /contracts, and coming Back here with it still on
     drew this window with no row in it — "Application error" (client, 2026-10-05). */
  const [rowOpen, setRowOpen] = useState(false)
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [rawStockData, setRawStockData] = useState([])
  const [auditOpen, setAuditOpen] = useState(false)
  // false = one row per stock line, true = one row per grade (see byGrade.js).
  const [combine, setCombine] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0) // bumped after audit write-offs to re-pull stock
  // Find by spec — "Ni 28-33 Cr 15-20 Ti>0". Narrows the whole page (table, summary, grade
  // card, export) to lines holding a lot whose chemistry fits, whatever it was called.
  const [specQuery, setSpecQuery] = useState('')


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

  // Memoized: cells read nothing stateful beyond ln (headers); showWeight/showAmount
  // format row values only. Stable identity avoids TanStack model rebuilds per render.
  const propDefaults = useMemo(() => [
    { accessorKey: 'order', header: getTtl('PO', ln) + '#' },
    {
      accessorKey: 'date', header: getTtl('Date', ln),
      meta: {
        filterVariant: 'dates',
        excludeFromQuickSum: true,
      },
      filterFn: 'dateBetweenFilterFn',
      // By the real date, not the dd.mm.yy text the cell shows.
      sortingFn: (a, b) => (a.original._ts || 0) - (b.original._ts || 0),
    },
    /* Supplier, original supplier and warehouse all filter as a checklist: the
       client's "I can't search two stocks or two suppliers together". */
    {
      accessorKey: 'supplier', header: getTtl('Supplier', ln),
      cell: (props) => <NameCell name={props.getValue()} />,
      meta: {
        filterVariant: 'selectSupplier',
      },
      filterFn: oneOf,
    },
    {
      accessorKey: 'originSupplier', header: 'Original supplier',
      cell: (props) => <NameCell name={props.getValue()} />,
      meta: { filterVariant: 'multi' },
      filterFn: oneOf,
    },
    {
      accessorKey: 'stock', header: getTtl('warehouse', ln),
      cell: (props) => <NameCell name={props.getValue()} />,
      meta: { filterVariant: 'selectStock' },
      filterFn: oneOf,
    },
    { accessorKey: 'descriptionName', header: getTtl('Description', ln), cell: (props) => <DescriptionCell row={props.row.original} value={props.getValue()} /> },
    /* The search box looks for names, POs and grades — not digits inside a money
       figure. It was matching every column, so typing "202" for 202 Turnings also
       returned IN 600 Chips, because its total is $39,202.84. The three figure
       columns opt out; they keep their own column filters (the range filter on
       Total is untouched). */
    { accessorKey: 'qnty', header: getTtl('Quantity', ln), cell: (props) => <p>{showWeight(props)}</p>, enableGlobalFilter: false },
    // MT / KGS / LB — the widest value is three characters, so the column takes
    // only what its header needs and leaves the rest to Description.
    { accessorKey: 'qTypeTable', header: getTtl('WeightType', ln), meta: { narrow: true } },
    { accessorKey: 'unitPrc', header: getTtl('UnitPrice', ln), cell: (props) => <p>{showAmount(props)}</p>, enableGlobalFilter: false },
    {
      accessorKey: 'total', header: getTtl('Total', ln), cell: (props) => <p>{showAmount(props)}</p>,
      enableGlobalFilter: false,
      meta: {
        filterVariant: 'range',

      },
    },
    {
      accessorKey: 'sType', header: getTtl('Warehouse type', ln), meta: {
        filterVariant: 'selectStockType',
      },
      filterFn: oneOf,
    },
  ], [ln]);

  /* The Spec column is added HERE, not in propDefaults: that list also drives
     loadtStocks' aggregation (its accessor keys are the fields it sums) and is pinned
     by the mobile parity suite. This column only reads what a row already carries.
     The search box reads it too — "CHP", "UMZ", "43Ni" are words on the screen, and
     every word on the screen is searchable (client, 2026-09-29) — and so does mobile's
     (display.ts inventoryFilterValues), so the two still find the same rows. */
  const tableColumns = useMemo(() => {
    const specColumn = {
      accessorKey: 'spec', header: 'Spec',
      accessorFn: (row) => specText(row, settings),
      cell: (props) => <SpecCell row={props.row.original} />,
    }
    const at = propDefaults.findIndex(c => c.accessorKey === 'descriptionName')
    return [...propDefaults.slice(0, at + 1), specColumn, ...propDefaults.slice(at + 1)]
  }, [propDefaults, settings]);

  useEffect(() => {
    const loadtStocks = async () => {

      setIsLoadingStock(true)
      let stockData = null;

      if (selectedStock.stock !== 'allStocks') {
        stockData = await loadStockData(uidCollection, 'stock', [selectedStock.stock])
      } else {
        stockData = await loadAllStockData(uidCollection)
      }

      setRawStockData(stockData || [])

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
                (currentObj.type === 'in'
                  ? settledInQty(currentObj)
                  : (parseFloat(currentObj[key]) * -1 || 0));
            } else if (currentObj.type === 'in' && currentObj.description && parseFloat(currentObj.qnty) > 0) { //referring to Contract invoices; skip 0-qnty balancing rows so their invoice-total doesn't overwrite the real unit price
              totalObj[key] = currentObj[key];
            }

          })
          totalObj['id'] = currentObj.id
          // The row's unit is its purchase's: a sale or a move books its out-lot with no
          // unit, so the last lot's made a kg line read as tonnes once any of it had left.
          if (!totalObj['qTypeTable'] || (currentObj.type === 'in' && currentObj.qTypeTable)) totalObj['qTypeTable'] = currentObj.qTypeTable || ''
        }
        // The settlement's own correction row carries no quantity, so the loop above
        // cannot see it: a settlement that weighed the delivery light is a line-level
        // reduction (utils/finance settlementReduction).
        totalObj['qnty'] = (parseFloat(totalObj['qnty']) || 0) + settlementReduction(filteredstockData)

        // A lot priced per element content is worth its content's share of the price
        // (utils/lotPrice.js): Hf Ni VAR is $3,950 per kg of Hf at 89.06% Hf. The price
        // shown and multiplied is per unit of material, so price × quantity is still the total.
        // `priced` is the lot whose price the loop above kept — the last in-lot with a quantity.
        const priced = [...filteredstockData].reverse().find(x => x.type === 'in' && x.description && parseFloat(x.qnty) > 0)
        if (priced?.priceOn) totalObj['unitPrc'] = effectiveUnitPrice(priced, totalObj.unitPrc)

        totalObj['total'] = totalObj.qnty === 0 && !filteredstockData.some(item =>
          item.hasOwnProperty("finalqnty") && item.type === "in"
        ) ? totalObj.unitPrc : parseFloat(totalObj.qnty * totalObj.unitPrc)

        totalObj['data'] = filteredstockData
        // `date` is a DISPLAY string (dd.mm.yy) and cannot be sorted — as text it puts
        // the 1st of April before the 4th of February. `_ts` is the same contract date as
        // a number, for the default order below and the Date column's own sort.
        const contractDate = filteredstockData.find(z => z.contractData)?.contractData?.date
        totalObj['date'] = dateFormat(contractDate, 'dd.mm.yy')
        totalObj['_ts'] = contractDate ? (new Date(contractDate).getTime() || 0) : 0
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


      // Newest contract first, PO number breaking ties — the order Cashflow's stock
      // tables use (funcs.js byNewestThenPO). With no order of its own, the page listed
      // lines as Firestore returned them, i.e. by random document id (client,
      // 2026-09-23: "on cashflow it has autosorting, but on stock page no"). Clicking a
      // column header still sorts by that column.
      newArr.sort((a, b) => (b._ts || 0) - (a._ts || 0)
        || String(a.order ?? '').localeCompare(String(b.order ?? ''), undefined, { numeric: true }))

      setTotals(newArr)

      setData(newArr)
      setFilteredArray1(newArr)
      setIsLoadingStock(false)
    }

    if (!uidCollection) return;
    Object.keys(settings).length !== 0 && loadtStocks()

  }, [selectedStock, settings, uidCollection, refreshTick])

  /* What the table is currently showing, as RAW line ids. In Lines mode a row is a
     line and this is its own id; in By grade mode a row is a fold and this expands to
     the lines under it. */
  const filteredLineIds = useMemo(
    () => new Set(filteredArray1.flatMap(r => r._lineIds ?? [r.id])),
    [filteredArray1]
  );

  useEffect(() => {

    //**Totals */
    setTotals(data.filter(z => filteredLineIds.has(z.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLineIds])


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


  // A row's window is its stock line's; a grade folding several lines has none (rowLine.js).
  const SelectRow = (obj) => {
    const line = lineOfRow(obj, data);
    if (!line) return;
    setItem(line);
    setRowOpen(true);
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

  // Stable table data — getFormatted only reads `settings` (covered by deps).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spec = useMemo(() => parseSpecQuery(specQuery), [specQuery]);
  const specData = useMemo(() => !spec ? data : data.filter(row =>
    (row.data || []).some(l => l && l.type === 'in' && assayMatches(assayOf(l, row.descriptionName).assay, spec))),
    [data, spec]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tableData = useMemo(() => getFormatted(specData), [specData, settings]);

  // Rows currently visible after the table's filters (supplier, item, warehouse, etc.).
  // Used for both the "Avg Cost Price per Grade" table and the Excel export so they
  // follow whatever the user filters on.
  const filteredData = useMemo(
    () => data.filter(x => filteredLineIds.has(x.id)),
    [data, filteredLineIds]
  );

  // What a spec search found, read back beside the box.
  const specSummary = useMemo(() => {
    if (!spec) return '';
    // MT: each line from its PO's unit (kg, lb) — they are added together below.
    const q = filteredData.reduce((s, r) => s + toMT(parseFloat(r.qnty) || 0, r, settings), 0);
    const v = filteredData.reduce((s, r) => s + (r.total === '-' ? 0 : parseFloat(r.total) || 0), 0);
    const oneCur = new Set(filteredData.map(r => r.cur)).size === 1;
    const n = filteredData.length;
    return `${n} line${n === 1 ? '' : 's'} · ${q.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} MT`
      + (oneCur && q > 0 ? ` · avg ${Math.round(v / q).toLocaleString('en-US')}/MT` : '');
  }, [spec, filteredData, settings]);

  /* What the Data sheet exports when the table is combined. Built from the FILTERED
     lines, so the sheet is the screen: filter to one supplier, combine, export, and
     the file is that supplier's position by grade. `_pre` tells the exporter these
     rows already hold display names rather than ids — a group spans suppliers, so
     there is no single id left to look up.
     eslint-disable-next-line react-hooks/exhaustive-deps */
  const combinedForExport = useMemo(
    () => groupByGrade(getFormatted(filteredData)).map(r => ({ ...r, _pre: true })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredData, settings]
  );

  return (
    <div className="w-full " style={{ background: "var(--bg-page)" }}>
      <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
        {Object.keys(settings).length === 0 ? <TableSkeleton /> :
          <>
            <Toast />
            <VideoLoader loading={loading} fullScreen={true} />
            {/* Warehouse fetches used the old bare gray spinner (Spin) — use the same
                light overlay as every other loading state. */}
            <VideoLoader loading={isLoadingStock} fullScreen={true} />
            {/* Page header */}
            <div className="page-header flex items-end justify-between flex-wrap gap-2 mt-6 mb-3 px-1">
              <div>
                <h1 className="text-display">{getTtl('Stocks', ln)}</h1>
                <p className="responsiveTextInput text-[var(--ink-muted)] mt-0.5">Inventory across warehouses</p>
              </div>
              <button
                type="button"
                onClick={() => setAuditOpen(true)}
                className="whiteButton whitespace-nowrap"
                title="Stock Audit"
              >
                <BtnIcon action="audit" />Stock Audit
              </button>
            </div>

            {/* KPI strip */}
            <KpiStrip items={[
              { label: 'Stock lines', value: data.length, icon: Boxes, tone: 'blue' },
              { label: 'Warehouses', value: new Set(data.map(x => x.stock).filter(Boolean)).size, icon: Warehouse, tone: 'gray' },
              { label: 'Suppliers', value: new Set(data.map(x => x.supplier).filter(Boolean)).size, icon: Factory, tone: 'green' },
              { label: 'Descriptions', value: new Set(data.map(x => x.descriptionName).filter(Boolean)).size, icon: Layers, tone: 'amber' },
            ]} />

            {/* Main Card */}
            <div className="page-card rounded-2xl p-3 sm:p-5 border border-[var(--line)] shadow-card w-full bg-[var(--bg-card)]">

              {/* Tabs: this account's stock vs the IMS+GIS shared pool */}
              <div className='mt-3 flex flex-wrap items-start gap-y-2'>
                <div className='seg-switch'>
                  {[['mine', 'My Stock'], ...(trading ? [['shared', 'Shared (IMS + GIS)']] : [])].map(([key, label]) => (
                    <button key={key} type='button' onClick={() => setActiveTab(key)} aria-pressed={activeTab === key}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Lines vs grades. Sits with the tabs because it changes what a
                    row MEANS, which is the same class of switch. */}
                {activeTab === 'mine' && (
                  <div className='seg-switch ml-3'>
                    {[[false, 'Lines'], [true, 'By grade']].map(([val, label]) => (
                      <button key={label} type='button' onClick={() => setCombine(val)} aria-pressed={combine === val}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Find by spec. Chemistry, not names: every lot whose assay fits, whatever
                    it was ever called — the way to reach material that never had a good name. */}
                {activeTab === 'mine' && (
                  <div className='ml-auto flex flex-col items-end gap-0.5'>
                    <div className='relative w-64 max-w-full'>
                      <input value={specQuery} onChange={e => setSpecQuery(e.target.value)}
                        placeholder='Find by spec · Ni 28-33 Cr 15-20 Ti>0'
                        aria-label='Find by chemistry'
                        className='input w-full h-8 pr-8' />
                      <SearchAdornment value={specQuery} onClear={() => setSpecQuery('')} />
                    </div>
                    {specQuery.trim() && (
                      <span className='responsiveTextTable text-[var(--ink-muted)] whitespace-nowrap'>
                        {spec
                          ? <>{describeSpec(spec)} — <span className='tnum text-[var(--ink)]'>{specSummary}</span></>
                          : 'Name an element, e.g. Ni 28-33'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {activeTab === 'shared' && trading ? (
                <div className='mt-3'><SharedStock /></div>
              ) : (
                <>
              {/* Table Component */}
              <div className='mt-2'>
                <Customtable
                  data={tableData}
                  group={combine ? groupByGrade : undefined}
                  fitBelow={summaryOpen ? undefined : FIT_BELOW_FOLDED}
                  columns={tableColumns}
                  SelectRow={SelectRow}
                  cb={stockSelector}
                  type='stock'
                  invisible={invisible}
                  excellReport={(columnVisibility) => EXD(
                    combine ? combinedForExport : filteredData,
                    settings,
                    getTtl('Stocks', ln),
                    ln,
                    sumData,
                    columnVisibility,
                    tableColumns
                  )}
                  ln={ln}
                  setFilteredArray1={setFilteredArray1}
                />
              </div>

              {/* Totals Section */}
              {/* One header line for the two cards, which fold under it. The header is
                  drawn on its own (headerOnly) and the cards are hidden rather than
                  unmounted, so they keep their sort and scroll position. */}
              <CollapsibleSection
                id='stocks-summary'
                className='mt-3'
                headerOnly
                open={summaryOpen}
                onToggle={toggleSummary}
                title='Summary by warehouse and by grade'
                summary={<>
                  <SectionFigure label='Warehouses'>{sumData.length}</SectionFigure>
                  <SectionFigure label='Quantity'>{new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(sumData.reduce((s, r) => s + toMT(Number(r.qnty) || 0, r, settings), 0))} MT</SectionFigure>
                </>}
              />
              {/* NOT flex-wrap: wrapping is decided on each card's CONTENT width, so
                  the grade card dropped onto its own line at 1440 even though the two
                  fit once shrunk. Side by side from xl up, stacked below it. Summary
                  holds its width; the grade card absorbs all the slack. */}
              <div id='stocks-summary-body' className={`flex-col xl:flex-row gap-6 w-full xl:items-start ${summaryOpen ? 'flex' : 'hidden'}`}>
                <SumTable
                  sumData={sumData}
                  loading={loading}
                  settings={settings}
                  dataTable={data}
                  ln={ln}
                />
                <GradeTable
                  dataTable={filteredData}
                  loading={loading}
                  settings={settings}
                />
              </div>

              {/* Warehouse / terminal storage-aging monitor (#11) */}
              <StorageAging data={data} />
                </>
              )}
            </div>

            {/* Modal */}
            {rowOpen && item && (
              <MyDetailsModal
                isOpen={rowOpen}
                setIsOpen={setRowOpen}
                data={data}
                setData={setData}
                title=''
                item={item}
                setItem={setItem}
              />
            )}

            {auditOpen && (
              <StockAudit
                isOpen={auditOpen}
                setIsOpen={setAuditOpen}
                stockData={rawStockData}
                settings={settings}
                onDataChanged={() => setRefreshTick(t => t + 1)}
              />

            )}
          </>
        }
      </div>
    </div>
  );

}

export default Stocks;
