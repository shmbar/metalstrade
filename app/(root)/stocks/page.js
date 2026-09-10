'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import Customtable from './newTable';
import SharedStock from './SharedStock';
import KpiStrip from '../../../components/KpiStrip';
import { NameCell } from '../../../components/Avatar';
import { Boxes, Warehouse, Factory, Layers } from 'lucide-react';
import MyDetailsModal from './whModal.js'
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { ContractsContext } from "../../../contexts/useContractsContext";
import Toast from '../../../components/toast.js'
import Spinner from '../../../components/spinner';
import VideoLoader from '../../../components/videoLoader';
import { TableSkeleton } from "../../../components/skeletons";
import { UserAuth } from "../../../contexts/useAuthContext"
import { loadStockData, filteredArray, loadAllStockData } from '../../../utils/utils'
import { settledInQty } from '../../../utils/finance'
import { Selector } from '../../../components/selectors/selectShad.js'
import { EXD } from './excel'
import { getTtl } from '../../../utils/languages';
import SumTable from './sumtables/sumTable'
import GradeTable from './sumtables/gradeTable'
import { gradeKeyOf, gradeLabel, niRangeLabel } from './sumtables/gradeKey'
import StorageAging from './storageAging'
import StockAudit from './stockAudit'
import { BtnIcon } from '../../../components/buttonIcons'
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



const Stocks = () => {

  const { settings, setLoading, loading, ln } = useContext(SettingsContext);
  const { isOpenCon, setIsOpenCon } = useContext(ContractsContext);
  const { uidCollection } = UserAuth();
  const [selectedStock, setSelectedStock] = useState({ stock: 'allStocks', id: 'allStocks', nname: '..All Stocks' })
  const [activeTab, setActiveTab] = useState('mine') // 'mine' = this account's stock, 'shared' = IMS+GIS shared pool
  // const [selectedOpt, setSelectOpt] = useState({ opt: 4 })
  const [data, setData] = useState([])
  const [sumData, setSumData] = useState([])

  const [filteredArray1, setFilteredArray1] = useState([])
  const [item, setItem] = useState(null)
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [rawStockData, setRawStockData] = useState([])
  const [auditOpen, setAuditOpen] = useState(false)
  // false = one row per stock line, true = one row per grade (see groupedData).
  const [combine, setCombine] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0) // bumped after audit write-offs to re-pull stock


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
      filterFn: 'dateBetweenFilterFn'
    },
    {
      accessorKey: 'supplier', header: getTtl('Supplier', ln),
      cell: (props) => <NameCell name={props.getValue()} />,
      meta: {
        filterVariant: 'selectSupplier',
      },
    },
    {
      accessorKey: 'originSupplier', header: 'Original supplier',
      cell: (props) => <NameCell name={props.getValue()} />,
    },
    {
      accessorKey: 'stock', header: getTtl('warehouse', ln),
      cell: (props) => <NameCell name={props.getValue()} />,
    },
    { accessorKey: 'descriptionName', header: getTtl('Description', ln), cell: (props) => <p>{props.getValue()}</p> },
    { accessorKey: 'qnty', header: getTtl('Quantity', ln), cell: (props) => <p>{showWeight(props)}</p> },
    // MT / KGS / LB — the widest value is three characters, so the column takes
    // only what its header needs and leaves the rest to Description.
    { accessorKey: 'qTypeTable', header: getTtl('WeightType', ln), meta: { narrow: true } },
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
  ], [ln]);

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

  // Stable table data — getFormatted only reads `settings` (covered by deps).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tableData = useMemo(() => getFormatted(data), [data, settings]);

  /* Lines vs grades.

     The table has always listed stock LINES, while the summary cards think in
     grades — so DMT's `Hast X`, `Hast X (47Ni 21Cr8Mo)` and `Hast X (47Ni 21Cr 8Mo)`
     read as three positions here and one there, and an export of this table could
     never be reconciled against the card beside it. `combine` folds the rows on the
     same grade key the cards use, keeping every line as a subRow so nothing is lost.

     Grouping happens on the FORMATTED rows (names, not ids) because a grade can span
     suppliers and warehouses — a parent's supplier cell is the set of them, which is
     also what keeps the search box working: typing `dmt` still matches the group. */
  const groupByGrade = (rows) => {
    const groups = {};
    rows.forEach(row => {
      const name = row.descriptionName || '-';
      const { key: gKey, label: synth, ni } = gradeKeyOf(name);
      const key = `${gKey || name}|${row.cur || ''}`;
      if (!groups[key]) groups[key] = { key, synth, spellings: new Set(), niValues: [], lines: [] };
      groups[key].spellings.add(name);
      if (ni !== null) groups[key].niValues.push(ni);
      groups[key].lines.push(row);
    });

    // Trim: several supplier names are stored with a trailing space, which turned
    // a joined cell into "Shalex , Lobis".
    const uniq = (arr) => [...new Set(arr.map(v => typeof v === 'string' ? v.trim() : v)
      .filter(v => v !== undefined && v !== null && v !== ''))];
    const join = (arr) => arr.length <= 2 ? arr.join(', ') : `${arr[0]} +${arr.length - 1}`;

    return Object.values(groups).map(g => {
      const qnty = g.lines.reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0);
      const total = g.lines.reduce((s, r) => s + (r.total === '-' ? 0 : parseFloat(r.total) || 0), 0);
      const base = gradeLabel(g.synth, [...g.spellings]);
      const span = g.synth ? niRangeLabel(g.niValues) : '';
      return {
        id: `grade:${g.key}`,
        order: join(uniq(g.lines.map(r => r.order))),
        date: '',
        supplier: join(uniq(g.lines.map(r => r.supplier))),
        originSupplier: join(uniq(g.lines.map(r => r.originSupplier))),
        stock: join(uniq(g.lines.map(r => r.stock))),
        descriptionName: span ? `${base} · ${span}` : base,
        qnty,
        qTypeTable: uniq(g.lines.map(r => r.qTypeTable))[0] || '',
        // Weighted, not the mean of the lines' own unit prices.
        unitPrc: qnty > 0 ? total / qnty : 0,
        total,
        sType: join(uniq(g.lines.map(r => r.sType))),
        cur: g.lines[0]?.cur,
        _lines: g.lines.length > 1 ? g.lines : undefined,
        _lotCount: g.lines.length,
        /* Every underlying line id, even for a single-line grade. A grade row's own
           id is synthetic ("grade:<key>") and exists nowhere in `data`, so anything
           that resolves the filtered rows back to raw lines — the Summary card, the
           Avg Cost per Grade card, the Excel export — has to expand through this.
           Without it, switching to By grade emptied all three. */
        _lineIds: g.lines.map(l => l.id),
      };
    }).sort((a, b) => b.total - a.total);
  };

  const groupedData = useMemo(() => groupByGrade(tableData), [tableData]);
  const shownData = combine ? groupedData : tableData;

  // Rows currently visible after the table's filters (supplier, item, warehouse, etc.).
  // Used for both the "Avg Cost Price per Grade" table and the Excel export so they
  // follow whatever the user filters on.
  const filteredData = useMemo(
    () => data.filter(x => filteredLineIds.has(x.id)),
    [data, filteredLineIds]
  );

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
              <div className='mt-3 flex'>
                <div className='flex items-center bg-[var(--bg-subtle)] border border-[var(--line)] rounded-lg p-0.5'>
                  {[['mine', 'My Stock'], ['shared', 'Shared (IMS + GIS)']].map(([key, label]) => (
                    <button key={key} type='button' onClick={() => setActiveTab(key)}
                      className={`rounded-lg transition-colors ${activeTab === key
                        ? 'bg-[var(--bg-card)] text-[var(--ink)] font-medium shadow-card'
                        : 'text-[var(--ink-secondary)]'}`}
                      style={{ fontSize: 'var(--fs-input)', padding: '5px 14px' }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Lines vs grades. Sits with the tabs because it changes what a
                    row MEANS, which is the same class of switch. */}
                {activeTab === 'mine' && (
                  <div className='flex items-center bg-[var(--bg-subtle)] border border-[var(--line)] rounded-lg p-0.5 ml-3'>
                    {[[false, 'Lines'], [true, 'By grade']].map(([val, label]) => (
                      <button key={label} type='button' onClick={() => setCombine(val)}
                        className={`rounded-lg transition-colors ${combine === val
                          ? 'bg-[var(--bg-card)] text-[var(--ink)] font-medium shadow-card'
                          : 'text-[var(--ink-secondary)]'}`}
                        style={{ fontSize: 'var(--fs-input)', padding: '5px 14px' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {activeTab === 'shared' ? (
                <div className='mt-3'><SharedStock /></div>
              ) : (
                <>
              {/* Table Component */}
              <div className='mt-2'>
                <Customtable
                  data={shownData}
                  columns={propDefaults}
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
                    propDefaults
                  )}
                  ln={ln}
                  setFilteredArray1={setFilteredArray1}
                />
              </div>

              {/* Totals Section */}
              {/* NOT flex-wrap: wrapping is decided on each card's CONTENT width, so
                  the grade card dropped onto its own line at 1440 even though the two
                  fit once shrunk. Side by side from xl up, stacked below it. Summary
                  holds its width; the grade card absorbs all the slack. */}
              <div className='flex flex-col xl:flex-row gap-6 w-full xl:items-start'>
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
