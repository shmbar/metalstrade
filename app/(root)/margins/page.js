'use client'

import Spinner from "@components/spinner";
import Toast from "@components/toast";
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from "@utils/languages";
import React, { useCallback, useContext, useEffect, useState } from 'react'
import MarginTable from "./marginTable";
import YearSelect from "@components/yearSelect";
import { loadMargins, saveMargins } from "@utils/utils";
import { UserAuth } from "@contexts/useAuthContext";
import Spin from '@components/spinTable';
import Tooltip from "@components/tooltip";
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

    return (
        <div className="container mx-auto px-2 md:px-8 xl:px-10 mt-16 md:mt-0 pb-20">

            {Object.keys(settings).length === 0 ? <Spinner /> :
                <>
                    <Toast />
                    {loading && <Spin />}
                    <div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
                        <div className='flex items-center justify-between flex-wrap'>
                            <div className="text-3xl p-1 pb-2 text-slate-500">{getTtl('Margins', ln)}</div>

                            <div className="flex group w-16">
                                <YearSelect yr={yr} setYr={setYr} />
                                <Tooltip txt='Select year' />
                            </div>

                        </div>

                        {/*******First Part */}
                        <FirstPart
                            incoming={incoming}
                            outStandingShip={outStandingShip}
                            purchase={purchase}
                            totalMargin={totalMargin}
                            shipped={shipped}
                        />


                        {/*******Second Part */}
                        <div className="p-2 flex gap-4">
                            <button className="blackButton" disabled={data.length >= 12}
                                onClick={addMonth}>
                                Add month
                            </button>
                            <button className="whiteButton"
                                onClick={saveData}>
                                Save
                            </button>
                        </div>

                        <div className="w-full p-2 mt-2">
                            <div className="w-full max-w-8xl divide-y  rounded-xl">

                                {data.map(({ month, items }) => {
                                    return (
                                        <div key={month}>
                                            <MarginTable
                                                month={month}
                                                year={yr}
                                                items={items}
                                                addItem={addItem}
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


                        {/* ******Third Part  TOTALS */}
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
                </>}
        </div >
    )
}

export default Margins;

