
import { NumericFormat } from "react-number-format";
import Tltip from "../../../components/tlTip";
import { addComma } from "../../../app/(root)/cashflow/funcs";

const ThirdPart = ({ data, remaining, outStandingShip, purchase, totalMargin, yr, title, isGIS }) => {

    return (
        <div className="w-full lg:flex-1 p-2 mt-2 overflow-x-auto">
            {/* Import Poppins font and apply consistent styling exactly like newTable */}
            <style jsx global>{`
                .margins-table, .margins-table * {
                    font-family: var(--font-poppins), 'Poppins', sans-serif;
                    transition-duration: 150ms !important;
                    transition-timing-function: ease-in-out !important;
                }

                .margins-table th, .margins-table td {
                    text-align: center;
                    vertical-align: middle;
                    padding: 6px;
                }

                .margins-table th {
                    background-color: var(--bg-subtle);
                    color: var(--ink-secondary);
                    font-weight: 600;
                    font-size: 0.6875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }

                .margins-table td {
                    background-color: var(--bg-card);
                    border-bottom: 1px solid var(--line);
                    color: var(--ink);
                    font-size: 0.75rem;
                }

                /* Totals row — footer treatment */
                .margins-table tbody tr:last-child td {
                    border-top: 1px solid var(--line-strong);
                    border-bottom: none;
                }
            `}</style>

            {/* Title with consistent typography - same as newTable empty state */}
            <h1
                className="mb-2 margins-table responsiveText"
                style={{
                    color: 'var(--ink)',
                    fontWeight: '400'
                }}
            >
                {title}:
            </h1>

            {/* Main container with consistent styling matching newTable */}
            <div
                className="w-full margins-table rounded-2xl border border-[var(--line)] shadow-card"
                style={{
                    overflow: 'hidden'
                }}
            >
                {/* Header section matching newTable */}
                <div
                    className="flex-shrink-0"
                    style={{
                        background: "var(--bg-card)"
                    }}
                >
                    {/* Desktop table container matching newTable exactly */}
                    <div className="hidden md:block">
                        <div 
                            className="overflow-auto"
                           
                        >
                            <table className="w-full rounded-2xl" style={{ tableLayout: 'auto', borderSpacing: '0' }}>
                                {/* THEAD - matching newTable header exactly */}
                                <thead className="sticky top-0 z-10">
                                    <tr>
                                        <th
                                            className="px-2 py-2 text-center responsiveTextInput "
                                            style={{
                                                minWidth: '45px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            Months
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center responsiveTextInput "
                                            style={{
                                                minWidth: '40px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            Purchased quantity (MT)
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center responsiveTextInput "
                                            style={{
                                                minWidth: '105px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            Profit
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center responsiveTextInput "
                                            style={{
                                                minWidth: '45px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            Outstanding shipment
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center responsiveTextInput "
                                            style={{
                                                minWidth: '60px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            Remaining
                                        </th>
                                    </tr>
                                </thead>

                                {/* TBODY - matching newTable body exactly */}
                                <tbody>
                                    {data.map((z, i) => (
                                        <tr
                                            key={i}
                                            className="cursor-pointer"
                                        >
                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: 'var(--ink)',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 responsiveTextTable font-medium flex items-center justify-center min-w-[50px] text-center whitespace-nowrap text-[var(--ink)] fade-in">
                                                    {z.month + "-" + yr}
                                                </div>
                                            </td>
                                            
                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: 'var(--ink)',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 responsiveTextTable font-medium flex items-center justify-center min-w-[40px] text-center whitespace-nowrap fade-in">
                                                    <NumericFormat
                                                        value={z.purchase}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        decimalScale={!Number.isInteger(z.purchase) && '2'}
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
                                                    />
                                                </div>
                                            </td>

                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: 'var(--ink)',
                                                    minWidth: '105px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                {isGIS ? (
                                                <Tltip direction="top" tltpText={"IMS: " + addComma(z.totalMargin / 2)}>
                                                <div className="px-2 py-1 responsiveTextTable font-medium flex items-center justify-center min-w-[105px] text-center whitespace-nowrap fade-in">
                                                    <NumericFormat
                                                        value={z.totalMargin}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={'$'}
                                                        decimalScale="2"
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
                                                    />
                                                </div>
                                                </Tltip>
                                                ) : (
                                                <div className="px-2 py-1 responsiveTextTable font-medium flex items-center justify-center min-w-[105px] text-center whitespace-nowrap fade-in">
                                                    <NumericFormat
                                                        value={z.totalMargin}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={'$'}
                                                        decimalScale="2"
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
                                                    />
                                                </div>
                                                )}
                                            </td>

                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: 'var(--ink)',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 responsiveTextTable font-medium flex items-center justify-center min-w-[50px] text-center whitespace-nowrap fade-in">
                                                    <NumericFormat
                                                        value={z.openShip}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        decimalScale={!Number.isInteger(z.openShip) && '2'}
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
                                                        style={{ color: Number(z.openShip) > 0 ? 'var(--bad-text)' : undefined }}
                                                    />
                                                </div>
                                            </td>

                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: 'var(--ink)',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                {isGIS ? (
                                                <Tltip direction="top" tltpText={"IMS: " + addComma(z.remaining / 2)}>
                                                <div className="px-2 py-1 responsiveTextTable font-medium flex items-center justify-center min-w-[70px] text-center whitespace-nowrap fade-in">
                                                    <NumericFormat
                                                        value={z.remaining}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={'$'}
                                                        decimalScale="2"
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
                                                        style={{ color: Number(z.remaining) > 0 ? 'var(--bad-text)' : undefined }}
                                                    />
                                                </div>
                                                </Tltip>
                                                ) : (
                                                <div className="px-2 py-1 responsiveTextTable font-medium flex items-center justify-center min-w-[70px] text-center whitespace-nowrap fade-in">
                                                    <NumericFormat
                                                        value={z.remaining}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={'$'}
                                                        decimalScale="2"
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
                                                        style={{ color: Number(z.remaining) > 0 ? 'var(--bad-text)' : undefined }}
                                                    />
                                                </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    
                                    {/* TOTALS ROW - matching newTable footer styling but as table row */}
                                    <tr className="cursor-pointer">
                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: 'var(--ink)',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontWeight: '600',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'var(--bg-subtle)'
                                            }}
                                        >
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[50px] text-center whitespace-nowrap responsiveTextTitle tabular-nums">
                                                Total
                                            </div>
                                        </td>

                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: 'var(--ink)',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'var(--bg-subtle)'
                                            }}
                                        >
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[40px] text-center whitespace-nowrap responsiveTextTitle tabular-nums">
                                                <NumericFormat
                                                    value={purchase}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    decimalScale={!Number.isInteger(purchase) && '2'}
                                                    fixedDecimalScale
                                                />
                                            </div>
                                        </td>

                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: 'var(--ink)',
                                                minWidth: '105px',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'var(--bg-subtle)'
                                            }}
                                        >
                                            {isGIS ? (
                                            <Tltip direction="top" tltpText={"IMS: " + addComma(totalMargin / 2)}>
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[105px] text-center whitespace-nowrap responsiveTextTitle tabular-nums">
                                                <NumericFormat
                                                    value={totalMargin}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                />
                                            </div>
                                            </Tltip>
                                            ) : (
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[105px] text-center whitespace-nowrap responsiveTextTitle tabular-nums">
                                                <NumericFormat
                                                    value={totalMargin}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                />
                                            </div>
                                            )}
                                        </td>

                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: 'var(--ink)',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'var(--bg-subtle)'
                                            }}
                                        >
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[50px] text-center whitespace-nowrap responsiveTextTitle tabular-nums">
                                                <NumericFormat
                                                    value={outStandingShip}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    style={{ color: Number(outStandingShip) > 0 ? 'var(--bad-text)' : undefined }}
                                                />
                                            </div>
                                        </td>

                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: 'var(--ink)',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'var(--bg-subtle)'
                                            }}
                                        >
                                            {isGIS ? (
                                            <Tltip direction="top" tltpText={"IMS: " + addComma(remaining / 2)}>
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[70px] text-center whitespace-nowrap responsiveTextTitle tabular-nums">
                                                <NumericFormat
                                                    value={remaining}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    style={{ color: Number(remaining) > 0 ? 'var(--bad-text)' : undefined }}
                                                />
                                            </div>
                                            </Tltip>
                                            ) : (
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[70px] text-center whitespace-nowrap responsiveTextTitle tabular-nums">
                                                <NumericFormat
                                                    value={remaining}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    style={{ color: Number(remaining) > 0 ? 'var(--bad-text)' : undefined }}
                                                />
                                            </div>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile view matching newTable card layout */}
                    <div className="block md:hidden">
                        <div className="overflow-y-auto px-2 py-2 space-y-2">
                            {data.map((z, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl overflow-hidden shadow-card transition-colors duration-200"
                                    style={{
                                        backgroundColor: "var(--bg-card)",
                                        border: '1px solid var(--line)',
                                        boxShadow: 'var(--shadow-xs)'
                                    }}
                                >
                                    {/* Card Header */}
                                    <div
                                        className="px-3 py-2 flex items-center justify-between"
                                        style={{
                                            background: 'var(--bg-subtle)',
                                        }}
                                    >
                                        <span 
                                            className="font-normal"
                                            style={{
                                                fontSize: 'var(--fs-table)',
                                                color: 'var(--ink)'
                                            }}
                                        >
                                            Row {i + 1}
                                        </span>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-4 space-y-2.5">
                                        <div 
                                            className="flex flex-col space-y-1.5 pb-2.5"
                                            style={{ borderBottom: '1px solid var(--line)' }}
                                        >
                                            <div 
                                                className="font-medium" 
                                                style={{ 
                                                    color: 'var(--ink-muted)',
                                                    fontSize: 'var(--fs-caption)' 
                                                }}
                                            >
                                                Month
                                            </div>
                                            <div
                                                className="font-normal break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm"
                                                style={{
                                                    color: 'var(--brand)',
                                                    background: 'var(--bg-subtle)',
                                                    fontSize: 'var(--fs-table)',
                                                    border: '1px solid var(--line)'
                                                }}
                                            >
                                                {z.month + "-" + yr}
                                            </div>
                                        </div>

                                        <div 
                                            className="flex flex-col space-y-1.5 pb-2.5"
                                            style={{ borderBottom: '1px solid var(--line)' }}
                                        >
                                            <div 
                                                className="font-medium" 
                                                style={{ 
                                                    color: 'var(--ink-muted)',
                                                    fontSize: 'var(--fs-caption)' 
                                                }}
                                            >
                                                Purchase
                                            </div>
                                            <div 
                                                className="font-normal break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm" 
                                                style={{ 
                                                    color: 'var(--ink)',
                                                    background: 'var(--bg-subtle)',
                                                    fontSize: 'var(--fs-table)',
                                                    border: '1px solid var(--line)'
                                                }}
                                            >
                                                <NumericFormat
                                                    value={z.purchase}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    decimalScale={!Number.isInteger(z.purchase) && '2'}
                                                    fixedDecimalScale
                                                />
                                            </div>
                                        </div>

                                        <div 
                                            className="flex flex-col space-y-1.5 pb-2.5"
                                            style={{ borderBottom: '1px solid var(--line)' }}
                                        >
                                            <div 
                                                className="font-medium" 
                                                style={{ 
                                                    color: 'var(--ink-muted)',
                                                    fontSize: 'var(--fs-caption)' 
                                                }}
                                            >
                                                Profit
                                            </div>
                                            <div 
                                                className="font-normal break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm" 
                                                style={{ 
                                                    color: 'var(--ink)',
                                                    background: 'var(--bg-subtle)',
                                                    fontSize: 'var(--fs-table)',
                                                    border: '1px solid var(--line)'
                                                }}
                                            >
                                                <NumericFormat
                                                    value={z.totalMargin}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Mobile Totals Card */}
                            <div
                                className="rounded-2xl overflow-hidden shadow-card transition-colors duration-200"
                                style={{
                                    backgroundColor: "var(--bg-card)",
                                    border: '1px solid var(--line-strong)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                {/* Totals Card Header */}
                                <div 
                                    className="px-3 py-2 flex items-center justify-center"
                                    style={{ 
                                        background: 'var(--bg-subtle)',
                                    }}
                                >
                                    <span 
                                        className="font-medium"
                                        style={{ 
                                            fontSize: 'var(--fs-table)',
                                            color: 'var(--ink)'
                                        }}
                                    >
                                        TOTALS
                                    </span>
                                </div>

                                {/* Totals Card Content */}
                                <div className="p-4 space-y-2.5">
                                    <div 
                                        className="flex flex-col space-y-1.5 pb-2.5"
                                        style={{ borderBottom: '1px solid var(--line)' }}
                                    >
                                        <div 
                                            className="font-medium" 
                                            style={{ 
                                                color: 'var(--ink-muted)',
                                                fontSize: 'var(--fs-caption)' 
                                            }}
                                        >
                                            Total Purchase
                                        </div>
                                        <div 
                                            className="font-medium break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--ink)',
                                                background: 'var(--bg-subtle)',
                                                fontSize: 'var(--fs-table)',
                                                border: '1px solid var(--line)'
                                            }}
                                        >
                                            <NumericFormat
                                                value={purchase}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                decimalScale={!Number.isInteger(purchase) && '2'}
                                                fixedDecimalScale
                                            />
                                        </div>
                                    </div>

                                    <div 
                                        className="flex flex-col space-y-1.5 pb-2.5"
                                        style={{ borderBottom: '1px solid var(--line)' }}
                                    >
                                        <div 
                                            className="font-medium" 
                                            style={{ 
                                                color: 'var(--ink-muted)',
                                                fontSize: 'var(--fs-caption)' 
                                            }}
                                        >
                                            Total Profit
                                        </div>
                                        <div 
                                            className="font-medium break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--ink)',
                                                background: 'var(--bg-subtle)',
                                                fontSize: 'var(--fs-table)',
                                                border: '1px solid var(--line)'
                                            }}
                                        >
                                            <NumericFormat
                                                value={totalMargin}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={'$'}
                                                decimalScale="2"
                                                fixedDecimalScale
                                            />
                                        </div>
                                    </div>

                                    <div 
                                        className="flex flex-col space-y-1.5 pb-2.5"
                                        style={{ borderBottom: '1px solid var(--line)' }}
                                    >
                                        <div 
                                            className="font-medium" 
                                            style={{ 
                                                color: 'var(--ink-muted)',
                                                fontSize: 'var(--fs-caption)' 
                                            }}
                                        >
                                            Outstanding Shipment
                                        </div>
                                        <div 
                                            className="font-medium break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--ink)',
                                                background: 'var(--bg-subtle)',
                                                fontSize: 'var(--fs-table)',
                                                border: '1px solid var(--line)'
                                            }}
                                        >
                                            <NumericFormat
                                                value={outStandingShip}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                decimalScale="2"
                                                fixedDecimalScale
                                            />
                                        </div>
                                    </div>

                                    <div 
                                        className="flex flex-col space-y-1.5"
                                    >
                                        <div 
                                            className="font-medium" 
                                            style={{ 
                                                color: 'var(--ink-muted)',
                                                fontSize: 'var(--fs-caption)' 
                                            }}
                                        >
                                            Remaining
                                        </div>
                                        <div 
                                            className="font-medium break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--ink)',
                                                background: 'var(--bg-subtle)',
                                                fontSize: 'var(--fs-table)',
                                                border: '1px solid var(--line)'
                                            }}
                                        >
                                            <NumericFormat
                                                value={remaining}
                                                displayType="text"
                                                thousandSeparator
                                                allowNegative={true}
                                                prefix={'$'}
                                                decimalScale="2"
                                                fixedDecimalScale
                                                style={{ color: Number(remaining) > 0 ? 'var(--bad-text)' : undefined }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ThirdPart;
