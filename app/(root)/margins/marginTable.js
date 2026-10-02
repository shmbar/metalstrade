import React, { memo } from 'react'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { IoAddCircleOutline } from "react-icons/io5";
import { FiMinusCircle, FiTrash2 } from "react-icons/fi";
import Customtable from './newTable';
import { NumericFormat } from "react-number-format";
import { BtnIcon } from '../../../components/buttonIcons';

/* One figure of a folded month: label and value on ONE line.
   They were stacked, which made a folded month 48px tall — nine of them, plus the
   page header, still ran a 768px screen over. Inline they sit in the 28px band the
   Add button already sets. flex-wrap puts the value back under its label by itself
   where a cell is too narrow to hold both (the two-column phone layout). */
const Figure = ({ label, children }) => (
    <div className="flex flex-wrap items-baseline justify-center gap-x-2 text-center responsiveText font-medium">
        <span className="font-sans" style={{ color: 'var(--brand)' }}>{label}</span>
        <span>{children}</span>
    </div>
);

const MarginTable = memo(function MarginTable(props) {
    let { month, year, addItem, deleteMonth, openMonth } = props
    let data = props.items

    /* Folding is this person's view (margins/useMonthFolds), not the month's data.
       This wrote `openMonth` to the month's Firestore document and into the list the
       page autosaves — so folding a month folded it for everyone in the workspace. */
    const saveOpenClose = (status) => props.onToggleMonth?.(month, status)

    // Calculate summary values
    const purchase = data.reduce((sum, row) => sum + (Number(row.purchase) || 0), 0);
    const totalMargin = data.reduce((sum, row) => sum + (row?.gis ? Number(row?.totalMargin) / 2 || 0 : Number(row?.totalMargin) || 0), 0);
    const totalOpenShip = data.reduce((sum, row) => sum + (Number(row.openShip) || 0), 0);
    const remaining = data.reduce((sum, row) => sum + (row?.gis ? Number(row?.remaining) / 2 || 0 : Number(row?.remaining) || 0), 0);

    return (
        <div className="w-full">
            <Disclosure
                key={`${month}-${openMonth}`}
                as="div"
                defaultOpen={openMonth === true}
                className="margin-card w-full overflow-visible"
                style={{
                    background: "var(--bg-card)",
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    marginBottom: '0px',
                    padding: '2px 8px'
                }}
            >
                {({ open }) => (
                    <>
                        {/* Compact Header Row */}
                        <div 
                            className="flex flex-wrap items-center gap-2 mb-2"
                            style={{
                                background: "var(--bg-card)",
                                padding: '1px 4px',
                                borderRadius: '8px',
                                marginBottom: '0px',
                                minHeight: '30px'
                            }}
                        >
                            <div className="bg-[var(--bg-subtle)] rounded-lg px-3 py-0.5 flex items-center gap-2 w-fit">

  <DisclosureButton aria-label={open ? 'Hide this month' : 'Show this month'} className="flex items-center justify-center hover:opacity-80 transition-all" onClick={() => saveOpenClose(!open)}>
    {!open ? (
      <IoAddCircleOutline
        className="responsiveTextTitle"
        style={{ color: 'var(--ink)' }}
      />
    ) : (
      <FiMinusCircle
        className="responsiveTextTitle"
        style={{ color: 'var(--ink)' }}
      />
    )}
  </DisclosureButton>

  <span
    className="text-[var(--ink)] responsiveText font-medium"
  >
    {`${month}-${year}`}
  </span>

</div>

                            {!open && (
                            <div className="flex-1 min-w-[280px]">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <Figure label="Qty (MT)">
                                        <NumericFormat
                                            value={purchase}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative
                                            decimalScale={3}
                                            fixedDecimalScale
                                            style={{
                                                color: 'var(--ink)',
                                                lineHeight: '1.2'
                                            }}
                                        />
                                    </Figure>
                                    <Figure label="Total Margin">
                                        <NumericFormat
                                            value={totalMargin}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative
                                            prefix="$"
                                            decimalScale={2}
                                            fixedDecimalScale
                                            style={{
                                                color: 'var(--ink)',
                                                lineHeight: '1.2'
                                            }}
                                        />
                                    </Figure>
                                    <Figure label="Open Ship">
                                        <NumericFormat
                                            value={totalOpenShip}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative
                                            decimalScale={3}
                                            fixedDecimalScale
                                            style={{
                                                color: totalOpenShip > 0 ? 'var(--bad-text)' : 'var(--ink)',
                                                lineHeight: '1.2'
                                            }}
                                        />
                                    </Figure>
                                    <Figure label="Remaining">
                                        <NumericFormat
                                            value={remaining}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative
                                            prefix="$"
                                            decimalScale={2}
                                            fixedDecimalScale
                                            style={{
                                                color: remaining > 0 ? 'var(--bad-text)' : 'var(--ink)',
                                                lineHeight: '1.2'
                                            }}
                                        />
                                    </Figure>
                                </div>
                            </div>
                            )}

                            <div className="flex items-center gap-1.5">
                                <button
                                    className="whiteButton"
                                    /* A folded month opens to show the row it was just given —
                                       on a 14-inch laptop every month starts folded, and the new
                                       row would otherwise land out of sight. */
                                    onClick={() => { addItem(month); if (!open) saveOpenClose(true); }}
                                >
                                    <BtnIcon action="add" />Add
                                </button>
                                <button
                                    className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-[var(--bad-bg)]"
                                    onClick={() => deleteMonth(month)}
                                    title="Delete month"
                                    style={{
                                        color: 'var(--bad-text)',
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Compact Table Container */}
                        <DisclosurePanel>
                            <div 
                                className="mt-1 w-full"
                                style={{
                                    borderTop: '1px solid var(--line)',
                                    paddingTop: '4px'
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
}, (prev, next) =>
    prev.items === next.items &&
    prev.openMonth === next.openMonth &&
    prev.settings === next.settings
);

export default MarginTable;
