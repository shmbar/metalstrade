import React from 'react'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { IoAddCircleOutline } from "react-icons/io5";
import { FiMinusCircle, FiTrash2 } from "react-icons/fi";
import Customtable from './newTable';
import { NumericFormat } from "react-number-format";
import { updateOpenMonth } from '../../../utils/utils';

const MarginTable = (props) => {
    let { month, year, addItem, deleteMonth, openMonth, uidCollection } = props
    let data = props.items

    const saveOpenClose = (status) => {
        updateOpenMonth(uidCollection, month, year, status)
        let newData = props.data.map(x => x.month === month ? { ...x, openMonth: status } : x)
        props.setData(newData)
    }

    // Calculate summary values
    const purchase = data.reduce((sum, row) => sum + (Number(row.purchase) || 0), 0);
    const totalMargin = data.reduce((sum, row) => sum + (row?.gis ? Number(row?.totalMargin) / 2 || 0 : Number(row?.totalMargin) || 0), 0);
    const totalOpenShip = data.reduce((sum, row) => sum + (Number(row.openShip) || 0), 0);
    const remaining = data.reduce((sum, row) => sum + (row?.gis ? Number(row?.remaining) / 2 || 0 : Number(row?.remaining) || 0), 0);

    return (
        <div className="w-full">
            {/* Import Poppins font and apply consistent styling exactly like newTable */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                
                .margin-card, .margin-card * {
                    font-family: var(--font-poppins), 'Plus Jakarta Sans', sans-serif;
                    transition-property: color, background-color, border-color, box-shadow !important;
                    transition-duration: 150ms !important;
                    transition-timing-function: ease-in-out !important;
                }
            `}</style>

            <Disclosure
                key={`${month}-${openMonth}`}
                as="div"
                defaultOpen={openMonth === true}
                className="margin-card w-full overflow-visible"
                style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    marginBottom: '0px',
                    padding: '4px 8px'
                }}
            >
                {({ open }) => (
                    <>
                        {/* Compact Header Row */}
                        <div 
                            className="flex flex-wrap items-center gap-2 mb-2"
                            style={{
                                background: '#ffffff',
                                padding: '2px 4px',
                                borderRadius: '8px',
                                marginBottom: '0px',
                                minHeight: '32px'
                            }}
                        >
                            <div className="bg-[#dbeeff] rounded-full px-3 py-1 flex items-center gap-2 w-fit">

  <DisclosureButton className="flex items-center justify-center hover:opacity-80 transition-all" onClick={() => saveOpenClose(!open)}>
    {!open ? (
      <IoAddCircleOutline
        className="text-[14px]"
        style={{ color: 'var(--chathams-blue)' }}
      />
    ) : (
      <FiMinusCircle
        className="text-[14px]"
        style={{ color: 'var(--chathams-blue)' }}
      />
    )}
  </DisclosureButton>

  <span
    className="text-[var(--chathams-blue)] text-[13px]"
  >
    {`${month}-${year}`}
  </span>

</div>

                            <div className="flex-1 min-w-[280px]">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="text-center">
                                        <div 
                                            className="font-medium mb-0.5 text-xs font-poppins"
                                            style={{
                                                color: 'var(--endeavour)',
                                                                                                lineHeight: '1.1'
                                            }}
                                        >
                                            Qty (MT)
                                        </div>
                                        <div 
                                            className="font-normal"
                                            style={{
                                                color: 'var(--endeavour)',
                                                fontSize: 'clamp(10px, 0.8vw, 11px)',
                                                fontWeight: '400',
                                                lineHeight: '1.2'
                                            }}
                                        >
                                            <NumericFormat
                                                value={purchase}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative
                                                decimalScale={3}
                                                fixedDecimalScale
                                            />
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <div 
                                            className="font-medium mb-0.5 text-xs font-poppins"
                                            style={{
                                                color: 'var(--endeavour)',
                                                                                                lineHeight: '1.1'
                                            }}
                                        >
                                            Total Margin
                                        </div>
                                        <div 
                                            className="font-normal"
                                            style={{
                                                color: 'var(--endeavour)',
                                                fontSize: 'clamp(10px, 0.8vw, 11px)',
                                                fontWeight: '400',
                                                lineHeight: '1.2'
                                            }}
                                        >
                                            <NumericFormat
                                                value={totalMargin}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative
                                                prefix="$"
                                                decimalScale={2}
                                                fixedDecimalScale
                                            />
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <div 
                                            className="font-medium mb-0.5 text-xs font-poppins"
                                            style={{
                                                color: 'var(--endeavour)',
                                                                                                lineHeight: '1.1'
                                            }}
                                        >
                                            Open Ship
                                        </div>
                                        <div 
                                            className="font-normal"
                                            style={{
                                                color: 'var(--endeavour)',
                                                fontSize: 'clamp(10px, 0.8vw, 11px)',
                                                fontWeight: '400',
                                                lineHeight: '1.2'
                                            }}
                                        >
                                            <NumericFormat
                                                value={totalOpenShip}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative
                                                decimalScale={3}
                                                fixedDecimalScale
                                            />
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <div 
                                            className="font-medium mb-0.5 text-xs font-poppins"
                                            style={{
                                                color: 'var(--endeavour)',
                                                                                                lineHeight: '1.1'
                                            }}
                                        >
                                            Remaining
                                        </div>
                                        <div 
                                            className="font-normal"
                                            style={{
                                                color: 'var(--endeavour)',
                                                fontSize: 'clamp(10px, 0.8vw, 11px)',
                                                fontWeight: '400',
                                                lineHeight: '1.2'
                                            }}
                                        >
                                            <NumericFormat
                                                value={remaining}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative
                                                decimalScale={2}
                                                fixedDecimalScale
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    className="px-3 py-1.5 rounded-full font-normal transition-all duration-150 hover:opacity-90"
                                    style={{
                                        background: 'var(--endeavour)',
                                        color: '#FFFFFF',
                                        fontSize: 'clamp(8px, 0.7vw, 10px)',
                                        fontWeight: '400',
                                        border: '1px solid transparent',
                                        minWidth: '45px',
                                        height: '28px',
                                        lineHeight: '1'
                                    }}
                                    onClick={() => addItem(month)}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-1px)';
                                        e.target.style.boxShadow = '0 3px 8px rgba(24, 61, 121, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                                    }}
                                >
                                    Add
                                </button>
                                <button
                                    className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-red-50"
                                    onClick={() => deleteMonth(month)}
                                    title="Delete month"
                                    style={{
                                        color: '#ef4444',
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <FiTrash2 
                                        style={{ fontSize: '14px' }}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Compact Table Container */}
                        <DisclosurePanel>
                            <div 
                                className="mt-1 w-full"
                                style={{
                                    borderTop: '1px solid #E5E7EB',
                                    paddingTop: '8px'
                                }}
                            >
                                <Customtable {...props} />
                            </div>
                        </DisclosurePanel>
                    </>
                )}
            </Disclosure>
        </div>
    );
};

export default MarginTable;
