import React from 'react'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { IoAddCircleOutline } from "react-icons/io5";
import { FiMinusCircle } from "react-icons/fi";

import Customtable from './newTable';
import { NumericFormat } from "react-number-format";



const MarginTable = (props) => {

    let { month, year, addItem } = props
    let data = props.items
    return (
        <Disclosure as="div" className="w-full mb-4 border border-slate-600 rounded-md" defaultOpen={true}>
            {/* <DisclosureButton className="w-full p-2 text-left text-sm">{month}</DisclosureButton> */}
            {({ open }) => (
                <>
                    <div className="flex items-center gap-2 p-2 text-[0.8rem] w-full">
                        <DisclosureButton className="flex items-center gap-2 w-full text-left">
                            {!open ? <IoAddCircleOutline className="scale-125 font-bold" /> :
                                <FiMinusCircle className="scale-110 font-bold" />}
                            <span className='w-32 flex gap-5 items-center'>
                                {`${month} - ${year}`}
                                {!open && <div className="border-l border-gray-400 h-7"></div>}
                            </span>

                            {!open ?
                                <div className='w-full'>
                                    <div className="flex justify-start space-x-4 w-96 gap-4 text-slate-600">
                                        <div className="text-left ">
                                            <div className='font-semibold'>Qty (MT)</div>
                                            <div>
                                                {(() => {
                                                    const purchase = data.reduce(
                                                        (sum, row) => sum + (Number(row.purchase) || 0), 0);

                                                    return (
                                                        <NumericFormat
                                                            value={purchase}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative
                                                            prefix=""
                                                            decimalScale='3' fixedDecimalScale
                                                            className="text-[0.8rem] text-slate-600 font-normal"
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <div className='font-semibold'>Total Margin</div>
                                            <div>
                                                {(() => {
                                                    const totalMargin = data.reduce(
                                                        (sum, row) => sum + (row?.gis
                                                            ? Number(row?.totalMargin) / 2 || 0
                                                            : Number(row?.totalMargin) || 0), 0);

                                                    return (
                                                        <NumericFormat
                                                            value={totalMargin}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative
                                                            prefix="$"
                                                            decimalScale='2'
                                                            fixedDecimalScale
                                                            className="text-[0.8rem] text-slate-600 font-normal"
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <div className='font-semibold'>Open Ship</div>
                                            <div>
                                                {(() => {
                                                    const totalOpenShip = data.reduce(
                                                        (sum, row) => sum + (Number(row.openShip) || 0), 0);

                                                    return (
                                                        <NumericFormat
                                                            value={totalOpenShip}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative
                                                            prefix=""
                                                            decimalScale={totalOpenShip === 0 ? 0 : 3}
                                                            fixedDecimalScale
                                                            className="text-[0.8rem] text-slate-600 font-normal"
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <div className='font-semibold'>Remaining</div>
                                            <div>
                                                {(() => {
                                                    const remaining = data.reduce(
                                                        (sum, row) => sum + (row?.gis
                                                            ? Number(row?.remaining) / 2 || 0
                                                            : Number(row?.remaining) || 0), 0);

                                                    return (
                                                        <NumericFormat
                                                            value={remaining}
                                                            displayType="text"
                                                            thousandSeparator
                                                            allowNegative
                                                            prefix="$"
                                                            decimalScale={remaining === 0 ? 0 : 2}
                                                            fixedDecimalScale
                                                            className="text-[0.8rem] text-slate-600 font-normal"
                                                        />
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                :
                                ''
                            }
                        </DisclosureButton>

                        <button
                            className="whiteButton py-0.5 relative"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevents triggering DisclosureButton
                                addItem(month);
                            }}
                        >
                            Add
                        </button>
                        {/* <button
                            className="whiteButton py-0.5 relative"
                            onClick={(e) => { saveItem(month) }}
                        >
                            Save
                        </button> */}
                    </div>
                    <div className="">

                        <DisclosurePanel
                            transition
                            className="p-2 origin-top transition duration-100 ease-out data-[closed]:-translate-y-6 data-[closed]:opacity-0"
                        >
                            <Customtable  {...props} />
                        </DisclosurePanel>

                    </div>
                </>
            )}

        </Disclosure>
    )
}

export default MarginTable
