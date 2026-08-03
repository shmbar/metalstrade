
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

                /* Add border, background, and text alignment styles for table cells */
                .margins-table th, .margins-table td {
                    background-color: var(--surface-pill);
                    text-align: center;
                    vertical-align: middle;
                    font-family: var(--font-poppins), 'Poppins', sans-serif;
                    padding: 6px;
                    border-radius: 4px;
                }

                .margins-table th {
                    background-color: var(--surface-header);
                    color: var(--chathams-blue);
                    font-weight: 500;
                }

                .margins-table td {
                    background-color: var(--surface-card);
                    border: 1px solid var(--selago);
                    color: var(--chathams-blue);
                }
            `}</style>

            {/* Title with consistent typography - same as newTable empty state */}
            <h1
                className="mb-2 margins-table responsiveText"
                style={{
                    color: 'var(--chathams-blue)',
                    fontWeight: '400'
                }}
            >
                {title}:
            </h1>

            {/* Main container with consistent styling matching newTable */}
            <div 
                className="w-full margins-table"
                style={{
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 1px rgba(99, 102, 241, 0.1) inset',
                    overflow: 'hidden'
                }}
            >
                {/* Header section matching newTable */}
                <div
                    className="flex-shrink-0"
                    style={{
                        borderBottom: '2px solid var(--border-divider)',
                        background: 'var(--selago)',
                        borderTopLeftRadius: '24px',
                        borderTopRightRadius: '24px'
                    }}
                >
                    {/* Desktop table container matching newTable exactly */}
                    <div className="hidden md:block">
                        <div 
                            className="overflow-auto"
                           
                        >
                            <table className="w-full rounded-2xl" style={{ tableLayout: 'auto', borderSpacing: '6px' }}>
                                {/* THEAD - matching newTable header exactly */}
                                <thead className="sticky top-0 z-10">
                                    <tr>
                                        <th
                                            className="px-2 py-2 text-center text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '45px',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-divider)'
                                            }}
                                        >
                                            Months
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '40px',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-divider)'
                                            }}
                                        >
                                            Purchased quantity (MT)
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '105px',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-divider)'
                                            }}
                                        >
                                            Profit
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '45px',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-divider)'
                                            }}
                                        >
                                            Outstanding shipment
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-divider)'
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
                                                    color: 'var(--chathams-blue)',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[50px] text-center whitespace-nowrap border border-[var(--border-cell)] rounded-lg transition-all duration-200 ease-in-out bg-[var(--surface-header)] text-[var(--chathams-blue)] fade-in">
                                                    {z.month + "-" + yr}
                                                </div>
                                            </td>
                                            
                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: 'var(--chathams-blue)',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[40px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] transition-all duration-200 ease-in-out bg-[var(--surface-pill)] fade-in">
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
                                                    color: 'var(--chathams-blue)',
                                                    minWidth: '105px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                {isGIS ? (
                                                <Tltip direction="top" tltpText={"IMS: " + addComma(z.totalMargin / 2)}>
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[105px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] transition-all duration-200 ease-in-out bg-[var(--surface-pill)]  hover:shadow-[inset_0_0_0_1px_var(--border-neutral-strong)]  fade-in">
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
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[105px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] transition-all duration-200 ease-in-out bg-[var(--surface-pill)]  hover:shadow-[inset_0_0_0_1px_var(--border-neutral-strong)]  fade-in">
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
                                                    color: 'var(--chathams-blue)',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[50px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] transition-all duration-200 ease-in-out bg-[var(--surface-pill)] fade-in">
                                                    <NumericFormat
                                                        value={z.openShip}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        decimalScale={!Number.isInteger(z.openShip) && '2'}
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
                                                        style={{ color: Number(z.openShip) > 0 ? 'var(--danger-text)' : undefined }}
                                                    />
                                                </div>
                                            </td>

                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: 'var(--chathams-blue)',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                {isGIS ? (
                                                <Tltip direction="top" tltpText={"IMS: " + addComma(z.remaining / 2)}>
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] transition-all duration-200 ease-in-out bg-[var(--surface-pill)] fade-in">
                                                    <NumericFormat
                                                        value={z.remaining}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={'$'}
                                                        decimalScale="2"
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
                                                        style={{ color: Number(z.remaining) > 0 ? 'var(--danger-text)' : undefined }}
                                                    />
                                                </div>
                                                </Tltip>
                                                ) : (
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] transition-all duration-200 ease-in-out bg-[var(--surface-pill)] fade-in">
                                                    <NumericFormat
                                                        value={z.remaining}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={'$'}
                                                        decimalScale="2"
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
                                                        style={{ color: Number(z.remaining) > 0 ? 'var(--danger-text)' : undefined }}
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
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontWeight: '600',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'var(--surface-header)'
                                            }}
                                        >
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[50px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]">
                                                Total
                                            </div>
                                        </td>

                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'var(--surface-header)'
                                            }}
                                        >
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[40px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]">
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
                                                color: 'var(--chathams-blue)',
                                                minWidth: '105px',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'var(--surface-header)'
                                            }}
                                        >
                                            {isGIS ? (
                                            <Tltip direction="top" tltpText={"IMS: " + addComma(totalMargin / 2)}>
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[105px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]">
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
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[105px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]">
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
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'var(--surface-header)'
                                            }}
                                        >
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[50px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]">
                                                <NumericFormat
                                                    value={outStandingShip}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    style={{ color: Number(outStandingShip) > 0 ? 'var(--danger-text)' : undefined }}
                                                />
                                            </div>
                                        </td>

                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'var(--surface-header)'
                                            }}
                                        >
                                            {isGIS ? (
                                            <Tltip direction="top" tltpText={"IMS: " + addComma(remaining / 2)}>
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]">
                                                <NumericFormat
                                                    value={remaining}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    style={{ color: Number(remaining) > 0 ? 'var(--danger-text)' : undefined }}
                                                />
                                            </div>
                                            </Tltip>
                                            ) : (
                                            <div className="px-2 py-1 font-medium flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[var(--border-cell)] text-[0.72rem] xl:text-[0.75rem] 2xl:text-[0.8rem] 3xl:text-[0.875rem]">
                                                <NumericFormat
                                                    value={remaining}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    style={{ color: Number(remaining) > 0 ? 'var(--danger-text)' : undefined }}
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
                                    className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                                    style={{
                                        backgroundColor: 'var(--surface-card)',
                                        border: '1px solid var(--border-divider)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
                                    }}
                                >
                                    {/* Card Header */}
                                    <div
                                        className="px-3 py-2 flex items-center justify-between"
                                        style={{
                                            background: 'var(--surface-header)',
                                        }}
                                    >
                                        <span 
                                            className="font-normal"
                                            style={{ 
                                                fontSize: 'var(--fs-table)',
                                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                                            }}
                                        >
                                            Row {i + 1}
                                        </span>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-4 space-y-2.5">
                                        <div 
                                            className="flex flex-col space-y-1.5 pb-2.5"
                                            style={{ borderBottom: '1px solid var(--border-divider)' }}
                                        >
                                            <div 
                                                className="font-medium" 
                                                style={{ 
                                                    color: 'var(--regent-gray)',
                                                    fontSize: 'var(--fs-caption)' 
                                                }}
                                            >
                                                Month
                                            </div>
                                            <div
                                                className="font-normal break-words px-2 py-1 rounded-2xl leading-relaxed min-h-[28px] flex items-center shadow-sm"
                                                style={{
                                                    color: 'var(--endeavour)',
                                                    background: 'var(--surface-header)',
                                                    fontSize: 'var(--fs-table)',
                                                    border: '1px solid var(--border-divider)'
                                                }}
                                            >
                                                {z.month + "-" + yr}
                                            </div>
                                        </div>

                                        <div 
                                            className="flex flex-col space-y-1.5 pb-2.5"
                                            style={{ borderBottom: '1px solid var(--border-divider)' }}
                                        >
                                            <div 
                                                className="font-medium" 
                                                style={{ 
                                                    color: 'var(--regent-gray)',
                                                    fontSize: 'var(--fs-caption)' 
                                                }}
                                            >
                                                Purchase
                                            </div>
                                            <div 
                                                className="font-normal break-words px-2 py-1 rounded-2xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                                style={{ 
                                                    color: 'var(--chathams-blue)',
                                                    background: 'linear-gradient(135deg, var(--surface-base), var(--surface-muted))',
                                                    fontSize: 'var(--fs-table)',
                                                    border: '1px solid var(--border-divider)'
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
                                            style={{ borderBottom: '1px solid var(--border-divider)' }}
                                        >
                                            <div 
                                                className="font-medium" 
                                                style={{ 
                                                    color: 'var(--regent-gray)',
                                                    fontSize: 'var(--fs-caption)' 
                                                }}
                                            >
                                                Profit
                                            </div>
                                            <div 
                                                className="font-normal break-words px-2 py-1 rounded-2xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                                style={{ 
                                                    color: 'var(--chathams-blue)',
                                                    background: 'linear-gradient(135deg, var(--surface-base), var(--surface-muted))',
                                                    fontSize: 'var(--fs-table)',
                                                    border: '1px solid var(--border-divider)'
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
                                className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                                style={{
                                    backgroundColor: 'var(--surface-card)',
                                    border: '2px solid var(--chathams-blue)',
                                    boxShadow: '0 8px 24px rgba(24, 61, 121, 0.15)'
                                }}
                            >
                                {/* Totals Card Header */}
                                <div 
                                    className="px-3 py-2 flex items-center justify-center"
                                    style={{ 
                                        background: 'var(--surface-header)',
                                    }}
                                >
                                    <span 
                                        className="font-medium"
                                        style={{ 
                                            fontSize: 'var(--fs-table)',
                                            color: 'var(--chathams-blue)'
                                        }}
                                    >
                                        TOTALS
                                    </span>
                                </div>

                                {/* Totals Card Content */}
                                <div className="p-4 space-y-2.5">
                                    <div 
                                        className="flex flex-col space-y-1.5 pb-2.5"
                                        style={{ borderBottom: '1px solid var(--border-divider)' }}
                                    >
                                        <div 
                                            className="font-medium" 
                                            style={{ 
                                                color: 'var(--regent-gray)',
                                                fontSize: 'var(--fs-caption)' 
                                            }}
                                        >
                                            Total Purchase
                                        </div>
                                        <div 
                                            className="font-medium break-words px-2 py-1 rounded-2xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--chathams-blue)',
                                                background: 'linear-gradient(135deg, var(--surface-base), var(--surface-muted))',
                                                fontSize: 'var(--fs-table)',
                                                border: '1px solid var(--border-divider)'
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
                                        style={{ borderBottom: '1px solid var(--border-divider)' }}
                                    >
                                        <div 
                                            className="font-medium" 
                                            style={{ 
                                                color: 'var(--regent-gray)',
                                                fontSize: 'var(--fs-caption)' 
                                            }}
                                        >
                                            Total Profit
                                        </div>
                                        <div 
                                            className="font-medium break-words px-2 py-1 rounded-2xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--chathams-blue)',
                                                background: 'linear-gradient(135deg, var(--surface-base), var(--surface-muted))',
                                                fontSize: 'var(--fs-table)',
                                                border: '1px solid var(--border-divider)'
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
                                        style={{ borderBottom: '1px solid var(--border-divider)' }}
                                    >
                                        <div 
                                            className="font-medium" 
                                            style={{ 
                                                color: 'var(--regent-gray)',
                                                fontSize: 'var(--fs-caption)' 
                                            }}
                                        >
                                            Outstanding Shipment
                                        </div>
                                        <div 
                                            className="font-medium break-words px-2 py-1 rounded-2xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--chathams-blue)',
                                                background: 'linear-gradient(135deg, var(--surface-base), var(--surface-muted))',
                                                fontSize: 'var(--fs-table)',
                                                border: '1px solid var(--border-divider)'
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
                                                color: 'var(--regent-gray)',
                                                fontSize: 'var(--fs-caption)' 
                                            }}
                                        >
                                            Remaining
                                        </div>
                                        <div 
                                            className="font-medium break-words px-2 py-1 rounded-2xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--chathams-blue)',
                                                background: 'linear-gradient(135deg, var(--surface-base), var(--surface-muted))',
                                                fontSize: 'var(--fs-table)',
                                                border: '1px solid var(--border-divider)'
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
                                                style={{ color: Number(remaining) > 0 ? 'var(--danger-text)' : undefined }}
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