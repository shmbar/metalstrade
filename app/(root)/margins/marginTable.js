import React from 'react'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { IoAddCircleOutline } from "react-icons/io5";
import { FiMinusCircle, FiTrash2 } from "react-icons/fi";
import Customtable from './newTable';
import { NumericFormat } from "react-number-format";

const MarginTable = (props) => {
    let { month, year, addItem, deleteMonth } = props
    let data = props.items

    // Calculate summary values
    const purchase = data.reduce((sum, row) => sum + (Number(row.purchase) || 0), 0);
    const totalMargin = data.reduce((sum, row) => sum + (row?.gis ? Number(row?.totalMargin) / 2 || 0 : Number(row?.totalMargin) || 0), 0);
    const totalOpenShip = data.reduce((sum, row) => sum + (Number(row.openShip) || 0), 0);
    const remaining = data.reduce((sum, row) => sum + (row?.gis ? Number(row?.remaining) / 2 || 0 : Number(row?.remaining) || 0), 0);

    return (
        <div className="w-full p-1 mt-3">
            {/* Import Poppins font and apply consistent styling exactly like newTable */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                
                .margin-card, .margin-card * {
                    font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
                    transition-property: color, background-color, border-color, box-shadow !important;
                    transition-duration: 150ms !important;
                    transition-timing-function: ease-in-out !important;
                }
            `}</style>

            <Disclosure 
                as="div" 
                className="margin-card w-full overflow-visible"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(250, 250, 250, 0.90) 50%, rgba(255, 255, 255, 0.85) 100%)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06), 0 0 1px rgba(99, 102, 241, 0.08) inset',
                    marginBottom: '12px',
                    padding: '8px'
                }}
            >
                {({ open }) => (
                    <>
                        {/* Compact Header Row */}
                        <div 
                            className="flex flex-wrap items-center gap-2 mb-2"
                            style={{
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))',
                                padding: '6px 8px',
                                borderRadius: '12px',
                                marginBottom: '8px',
                                minHeight: '40px'
                            }}
                        >
                            <div className="bg-[#e3f3ff] rounded-full px-3 py-1 flex items-center gap-2 w-fit">

  <DisclosureButton className="flex items-center justify-center hover:opacity-80 transition-all">
    {!open ? (
      <IoAddCircleOutline
        className="text-[14px]"
        style={{ color: '#183d79' }}
      />
    ) : (
      <FiMinusCircle
        className="text-[14px]"
        style={{ color: '#183d79' }}
      />
    )}
  </DisclosureButton>

  <span
    className="text-[#183d79] text-[13px]"
  >
    {`${month}-${year}`}
  </span>

</div>

                            <div className="flex-1 min-w-[280px]">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="text-center">
                                        <div 
                                            className="font-normal uppercase tracking-wider mb-0.5"
                                            style={{
                                                color: '#005b9f',
                                                fontSize: 'clamp(11px, 0.6vw, 8px)',
                                                letterSpacing: '0.05em',
                                                lineHeight: '1.1'
                                            }}
                                        >
                                            Qty (MT)
                                        </div>
                                        <div 
                                            className="font-normal"
                                            style={{
                                                color: '#005b9f',
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
                                            className="font-normal uppercase tracking-wider mb-0.5"
                                            style={{
                                                color: '#005b9f',
                                                fontSize: 'clamp(11px, 0.6vw, 8px)',
                                                letterSpacing: '0.05em',
                                                lineHeight: '1.1'
                                            }}
                                        >
                                            Total Margin
                                        </div>
                                        <div 
                                            className="font-normal"
                                            style={{
                                                color: '#005b9f',
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
                                            className="font-normal uppercase tracking-wider mb-0.5"
                                            style={{
                                                color: '#005b9f',
                                                fontSize: 'clamp(11px, 0.6vw, 8px)',
                                                letterSpacing: '0.05em',
                                                lineHeight: '1.1'
                                            }}
                                        >
                                            Open Ship
                                        </div>
                                        <div 
                                            className="font-normal"
                                            style={{
                                                color: '#005b9f',
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
                                            className="font-normal uppercase tracking-wider mb-0.5"
                                            style={{
                                                color: '#005b9f',
                                                fontSize: 'clamp(11px, 0.6vw, 8px)',
                                                letterSpacing: '0.05em',
                                                lineHeight: '1.1'
                                            }}
                                        >
                                            Remaining
                                        </div>
                                        <div 
                                            className="font-normal"
                                            style={{
                                                color: '#005b9f',
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
                                        background: 'linear-gradient(135deg, #183d79, #1e40af)',
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
