'use client'

import Spinner from "../../../components/spinner";
import Toast from "../../../components/toast";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import React, { useCallback, useContext, useEffect, useState } from 'react'
import MarginTable from "./marginTable";
import YearSelect from "../../../components/yearSelect";
import { loadMargins, saveMargins } from "../../../utils/utils";
import { UserAuth } from "../../../contexts/useAuthContext";
import Spin from '../../../components/spinTable';
import VideoLoader from '../../../components/videoLoader';
import Tooltip from "../../../components/tooltip";
import FirstPart from "./firstpart";
import ThirdPart from "./thirdpart";
import dateFormat from "dateformat";

// needed for table body level scope DnD setup
import {
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';

import {
    arrayMove,
} from '@dnd-kit/sortable';

// needed for row & cell level scope DnD setup
import { useSortable } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { countDecimalDigits, dataIds, removeNonNumeric } from "./funcs";

// Cell Component
const RowDragHandleCell = ({ rowId }) => {
    const { attributes, listeners } = useSortable({
        id: rowId,
    });
    return (
        // Alternatively, you could set these attributes on the rows themselves
        <button {...attributes} {...listeners} className='cursor-grabbing'>
            🟰
        </button>
    );
};

let newItm = {
    date: null, purchase: '', description: '', supplier: '', client: '',
    margin: '', totalMargin: '', shipped: '', openShip: '', remaining: '',
}

// Table Component
const Margins = () => {

    const { settings, ln, setLoading, loading, setToast, compData } = useContext(SettingsContext);
    const [yr, setYr] = useState()
    const { uidCollection } = UserAuth();
    const [data, setData] = useState([]);
    const [dataGIS, setDataGIS] = useState([]);
    const currentYear = new Date().getFullYear();
    const [incoming, setIncoming] = useState('')
    const [outStandingShip, setOutStandingShip] = useState('')
    const [outStandingShipGIS, setOutStandingShipGIS] = useState('')

    const [purchase, setPurchase] = useState('')
    const [purchaseGIS, setPurchaseGIS] = useState('')
    const [totalMargin, setTotalMargin] = useState('')
    const [totalMarginGIS, setTotalMarginGIS] = useState('')
    const [shipped, setShipped] = useState('')
    const [remaining, setRemaining] = useState('')
    const [remainingGIS, setRemainingGIS] = useState('')

    const cName = compData?.name?.slice(0, 3).toLowerCase()

    useEffect(() => {
        setYr(currentYear)
    }, [])

    useEffect(() => {

        const Load = async () => {
            setLoading(true)

            let dt = await loadMargins(uidCollection, yr)

            dt = dt.map(({ items, ids, ...rest }) => ({
                ...rest,
                ids,
                items: ids?.map(id => items?.find(item => item.id === id)).filter(Boolean) || []
            }));

            setData(dt)
            setLoading(false)
        }

        //   Object.keys(settings).length !== 0 &&
        Load();
    }, [yr, settings])

    useEffect(() => {
        const total = data.reduce((accumulator, item) => {
            return accumulator + (parseFloat(item.remaining) || 0);
        }, 0);
        setIncoming(total)

        const total1 = data.reduce((accumulator, item) => {
            return accumulator + (parseFloat(item.openShip) || 0);
        }, 0);
        setOutStandingShip(total1)

        const total2 = data.reduce((accumulator, item) => {
            return accumulator + (parseFloat(item.purchase) || 0);
        }, 0);
        setPurchase(total2)

        const total3 = data.reduce((accumulator, item) => {
            return accumulator + (parseFloat(item.totalMargin) || 0);
        }, 0);
        setTotalMargin(total3)

        const tota4 = total2 - total1
        setShipped(tota4)

        const total5 = data.reduce((accumulator, item) => {
            return accumulator + (parseFloat(item.remaining) || 0);
        }, 0);
        setRemaining(total5)

    }, [data])

    const handleChangeDate = (e, i, month) => {
        let dd = dateFormat(e, 'yyyy-mm-dd')
        let monthData = data.map(z => z.month === month ?
            {
                ...z, items: z.items.map((x, k) => k === i ?
                    {
                        ...x, date:
                        {
                            endDate: dd, startDate: dd,
                        }
                    } : x)
            } : z)

        setData(monthData)
    }

    const handleCancelDate = (e, i, month) => {

        let monthData = data.map(z => z.month === month ?
            {
                ...z, items: z.items.map((x, k) => k === i ?
                    {
                        ...x, date:
                            { endDate: null, startDate: null }
                    } : x)
            } : z)

        setData(monthData)
    }

    // reorder rows after drag & drop
    function handleDragEnd(event) {

        //find month
        const index = data.findIndex(monthData =>
            monthData.items.some(item => item.id === event.collisions[0].id)
        );

        const { active, over } = event;

        let ids = dataIds(data[index].items);

        if (active && over && active.id !== over.id) {
            setData(() => {
                const oldIndex = ids.indexOf(active.id);
                const newIndex = ids.indexOf(over.id);

                return data.map((x, i) => i === index ?
                    {
                        ...x, ids:
                            arrayMove(data[index]?.items, oldIndex, newIndex).map(z => z.id),
                        items: arrayMove(data[index]?.items, oldIndex, newIndex)
                    } : x)
            });
        }
    }

    const sensors = useSensors(
        useSensor(MouseSensor, {}),
        useSensor(TouchSensor, {}),
        useSensor(KeyboardSensor, {})
    );

    const addItem = (month) => {

        let newId = uuidv4();
        const newItem1 = {
            ...newItm, id: newId // Generates a unique ID
        };

        let newArr = data.map(z => z.month === month
            ? { ...z, items: [...z.items, newItem1], ids: [...z.ids, newId] }
            : z
        )
        setData(newArr)
    }

    const deleteRow = (e, i, month) => {

        let monthData = data.map(z => z.month === month ?
            {
                ...z, items: z.items.filter((_, k) => k !== i), ids: z.ids.filter((_, k) => k !== i)
            } : z)

        setData(monthData)

    }

    const addMonth = () => {

        const month = data.length + 1;
        const formattedMonth = String(month).padStart(2, '0');

        let newData = [...data, {
            month: formattedMonth, openShip: '', purchase: '', remaining: '', totalMargin: '',
            items: [], ids: []
        }]

        setData(newData)
    }

    const handleChange = (e, i, month) => {

        if (countDecimalDigits(e.target.value) > 3) return;

        let monthData = data.map(z => z.month === month ?
            {
                ...z, items: z.items.map((x, k) => k === i ?
                    {
                        ...x, [e.target.name]: e.target.name === 'description' ? e.target.value : removeNonNumeric(e.target.value),
                    } : x)
            } : z)

        monthData = monthData.map(z => z.month === month ?
            {
                ...z, items: z.items.map((x, k) => k === i ?
                    {
                        ...x, totalMargin: x.purchase * x.margin, openShip: x.purchase - x.shipped,
                        remaining: (x.purchase - x.shipped) * x.margin
                    } : x)
            } : z)

        monthData = monthData.map(z => z.month === month ? {
            ...z, remaining:
                z.items.reduce((accumulator, current) => {
                    return accumulator + (current.gis ? (current.remaining / 2 || 0) : (current.remaining || 0))
                }, 0),
            totalMargin: z.items.reduce((accumulator, current) => {
                return accumulator + (current.gis ? (current.totalMargin / 2 || 0) : (current.totalMargin || 0))
            }, 0),
            purchase: z.items.reduce((accumulator, current) => {
                return accumulator + (current.purchase * 1 || 0)
            }, 0),
            openShip: z.items.reduce((accumulator, current) => {
                return accumulator + (current.openShip * 1 || 0)
            }, 0),
        } : z)

        setData(monthData)

    }

    useEffect(() => {
        let dt = data.map(z => ({
            ...z,
            remaining: z.items.reduce((accumulator, current) => {
                return accumulator + parseFloat(current.gis ? (current.remaining || 0) : 0)
            }, 0),
            totalMargin: z.items.reduce((accumulator, current) => {
                return accumulator + parseFloat(current.gis ? (current.totalMargin || 0) : 0)
            }, 0),
            purchase: z.items.reduce((accumulator, current) => {
                return accumulator + parseFloat(current.gis ? (current.purchase || 0) : 0)
            }, 0),
            openShip: z.items.reduce((accumulator, current) => {
                return accumulator + parseFloat(current.gis ? (current.openShip * 1 || 0) : 0)
            }, 0),
        }))

        setDataGIS(dt)

        const total2 = dt.reduce((accumulator, item) => {
            return accumulator + (parseFloat(item.purchase) || 0);
        }, 0);
        setPurchaseGIS(total2)

        const total3 = dt.reduce((accumulator, item) => {
            return accumulator + (parseFloat(item.totalMargin) || 0);
        }, 0);
        setTotalMarginGIS(total3)

        const total4 = dt.reduce((accumulator, item) => {
            return accumulator + (parseFloat(item.openShip) || 0);
        }, 0);
        setOutStandingShipGIS(total4)

        const total5 = dt.reduce((accumulator, item) => {
            return accumulator + (parseFloat(item.remaining) || 0);
        }, 0);
        setRemainingGIS(total5)

    }, [data])

    const handleChangeSelect = useCallback((e, i, month, name) => {
        setData((prevData) =>
            prevData.map((z) =>
                z.month === month
                    ? {
                        ...z,
                        items: z.items.map((x, k) =>
                            k === i ? { ...x, [name]: e } : x
                        )
                    }
                    : z
            )
        );
    }, [setData]); // Add `setData` as a dependency

    const handleCheckBox = (value, i, month, name) => {

        let newArr = data.map((z) =>
            z.month === month
                ? {
                    ...z,
                    items: z.items.map((x, k) =>
                        k === i ? { ...x, gis: value } : x
                    )
                }
                : z
        )

        newArr = newArr.map(z => z.month === month ? {
            ...z,
            remaining: z.items.reduce((accumulator, current) => {
                return accumulator + (current.gis ? (current.remaining / 2 || 0) : (current.remaining || 0))
            }, 0),
            totalMargin: z.items.reduce((accumulator, current) => {
                console.log(current)
                return accumulator + (current.gis ? (current.totalMargin / 2 || 0) : (current.totalMargin || 0))
            }, 0),
            purchase: z.items.reduce((accumulator, current) => {
                return accumulator + (current.purchase * 1 || 0)
            }, 0),
            openShip: z.items.reduce((accumulator, current) => {
                return accumulator + (current.openShip * 1 || 0)
            }, 0),
        } : z)
        console.log(newArr)
        setData(newArr)
    };

    const saveData = async () => {
        let result = await saveMargins(uidCollection, data, yr)
        result && setToast({ show: true, text: 'Data successfully saved!', clr: 'success' })
    }

    const deleteMonth = (month) => {
        setData(prev => prev.filter(z => z.month !== month));
    }

    return (
        <div className="w-full" style={{ background: "#f8fbff" }}>
            <div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
                    <>
                        <Toast />
                        <VideoLoader loading={loading} fullScreen={true} />

                        {/* Main Card */}
                        <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-gray-200 shadow-xl w-full backdrop-blur-[2px] bg-white">
                            
                            {/* Header Section */}
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                                <h1 className="text-[14px] text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2" style={{ fontSize: '14px' }}>
                                    {getTtl('Margins', ln)}
                                </h1>
                                
                                <div className='flex items-center gap-2 group'>
                                    <div className="relative">
                                        <YearSelect yr={yr} setYr={setYr} />
                                    </div>
                                    <Tooltip txt='Select year' />
                                </div>
                            </div>
                            <div className="rounded-2xl bg-[var(--selago)] py-2">
                            {/* Stats Section */}
                            <FirstPart
                                incoming={incoming}
                                outStandingShip={outStandingShip}
                                purchase={purchase}
                                totalMargin={totalMargin}
                                shipped={shipped}
                            />
                            </div>

                            {/* Action Buttons - Keep original position */}
                            <div className="rounded-2xl border border-gray-200">
                           <div className="p-2 flex gap-3 mt-3">
                                <button
                                    className="bg-[var(--selago)] text-[var(--endeavour)] px-3 py-1 text-xs rounded-full hover:opacity-90 transition-all"
                                    disabled={data.length >= 12}
                                    onClick={addMonth}
                                >
                                    Add month
                                </button>

                                <button
                                    className="bg-[var(--endeavour)] border border-[var(--rock-blue)] text-white px-3 py-1 text-xs rounded-full hover:bg-[var(--selago)]/30 transition-all"
                                    onClick={saveData}
                                >
                                    Save
                                </button>
                            </div>

                            {/* Margins Tables */}
                            <div className="w-full p-2 mt-2">
                                <div className="w-full max-w-8xl divide-y rounded-xl">
                                    {data.map(({ month, items }) => {
                                        return (
                                            <div key={month}>
                                                <MarginTable
                                                    month={month}
                                                    year={yr}
                                                    items={items}
                                                    addItem={addItem}
                                                    deleteMonth={deleteMonth}
                                                    handleChangeDate={handleChangeDate}
                                                    handleChange={handleChange}
                                                    handleChangeSelect={handleChangeSelect}
                                                    deleteRow={deleteRow}
                                                    handleCancelDate={handleCancelDate}
                                                    settings={settings}
                                                    RowDragHandleCell={RowDragHandleCell}
                                                    handleDragEnd={handleDragEnd}
                                                    sensors={sensors}
                                                    handleCheckBox={handleCheckBox}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Summary Sections */}
                            <div className='flex gap-6'>
                                <ThirdPart
                                    data={data}
                                    remaining={remaining}
                                    outStandingShip={outStandingShip}
                                    purchase={purchase}
                                    totalMargin={totalMargin}
                                    yr={yr}
                                    title='Totals'
                                />
                                <ThirdPart
                                    data={dataGIS}
                                    remaining={remainingGIS}
                                    outStandingShip={outStandingShipGIS}
                                    purchase={purchaseGIS}
                                    totalMargin={totalMarginGIS}
                                    yr={yr}
                                    title={cName === 'ims' ? 'Total GIS' : 'Total IMS'}
                                />
                            </div>
                            </div>
                        </div>
                    </>
                }
            </div>
        </div>
    )
}

export default Margins;

