
import { NumericFormat } from "react-number-format";

const ThirdPart = ({ data, remaining, outStandingShip, purchase, totalMargin, yr, title }) => {

    return (
        <div className="w-full lg:flex-1 p-2 mt-2 overflow-x-auto">
            {/* Import Poppins font and apply consistent styling exactly like newTable */}
            <style jsx global>{`
                .margins-table, .margins-table * {
                    font-family: var(--font-poppins), 'Plus Jakarta Sans', sans-serif;
                    transition-duration: 150ms !important;
                    transition-timing-function: ease-in-out !important;
                }

                /* Add border, background, and text alignment styles for table cells */
                .margins-table th, .margins-table td {
                    background-color: #f8fbff;
                    text-align: center;
                    vertical-align: middle;
                    font-family: var(--font-poppins), 'Plus Jakarta Sans', sans-serif;
                    padding: 6px;
                    border-radius: 4px;
                }

                .margins-table th {
                    background-color: #dbeeff;
                    color: var(--chathams-blue);
                    font-weight: 600;
                }

                .margins-table td {
                    background-color: #fff;
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
                        borderBottom: '2px solid #E5E7EB',
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
                            <table className="w-full rounded-xl" style={{ tableLayout: 'auto', borderSpacing: '6px' }}>
                                {/* THEAD - matching newTable header exactly */}
                                <thead className="sticky top-0 z-10">
                                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                                        <th
                                            className="px-2 py-2 text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid #b8ddf8'
                                            }}
                                        >
                                            Months
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid #b8ddf8'
                                            }}
                                        >
                                            Purchased quantity (MT)
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid #b8ddf8'
                                            }}
                                        >
                                            Profit
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid #b8ddf8'
                                            }}
                                        >
                                            Outstanding shipment
                                        </th>
                                        <th
                                            className="px-2 py-2 text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid #b8ddf8'
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
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border border-[#d8e8f5] rounded-lg transition-all duration-200 ease-in-out bg-[#dbeeff] text-[var(--chathams-blue)] fade-in">
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
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[#d8e8f5] transition-all duration-200 ease-in-out bg-[#f8fbff] fade-in">
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
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[#d8e8f5] transition-all duration-200 ease-in-out bg-[#f8fbff]  hover:shadow-[inset_0_0_0_1px_#d1d1d1]  fade-in">
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
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[#d8e8f5] transition-all duration-200 ease-in-out bg-[#f8fbff] fade-in">
                                                    <NumericFormat
                                                        value={z.openShip}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        decimalScale={!Number.isInteger(z.openShip) && '2'}
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
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
                                                <div className="px-2 py-1 responsiveTextTable font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[#d8e8f5] transition-all duration-200 ease-in-out bg-[#f8fbff] fade-in">
                                                    <NumericFormat
                                                        value={z.remaining}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={'$'}
                                                        decimalScale="2"
                                                        fixedDecimalScale
                                                        className="responsiveTextTable"
                                                    />
                                                </div>
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
                                                background: '#dbeeff'
                                            }}
                                        >
                                            <div className="px-2 py-1 responsiveTextTable font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[#d8e8f5]">
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
                                                background: '#dbeeff'
                                            }}
                                        >
                                            <div className="px-2 py-1 responsiveTextTable font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[#d8e8f5]">
                                                <NumericFormat
                                                    value={purchase}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    decimalScale={!Number.isInteger(purchase) && '2'}
                                                    fixedDecimalScale
                                                    className="responsiveTextTable"
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
                                                background: '#dbeeff'
                                            }}
                                        >
                                            <div className="px-2 py-1 responsiveTextTable font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[#d8e8f5]">
                                                <NumericFormat
                                                    value={totalMargin}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    className="responsiveTextTable"
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
                                                background: '#dbeeff'
                                            }}
                                        >
                                            <div className="px-2 py-1 responsiveTextTable font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[#d8e8f5]">
                                                <NumericFormat
                                                    value={outStandingShip}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    className="responsiveTextTable"
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
                                                background: '#dbeeff'
                                            }}
                                        >
                                            <div className="px-2 py-1 responsiveTextTable font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-lg border-[#d8e8f5]">
                                                <NumericFormat
                                                    value={remaining}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    className="responsiveTextTable"
                                                />
                                            </div>
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
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E5E7EB',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
                                    }}
                                >
                                    {/* Card Header */}
                                    <div 
                                        className="px-3 py-2 flex items-center justify-between"
                                        style={{ 
                                            background: '#bce1ff',
                                        }}
                                    >
                                        <span 
                                            className="font-normal"
                                            style={{ 
                                                fontSize: '0.62rem',
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
                                            style={{ borderBottom: '1px solid #E5E7EB' }}
                                        >
                                            <div 
                                                className="font-medium" 
                                                style={{ 
                                                    color: 'var(--regent-gray)',
                                                    fontSize: '0.58rem' 
                                                }}
                                            >
                                                Month
                                            </div>
                                            <div 
                                                className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm"
                                                style={{
                                                    color: 'var(--endeavour)',
                                                    background: '#dbeeff',
                                                    fontSize: '0.62rem',
                                                    border: '1px solid transparent'
                                                }}
                                            >
                                                {z.month + "-" + yr}
                                            </div>
                                        </div>

                                        <div 
                                            className="flex flex-col space-y-1.5 pb-2.5"
                                            style={{ borderBottom: '1px solid #E5E7EB' }}
                                        >
                                            <div 
                                                className="font-medium" 
                                                style={{ 
                                                    color: 'var(--regent-gray)',
                                                    fontSize: '0.58rem' 
                                                }}
                                            >
                                                Purchase
                                            </div>
                                            <div 
                                                className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                                style={{ 
                                                    color: 'var(--chathams-blue)',
                                                    background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                    fontSize: '0.62rem',
                                                    border: '1px solid #E5E7EB'
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
                                            style={{ borderBottom: '1px solid #E5E7EB' }}
                                        >
                                            <div 
                                                className="font-medium" 
                                                style={{ 
                                                    color: 'var(--regent-gray)',
                                                    fontSize: '0.58rem' 
                                                }}
                                            >
                                                Profit
                                            </div>
                                            <div 
                                                className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                                style={{ 
                                                    color: 'var(--chathams-blue)',
                                                    background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                    fontSize: '0.62rem',
                                                    border: '1px solid #E5E7EB'
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
                                    backgroundColor: '#FFFFFF',
                                    border: '2px solid var(--chathams-blue)',
                                    boxShadow: '0 8px 24px rgba(24, 61, 121, 0.15)'
                                }}
                            >
                                {/* Totals Card Header */}
                                <div 
                                    className="px-3 py-2 flex items-center justify-center"
                                    style={{ 
                                        background: '#dbeeff',
                                    }}
                                >
                                    <span 
                                        className="font-semibold"
                                        style={{ 
                                            fontSize: '0.62rem',
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
                                        style={{ borderBottom: '1px solid #E5E7EB' }}
                                    >
                                        <div 
                                            className="font-medium" 
                                            style={{ 
                                                color: 'var(--regent-gray)',
                                                fontSize: '0.58rem' 
                                            }}
                                        >
                                            Total Purchase
                                        </div>
                                        <div 
                                            className="font-semibold break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--chathams-blue)',
                                                background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                fontSize: '0.62rem',
                                                border: '1px solid #E5E7EB'
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
                                        style={{ borderBottom: '1px solid #E5E7EB' }}
                                    >
                                        <div 
                                            className="font-medium" 
                                            style={{ 
                                                color: 'var(--regent-gray)',
                                                fontSize: '0.58rem' 
                                            }}
                                        >
                                            Total Profit
                                        </div>
                                        <div 
                                            className="font-semibold break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--chathams-blue)',
                                                background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                fontSize: '0.62rem',
                                                border: '1px solid #E5E7EB'
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
                                        style={{ borderBottom: '1px solid #E5E7EB' }}
                                    >
                                        <div 
                                            className="font-medium" 
                                            style={{ 
                                                color: 'var(--regent-gray)',
                                                fontSize: '0.58rem' 
                                            }}
                                        >
                                            Outstanding Shipment
                                        </div>
                                        <div 
                                            className="font-semibold break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--chathams-blue)',
                                                background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                fontSize: '0.62rem',
                                                border: '1px solid #E5E7EB'
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
                                                fontSize: '0.58rem' 
                                            }}
                                        >
                                            Remaining
                                        </div>
                                        <div 
                                            className="font-semibold break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: 'var(--chathams-blue)',
                                                background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                fontSize: '0.62rem',
                                                border: '1px solid #E5E7EB'
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