
import { NumericFormat } from "react-number-format";

const ThirdPart = ({ data, remaining, outStandingShip, purchase, totalMargin, yr, title }) => {

    return (
        <div className="w-full p-2 mt-6">
            {/* Import Poppins font and apply consistent styling exactly like newTable */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                
                .margins-table, .margins-table * {
                    font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;           
                    transition-duration: 150ms !important;
                    transition-timing-function: ease-in-out !important;
                }

                /* Add border, background, and text alignment styles for table cells */
                .margins-table th, .margins-table td {
                    
                    background-color: #f9f9f9;
                    text-align: center;
                    vertical-align: middle;
                  font-size: 10px !important;
                    padding: 6px;
                    border-radius: 4px;
                }

                .margins-table th {
                    background-color: #d4eafc;
                }

                .margins-table td {
                    background-color: #fff;
                    border: 1px solid #e0e0e0;
                }
            `}</style>

            {/* Title with consistent typography - same as newTable empty state */}
            <h1 
                className="mb-2 margins-table"
                style={{ 
                    color: 'var(--endeavour)',
                    fontSize: '15px',
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
                        background: '#d4eafc',
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
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid #b8ddf8'
                                            }}
                                        >
                                            Months
                                        </th>
                                        <th
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid #b8ddf8'
                                            }}
                                        >
                                            Purchased quantity (MT)
                                        </th>
                                        <th
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid #b8ddf8'
                                            }}
                                        >
                                            Profit
                                        </th>
                                        <th
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center',
                                                borderRadius: '12px',
                                                border: '1px solid #b8ddf8'
                                            }}
                                        >
                                            Outstanding shipment
                                        </th>
                                        <th
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
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
                                                    color: '#1F2937',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 text-[11px] font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl  transition-all duration-200 ease-in-out  bg-[#e3f3ff]   fade-in">
                                                    {z.month + "-" + yr}
                                                </div>
                                            </td>
                                            
                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: '#1F2937',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 text-[11px] font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out bg-[#f9f9f9]  hover:shadow-[inset_0_0_0_1px_#d1d1d1] fade-in">
                                                    <NumericFormat
                                                        value={z.purchase}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        decimalScale={!Number.isInteger(z.purchase) && '2'}
                                                        fixedDecimalScale
                                                        className="text-[11px]"
                                                    />
                                                </div>
                                            </td>

                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: '#1F2937',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 text-[11px] font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out bg-[#f9f9f9]  hover:shadow-[inset_0_0_0_1px_#d1d1d1]  fade-in">
                                                    <NumericFormat
                                                        value={z.totalMargin}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={'$'}
                                                        decimalScale="2"
                                                        fixedDecimalScale
                                                        className="text-[11px]"
                                                    />
                                                </div>
                                            </td>

                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: '#1F2937',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 text-[11px] font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out bg-[#f9f9f9]  hover:shadow-[inset_0_0_0_1px_#d1d1d1] fade-in">
                                                    <NumericFormat
                                                        value={z.openShip}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        decimalScale={!Number.isInteger(z.openShip) && '2'}
                                                        fixedDecimalScale
                                                        className="text-[11px]"
                                                    />
                                                </div>
                                            </td>

                                            <td
                                                className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                                style={{
                                                    color: '#1F2937',
                                                    minWidth: '60px',
                                                    maxWidth: '110px',
                                                    fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                    fontWeight: '400',
                                                    zIndex: 1,
                                                    willChange: 'background-color, color',
                                                }}
                                            >
                                                <div className="px-2 py-1 text-[11px] font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out bg-[#f9f9f9]  hover:shadow-[inset_0_0_0_1px_#d1d1d1] fade-in">
                                                    <NumericFormat
                                                        value={z.remaining}
                                                        displayType="text"
                                                        thousandSeparator
                                                        allowNegative={true}
                                                        prefix={'$'}
                                                        decimalScale="2"
                                                        fixedDecimalScale
                                                        className="text-[11px]"
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
                                                fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                fontWeight: '600',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
                                            }}
                                        >
                                            <div className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent">
                                                Total
                                            </div>
                                        </td>
                                        
                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: '#1F2937',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
                                            }}
                                        >
                                            <div className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent">
                                                <NumericFormat
                                                    value={purchase}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    decimalScale={!Number.isInteger(purchase) && '2'}
                                                    fixedDecimalScale
                                                    className="text-[11px]"
                                                />
                                            </div>
                                        </td>

                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: '#1F2937',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
                                            }}
                                        >
                                            <div className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent">
                                                <NumericFormat
                                                    value={totalMargin}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    className="text-[11px]"
                                                />
                                            </div>
                                        </td>

                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: '#1F2937',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
                                            }}
                                        >
                                            <div className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent">
                                                <NumericFormat
                                                    value={outStandingShip}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    className="text-[11px]"
                                                />
                                            </div>
                                        </td>

                                        <td
                                            className="px-2 py-2 transition-colors duration-150 group/cell relative"
                                            style={{
                                                color: '#1F2937',
                                                minWidth: '60px',
                                                maxWidth: '110px',
                                                fontSize: 'clamp(11px, 1.0vw, 13px)',
                                                fontWeight: '500',
                                                zIndex: 1,
                                                willChange: 'background-color, color',
                                                background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
                                            }}
                                        >
                                            <div className="px-2 py-1 text-[11px] font-semibold flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent">
                                                <NumericFormat
                                                    value={remaining}
                                                    displayType="text"
                                                    thousandSeparator
                                                    allowNegative={true}
                                                    prefix={'$'}
                                                    decimalScale="2"
                                                    fixedDecimalScale
                                                    className="text-[11px]"
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
                                                fontSize: 'clamp(9px, 0.8vw, 10px)',
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
                                                className="uppercase tracking-wider font-normal" 
                                                style={{ 
                                                    color: '#6B7280',
                                                    fontSize: 'clamp(6px, 0.6vw, 7px)' 
                                                }}
                                            >
                                                Month
                                            </div>
                                            <div 
                                                className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                                style={{ 
                                                    color: '#1F2937',
                                                    background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                    fontSize: 'clamp(8px, 0.7vw, 10px)',
                                                    border: '1px solid #E5E7EB'
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
                                                className="uppercase tracking-wider font-normal" 
                                                style={{ 
                                                    color: '#6B7280',
                                                    fontSize: 'clamp(6px, 0.6vw, 7px)' 
                                                }}
                                            >
                                                Purchase
                                            </div>
                                            <div 
                                                className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                                style={{ 
                                                    color: '#1F2937',
                                                    background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                    fontSize: 'clamp(8px, 0.7vw, 10px)',
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
                                                className="uppercase tracking-wider font-normal" 
                                                style={{ 
                                                    color: '#6B7280',
                                                    fontSize: 'clamp(6px, 0.6vw, 7px)' 
                                                }}
                                            >
                                                Profit
                                            </div>
                                            <div 
                                                className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                                style={{ 
                                                    color: '#1F2937',
                                                    background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                    fontSize: 'clamp(8px, 0.7vw, 10px)',
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
                                        background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))',
                                    }}
                                >
                                    <span 
                                        className="font-semibold"
                                        style={{ 
                                            fontSize: 'clamp(9px, 0.8vw, 10px)',
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
                                            className="uppercase tracking-wider font-normal" 
                                            style={{ 
                                                color: '#6B7280',
                                                fontSize: 'clamp(6px, 0.6vw, 7px)' 
                                            }}
                                        >
                                            Total Purchase
                                        </div>
                                        <div 
                                            className="font-semibold break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: '#1F2937',
                                                background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                fontSize: 'clamp(8px, 0.7vw, 10px)',
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
                                            className="uppercase tracking-wider font-normal" 
                                            style={{ 
                                                color: '#6B7280',
                                                fontSize: 'clamp(6px, 0.6vw, 7px)' 
                                            }}
                                        >
                                            Total Profit
                                        </div>
                                        <div 
                                            className="font-semibold break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: '#1F2937',
                                                background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                fontSize: 'clamp(8px, 0.7vw, 10px)',
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
                                            className="uppercase tracking-wider font-normal" 
                                            style={{ 
                                                color: '#6B7280',
                                                fontSize: 'clamp(6px, 0.6vw, 7px)' 
                                            }}
                                        >
                                            Outstanding Shipment
                                        </div>
                                        <div 
                                            className="font-semibold break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: '#1F2937',
                                                background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                fontSize: 'clamp(8px, 0.7vw, 10px)',
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
                                            className="uppercase tracking-wider font-normal" 
                                            style={{ 
                                                color: '#6B7280',
                                                fontSize: 'clamp(6px, 0.6vw, 7px)' 
                                            }}
                                        >
                                            Remaining
                                        </div>
                                        <div 
                                            className="font-semibold break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                                            style={{ 
                                                color: '#1F2937',
                                                background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                                                fontSize: 'clamp(8px, 0.7vw, 10px)',
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