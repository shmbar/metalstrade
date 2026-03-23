'use client'

import Spinner from "../../../components/spinner";
import Toast from "../../../components/toast";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import { useContext, useEffect, useState } from "react"
import VideoLoader from '../../../components/videoLoader';
import Table from './newTable'
import TableTotals from './totals'
import { v4 as uuidv4 } from 'uuid';
import { MdDeleteOutline } from "react-icons/md";
import { TPdfTable } from "./pdfTable";
import { EXD } from "./excel";
import { UserAuth } from "../../../contexts/useAuthContext";
import { delCompExp, loadMaterials, saveMaterials } from "../../../utils/utils";


function countDecimalDigits(inputString) {
  
    const match = inputString.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!match) return 0;

    const decimalPart = match[1] || '';
    const exponentPart = match[2] || '';

    // Combine the decimal and exponent parts
    const combinedPart = decimalPart + exponentPart;

    // Remove leading zeros
    const trimmedPart = combinedPart.replace(/^0+/, '');

    return trimmedPart.length;
}

const mtItems = ['ni', 'cr', 'cu', 'mo', 'w', 'co', 'nb', 'fe', 'ti']

const MaterialTables = () => {
      
    const { settings, ln, setToast } = useContext(SettingsContext);
    const [data, setData] = useState([])
    const [totals, setTotals] = useState({})
    const [loading, setLoading] = useState(true)
    const { uidCollection } = UserAuth();

    const fmtNum = (v) => {
        if (v == null || v === '') return '';
        const n = Number(v);
        if (isNaN(n)) return v;
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    };

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'material', header: 'Material', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'kgs', header: 'Kgs', cell: (props) => <p className=" max-w-10">{fmtNum(props.getValue())}</p> },
        { accessorKey: 'ni', header: 'Ni', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        { accessorKey: 'cr', header: 'Cr', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        { accessorKey: 'cu', header: 'Cu', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        { accessorKey: 'mo', header: 'Mo', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        { accessorKey: 'w', header: 'W', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        { accessorKey: 'co', header: 'Co', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        { accessorKey: 'nb', header: 'Nb', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        { accessorKey: 'fe', header: 'Fe', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        { accessorKey: 'ti', header: 'Ti', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        { accessorKey: 'del', header: '', cell: (props) => <div><MdDeleteOutline className='text-slate-400 cursor-pointer' /></div> },

    ]

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            let dt = await loadMaterials(uidCollection)
            setData(dt)
            setLoading(false)
        }

        loadData()
    }, [])

    const addTable = () => {
        let dt = [...data, { id: uuidv4(), data: [] }]
        setData(dt)
    }

    const saveTable = async () => {
        let result = await saveMaterials(uidCollection, data)

        result && setToast({ show: true, text: 'Invoice successfully saved!', clr: 'success' })
    }

    const addMaterial = (table) => {

        const newMaterial = { id: uuidv4(), material: '', kgs: '', ni: '', cr: '', cu: '', mo: '', w: '', co: '', nb: '', fe: '', ti: '' };
        let dt = data.map(z => z.id === table.id ? { ...table, data: [...table.data, newMaterial] } : z);
        setData(dt)
    }

    const delMaterial = (table1, cell) => {
        let dt = data.map(z => z.id === table1.id ? { ...table1, data: table1.data.filter(x => x.id !== cell.row.original.id) } : z);
        setData(dt)
    }

    const delTable = async (table1) => {

        if (table1.data.length === 0) {
            let dt = data.filter(z => z.id !== table1.id);
            setData(dt)
            await delCompExp(uidCollection, 'materialtables', table1)
            setToast({ show: true, text: 'Table successfully deleted!', clr: 'success' })
        } else {
            setToast({ show: true, text: 'Table contains materials!', clr: 'fail' })
            return;
        }

    }

    const runPdf = (table1) => {

        const totalKgs = table1.data.reduce((sum, item) => sum + Number(item.kgs), 0);

        const obj = { kgs: totalKgs };

        mtItems.forEach(key => {
            const weightedSum = table1.data.reduce((sum, row) => sum + (parseFloat(row[key] || 0) * row.kgs), 0);
            obj[key] = (weightedSum / totalKgs).toFixed(2);
        });

        obj.material = ''

        let tmp = [...table1.data, obj].map(z => ({
            material: z.material,
            kgs: z.kgs,
            ...Object.fromEntries(mtItems.map(key => [key, z[key]]))
        })).map(obj => Object.values(obj))

        tmp = tmp.map(row =>
            row.map((value, index) => {
                if (index === 0) return value; // Keep first column unchanged
                const num = parseFloat(value); // Convert to number
                return isNaN(num) ? '' : new Intl.NumberFormat('en-US', {}).format(num);
            })
        );

        TPdfTable(tmp)
    }

    const editCell = (table1, e, cell) => {
        if (countDecimalDigits(e.target.value) > 2) return;

        const cleanValue = cell.column.id === 'kgs'
            ? e.target.value.replace(/[^0-9.-]/g, "")
            : e.target.value;

        setData(data.map(tbl =>
            tbl.id === table1.id
                ? {
                    ...tbl,
                    data: tbl.data.map(row =>
                        row.id === cell.row.original.id
                            ? { ...row, [cell.column.id]: cleanValue }
                            : row
                    )
                }
                : tbl
        ));
    };


    useEffect(() => {
        if (!data || data.length === 0) return; // Prevent empty state issues

        const arr = data.map(table => {
            const totalKgs = table.data.reduce((sum, item) => sum + Number(item.kgs), 0);

            const obj = { kgs: totalKgs };

            mtItems.forEach(key => {
                const weightedSum = table.data.reduce((sum, row) => sum + (parseFloat(row[key] || 0) * row.kgs), 0);
                obj[key] = (weightedSum / totalKgs).toFixed(2);
            });

            return obj;
        });


        const totalKgs = arr.reduce((sum, item) => sum + item.kgs, 0);

        const result = { kgs: totalKgs.toFixed(2) };

        mtItems.forEach(key => {
            const sum = arr.reduce((acc, item) => acc + parseFloat(item[key]), 0);
            result[key] = (sum / arr.length).toFixed(2);
        });


        setTotals(result);


    }, [JSON.stringify(data)]); // Ensures effect runs only when `data` actually changes



    return (
        <div className="w-full ">
            <div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
                    <>
                        <Toast />
                        <VideoLoader loading={loading} fullScreen={true} />
                        {/* Main Card */}
                        <div className="rounded-2xl p-3 sm:p-5 mt-2 border border-[#b8ddf8] shadow-xl w-full bg-white relative max-w-7xl mx-auto">
                            {/* Header Section */}
                            <div className="flex flex-col gap-3 pb-4">
                                <h1 className="text-[14px] text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2" style={{ fontSize: '14px' }}>
                                    {getTtl('Material Tables', ln)}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={addTable}
                                        className="flex items-center gap-1 bg-[var(--endeavour)] text-white text-xs font-medium px-4 h-8 rounded-full hover:opacity-90 transition-all"
                                    >
                                        + {getTtl('Add Table', ln) || 'Add Table'}
                                    </button>
                                    <button
                                        onClick={saveTable}
                                        className="flex items-center text-[var(--endeavour)] border border-[var(--rock-blue)] text-xs font-medium px-4 h-8 rounded-full hover:bg-[var(--selago)] transition-all"
                                    >
                                        {getTtl('Save', ln) || 'Save'}
                                    </button>
                                </div>
                            </div>
                            {/* Table(s) */}
                            <div className="w-full overflow-x-auto mt-2">
                                {data.map(table => (
                                    <div key={table.id} className="mb-4 rounded-2xl border border-[#b8ddf8] shadow-sm overflow-hidden">
                                    <Table
                                        data={table.data}
                                        table1={table}
                                        columns={propDefaults}
                                        addMaterial={() => addMaterial(table)}
                                        addTable={addTable}
                                        saveTable={saveTable}
                                        editCell={editCell}
                                        delMaterial={delMaterial}
                                        delTable={delTable}
                                        runPdf={runPdf}
                                        excellReport={EXD(table.data)}
                                    />
                                    </div>
                                ))}
                            </div>
                            {/* Totals Section */}
                            {(data.length && !Object.values(totals).some(value => isNaN(value))) ? (
                                <div className="w-full pt-4 overflow-x-auto">
                                <div className="rounded-2xl border border-[#b8ddf8] shadow-sm overflow-hidden">
                                    <TableTotals
                                        data={[totals]}
                                        columns={propDefaults}
                                        addMaterial={addMaterial}
                                        editCell={editCell}
                                        delMaterial={delMaterial}
                                        delTable={delTable}
                                    />
                                </div>
                                </div>
                            ) : null}
                        </div>
                    </>
                }
            </div>
        </div>
    )
}

export default MaterialTables;

