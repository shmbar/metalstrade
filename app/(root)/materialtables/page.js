'use client'

import Spinner from "../../../components/spinner";
import Toast from "../../../components/toast";
import { Button } from "../../../components/ui/button"
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
    const { uidCollection } = UserAuth();

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'material', header: 'Material', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'kgs', header: 'Kgs', cell: (props) => <p className=" max-w-10">{props.getValue()}</p> },
        { accessorKey: 'ni', header: 'Ni', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'cr', header: 'Cr', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'cu', header: 'Cu', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'mo', header: 'Mo', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'w', header: 'W', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'co', header: 'Co', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'nb', header: 'Nb', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'fe', header: 'Fe', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'ti', header: 'Ti', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'del', header: '', cell: (props) => <div><MdDeleteOutline className='text-slate-400 cursor-pointer' /></div> },

    ]

    useEffect(() => {
        const loadData = async () => {
            let dt = await loadMaterials(uidCollection)
            setData(dt)
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
                        {/* Main Card */}
                        <div className="rounded-2xl p-3 sm:p-5 mt-2 border-0 shadow-xl w-full backdrop-blur-[2px] bg-white relative max-w-7xl mx-auto">
                            {/* Header Section */}
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-2">
                                <h1 className="text-[14px] text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2" style={{ fontSize: '14px' }}>
                                    {getTtl('Material Tables', ln)}
                                </h1>
                            </div>
                            {/* Action Buttons */}
                            <div className="border rounded-2xl p-3">
                            <div className="flex gap-2 sm:gap-4 flex-wrap mb-2">
                                <Button  className="bg-[var(--endeavour)] border border-[var(--rock-blue)] text-white px-3 h-6 text-xs font-normal rounded-full hover:bg-[var(--selago)]/30 transition-all"
 onClick={addTable}>
                                    Add Table
                                </Button>
                                <Button   className="bg-[#e3f3ff] text-[var(--endeavour)] px-3 py-1 text-xs rounded-full hover:opacity-90 transition-all"variant="outline" onClick={saveTable}>
                                    Save
                                </Button>
                            </div>
                            {/* Table(s) */}
                            <div className="w-full overflow-x-auto mt-4">
                                {data.map(table => (
                                    <Table
                                        data={table.data}
                                        key={table.id}
                                        table1={table}
                                        columns={propDefaults}
                                        addMaterial={() => addMaterial(table)}
                                        editCell={editCell}
                                        delMaterial={delMaterial}
                                        delTable={delTable}
                                        runPdf={runPdf}
                                        excellReport={EXD(table.data)}
                                    />
                                ))}
                            </div>
                            {/* Totals Section */}
                            {(data.length && !Object.values(totals).some(value => isNaN(value))) ? (
                                <div className="w-full pt-8 overflow-x-auto">
                                    <TableTotals
                                        data={[totals]}
                                        columns={propDefaults}
                                        addMaterial={addMaterial}
                                        editCell={editCell}
                                        delMaterial={delMaterial}
                                        delTable={delTable}
                                    />
                                </div>
                            ) : null}
                            </div>
                        </div>
                    </>
                }
            </div>
        </div>
    )
}

export default MaterialTables;

