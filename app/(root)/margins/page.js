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

const MOUSE_SENSOR_OPTIONS = {};
const TOUCH_SENSOR_OPTIONS = {};
const KEYBOARD_SENSOR_OPTIONS = {};

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

            if (!uidCollection) return;
            setData(dt)
            setLoading(false)
        }

        Load();
    }, [yr, uidCollection])

    useEffect(() => {
        // Main totals
        let _purchase = 0, _openShip = 0, _totalMargin = 0, _remaining = 0;
        // GIS totals
        let _purchaseGIS = 0, _openShipGIS = 0, _totalMarginGIS = 0, _remainingGIS = 0;
        const gisData = data.map(z => {
            _purchase    += parseFloat(z.purchase)    || 0;
            _openShip    += parseFloat(z.openShip)    || 0;
            _totalMargin += parseFloat(z.totalMargin) || 0;
            _remaining   += parseFloat(z.remaining)   || 0;

            const gPurchase    = z.items.reduce((a, c) => a + parseFloat(c.gis ? (c.purchase    || 0) : 0), 0);
            const gOpenShip    = z.items.reduce((a, c) => a + parseFloat(c.gis ? (c.openShip * 1 || 0) : 0), 0);
            const gTotalMargin = z.items.reduce((a, c) => a + parseFloat(c.gis ? (c.totalMargin || 0) : 0), 0);
            const gRemaining   = z.items.reduce((a, c) => a + parseFloat(c.gis ? (c.remaining   || 0) : 0), 0);

            _purchaseGIS    += gPurchase;
            _openShipGIS    += gOpenShip;
            _totalMarginGIS += gTotalMargin;
            _remainingGIS   += gRemaining;

            return { ...z, purchase: gPurchase, openShip: gOpenShip, totalMargin: gTotalMargin, remaining: gRemaining };
        });

        setIncoming(_remaining);
        setOutStandingShip(_openShip);
        setPurchase(_purchase);
        setTotalMargin(_totalMargin);
        setShipped(_purchase - _openShip);
        setRemaining(_remaining);

        setDataGIS(gisData);
        setPurchaseGIS(_purchaseGIS);
        setTotalMarginGIS(_totalMarginGIS);
        setOutStandingShipGIS(_openShipGIS);
        setRemainingGIS(_remainingGIS);
    }, [data])

    const handleChangeDate = useCallback((e, i, month) => {
        const dd = dateFormat(e, 'yyyy-mm-dd')
        setData(prev => prev.map(z => z.month === month ? {
            ...z, items: z.items.map((x, k) => k === i ? {
                ...x, date: { endDate: dd, startDate: dd }
            } : x)
        } : z))
    }, [])

    const handleCancelDate = useCallback((e, i, month) => {
        setData(prev => prev.map(z => z.month === month ? {
            ...z, items: z.items.map((x, k) => k === i ? {
                ...x, date: { endDate: null, startDate: null }
            } : x)
        } : z))
    }, [])

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (!active || !over || active.id === over.id) return;
        setData(prev => {
            const index = prev.findIndex(monthData =>
                monthData.items.some(item => item.id === event.collisions[0].id)
            );
            if (index === -1) return prev;
            const ids = dataIds(prev[index].items);
            const oldIndex = ids.indexOf(active.id);
            const newIndex = ids.indexOf(over.id);
            const reordered = arrayMove(prev[index].items, oldIndex, newIndex);
            return prev.map((x, i) => i === index
                ? { ...x, ids: reordered.map(z => z.id), items: reordered }
                : x
            );
        });
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, MOUSE_SENSOR_OPTIONS),
        useSensor(TouchSensor, TOUCH_SENSOR_OPTIONS),
        useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS)
    );

    const addItem = useCallback((month) => {
        const newId = uuidv4();
        const newItem1 = { ...newItm, id: newId };
        setData(prev => prev.map(z => z.month === month
            ? { ...z, items: [...z.items, newItem1], ids: [...z.ids, newId] }
            : z
        ));
    }, []);

    const deleteRow = useCallback((e, i, month) => {
        setData(prev => prev.map(z => z.month === month ? {
            ...z,
            items: z.items.filter((_, k) => k !== i),
            ids: z.ids.filter((_, k) => k !== i)
        } : z))
    }, [])

    const addMonth = () => {

        const month = data.length + 1;
        const formattedMonth = String(month).padStart(2, '0');

        let newData = [...data, {
            month: formattedMonth, openShip: '', purchase: '', remaining: '', totalMargin: '',
            items: [], ids: []
        }]

        setData(newData)
    }

    const handleChange = useCallback((e, i, month) => {
        if (countDecimalDigits(e.target.value) > 3) return;
        const name = e.target.name;
        const value = name === 'description' ? e.target.value : removeNonNumeric(e.target.value);

        setData(prev => {
            let monthData = prev.map(z => z.month === month ? {
                ...z, items: z.items.map((x, k) => k === i ? { ...x, [name]: value } : x)
            } : z)

            monthData = monthData.map(z => z.month === month ? {
                ...z, items: z.items.map((x, k) => k === i ? {
                    ...x, totalMargin: x.purchase * x.margin,
                    openShip: x.purchase - x.shipped,
                    remaining: (x.purchase - x.shipped) * x.margin
                } : x)
            } : z)

            return monthData.map(z => z.month === month ? {
                ...z,
                remaining: z.items.reduce((acc, cur) => acc + (cur.gis ? (cur.remaining / 2 || 0) : (cur.remaining || 0)), 0),
                totalMargin: z.items.reduce((acc, cur) => acc + (cur.gis ? (cur.totalMargin / 2 || 0) : (cur.totalMargin || 0)), 0),
                purchase: z.items.reduce((acc, cur) => acc + (cur.purchase * 1 || 0), 0),
                openShip: z.items.reduce((acc, cur) => acc + (cur.openShip * 1 || 0), 0),
            } : z)
        })
    }, [])

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

    const handleCheckBox = useCallback((value, i, month) => {
        setData(prev => {
            let newArr = prev.map(z => z.month === month ? {
                ...z, items: z.items.map((x, k) => k === i ? { ...x, gis: value } : x)
            } : z)
            return newArr.map(z => z.month === month ? {
                ...z,
                remaining: z.items.reduce((acc, cur) => acc + (cur.gis ? (cur.remaining / 2 || 0) : (cur.remaining || 0)), 0),
                totalMargin: z.items.reduce((acc, cur) => acc + (cur.gis ? (cur.totalMargin / 2 || 0) : (cur.totalMargin || 0)), 0),
                purchase: z.items.reduce((acc, cur) => acc + (cur.purchase * 1 || 0), 0),
                openShip: z.items.reduce((acc, cur) => acc + (cur.openShip * 1 || 0), 0),
            } : z)
        })
    }, []);

    const saveData = async () => {
        let result = await saveMargins(uidCollection, data, yr)
        result && setToast({ show: true, text: 'Data successfully saved!', clr: 'success' })
    }

    const deleteMonth = useCallback((month) => {
        setData(prev => prev.filter(z => z.month !== month));
    }, []);

    return (
        <div className="w-full" style={{ background: "#f8fbff" }}>
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
                    <>
                        <Toast />
                        <VideoLoader loading={loading} fullScreen={true} />

                        {/* Main Card */}
                        <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] shadow-xl w-full bg-white">

                            {/* Header Section */}
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                                <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                                    {getTtl('Margins', ln)}
                                </h1>

                                <div className='flex items-center gap-2 group'>
                                    <div className="relative">
                                        <YearSelect yr={yr} setYr={setYr} />
                                    </div>
                                    <Tooltip txt='Select year' />
                                </div>
                            </div>
                            {/* Stats Section */}
                            <FirstPart
                                incoming={incoming}
                                outStandingShip={outStandingShip}
                                purchase={purchase}
                                totalMargin={totalMargin}
                                shipped={shipped}
                            />

                            {/* Action Buttons - Keep original position */}
                            <div className="rounded-2xl border border-[#b8ddf8]">
                                <div className="p-2 flex gap-3 mt-3">
                                    <button
                                        className="bg-[#dbeeff] text-[var(--endeavour)] px-3 py-1 text-[0.68rem] rounded-full hover:opacity-90 transition-all"
                                        disabled={data.length >= 12}
                                        onClick={addMonth}
                                    >
                                        Add month
                                    </button>

                                    <button
                                        className="bg-[var(--endeavour)] border border-[var(--rock-blue)] text-white px-3 py-1 text-[0.68rem] rounded-full hover:bg-[var(--selago)]/30 transition-all"
                                        onClick={saveData}
                                    >
                                        Save
                                    </button>
                                </div>

                                {/* Margins Tables */}
                                <div className="w-full p-2 mt-2">
                                    <div className="w-full max-w-8xl divide-y rounded-xl">
                                        {data.map(({ month, items, openMonth }) => {
                                            return (
                                                <div key={month}>
                                                    <MarginTable
                                                        month={month}
                                                        year={yr}
                                                        items={items}
                                                        openMonth={openMonth}
                                                        setData={setData}
                                                        uidCollection={uidCollection}
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
                                <div className='flex flex-col lg:flex-row gap-6'>
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

