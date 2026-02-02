// import { NumericFormat } from "react-number-format";

// const ThirdPart = ({ data, remaining, outStandingShip, purchase, totalMargin, yr, title }) => {

//     return (
//         <div className="w-full p-2 mt-6">
//             {/* Import Poppins font and apply consistent styling */}
//             <style jsx global>{`
//                 @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                
//                 .margins-table, .margins-table * {
//                     font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
//                     transition-property: color, background-color, border-color, box-shadow !important;
//                     transition-duration: 150ms !important;
//                     transition-timing-function: ease-in-out !important;
//                 }
//             `}</style>

//             {/* Title with consistent typography */}
//             <h1 
//                 className="font-normal mb-4 margins-table"
//                 style={{ 
//                     color: '#183d79',
//                     fontSize: 'clamp(14px, 1.2vw, 16px)',
//                     fontWeight: '500',
//                     letterSpacing: '0.02em'
//                 }}
//             >
//                 {title}:
//             </h1>

//             {/* Main container with consistent styling matching newTable */}
//             <div 
//                 className="w-full max-w-4xl margins-table"
//                 style={{
//                     background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(250, 250, 250, 0.90) 50%, rgba(255, 255, 255, 0.85) 100%)',
//                     backdropFilter: 'blur(16px) saturate(180%)',
//                     WebkitBackdropFilter: 'blur(16px) saturate(180%)',
//                     borderRadius: '24px',
//                     border: '1px solid #E5E7EB',
//                     boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 1px rgba(99, 102, 241, 0.1) inset',
//                     overflow: 'hidden'
//                 }}
//             >
//                 {/* Header row - matching newTable header style */}
//                 <div 
//                     className="grid grid-cols-2 sm:grid-cols-5 gap-0"
//                     style={{
//                         background: '#d4eafc',
//                         borderBottom: '2px solid #E5E7EB',
//                         padding: '8px'
//                     }}
//                 >
//                     <div 
//                         className="px-2 py-2 text-center"
//                         style={{
//                             color: '#183d79',
//                             fontSize: 'clamp(10px, 1.0vw, 13px)',
//                             fontWeight: '500',
//                             letterSpacing: '0.05em',
//                             textTransform: 'uppercase'
//                         }}
//                     >
//                         Months
//                     </div>
//                     <div 
//                         className="px-2 py-2 text-center"
//                         style={{
//                             color: '#183d79',
//                             fontSize: 'clamp(10px, 1.0vw, 13px)',
//                             fontWeight: '500',
//                             letterSpacing: '0.05em',
//                             textTransform: 'uppercase'
//                         }}
//                     >
//                         Purchased quantity (MT)
//                     </div>
//                     <div 
//                         className="px-2 py-2 text-center sm:block hidden"
//                         style={{
//                             color: '#183d79',
//                             fontSize: 'clamp(10px, 1.0vw, 13px)',
//                             fontWeight: '500',
//                             letterSpacing: '0.05em',
//                             textTransform: 'uppercase'
//                         }}
//                     >
//                         Profit
//                     </div>
//                     <div 
//                         className="px-2 py-2 text-center sm:block hidden"
//                         style={{
//                             color: '#183d79',
//                             fontSize: 'clamp(10px, 1.0vw, 13px)',
//                             fontWeight: '500',
//                             letterSpacing: '0.05em',
//                             textTransform: 'uppercase'
//                         }}
//                     >
//                         Outstanding shipment
//                     </div>
//                     <div 
//                         className="px-2 py-2 text-center sm:block hidden"
//                         style={{
//                             color: '#183d79',
//                             fontSize: 'clamp(10px, 1.0vw, 13px)',
//                             fontWeight: '500',
//                             letterSpacing: '0.05em',
//                             textTransform: 'uppercase'
//                         }}
//                     >
//                         Remaining
//                     </div>
//                 </div>

//                 {/* Data rows - matching newTable body cell style */}
//                 {data.map((z, i) => (
//                     <div 
//                         key={i} 
//                         className="grid grid-cols-2 sm:grid-cols-5 gap-0 cursor-pointer transition-colors duration-150"
//                         style={{
//                             borderBottom: '1px solid #E5E7EB',
//                             backgroundColor: '#FFFFFF'
//                         }}
//                         onMouseEnter={(e) => {
//                             e.currentTarget.style.backgroundColor = '#f9f9f9';
//                         }}
//                         onMouseLeave={(e) => {
//                             e.currentTarget.style.backgroundColor = '#FFFFFF';
//                         }}
//                     >
//                         <div 
//                             className="px-2 py-2 flex items-center justify-center"
//                             style={{
//                                 color: '#1F2937',
//                                 fontSize: 'clamp(11px, 1.0vw, 13px)',
//                                 fontWeight: '400',
//                                 border: '1px solid #e0e0e0',
//                                 backgroundColor: '#fff',
//                                 textAlign: 'center',
//                                 verticalAlign: 'middle'
//                             }}
//                         >
//                             <div className="px-2 py-1 text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out hover:bg-[#f9f9f9]  hover:shadow-[inset_0_0_0_1px_#d1d1d1] min-w-[70px]">
//                                 {z.month + "-" + yr}
//                             </div>
//                         </div>
                        
//                         <div 
//                             className="px-2 py-2 flex items-center justify-center"
//                             style={{
//                                 color: '#1F2937',
//                                 fontSize: 'clamp(11px, 1.0vw, 13px)',
//                                 fontWeight: '400',
//                                 border: '1px solid #e0e0e0',
//                                 backgroundColor: '#fff',
//                                 textAlign: 'center',
//                                 verticalAlign: 'middle'
//                             }}
//                         >
//                             <div className="px-2 py-1 text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out hover:bg-[#f9f9f9]  hover:shadow-[inset_0_0_0_1px_#d1d1d1] min-w-[70px]">
//                                 <NumericFormat
//                                     value={z.purchase}
//                                     displayType="text"
//                                     thousandSeparator
//                                     allowNegative={true}
//                                     decimalScale={!Number.isInteger(z.purchase) && '2'}
//                                     fixedDecimalScale
//                                 />
//                             </div>
//                         </div>

//                         <div 
//                             className="px-2 py-2 hidden sm:flex items-center justify-center"
//                             style={{
//                                 color: '#1F2937',
//                                 fontSize: 'clamp(11px, 1.0vw, 13px)',
//                                 fontWeight: '400',
//                                 border: '1px solid #e0e0e0',
//                                 backgroundColor: '#fff',
//                                 textAlign: 'center',
//                                 verticalAlign: 'middle'
//                             }}
//                         >
//                             <div className="px-2 py-1 text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out hover:bg-[#f9f9f9]  hover:shadow-[inset_0_0_0_1px_#d1d1d1] min-w-[70px]">
//                                 <NumericFormat
//                                     value={z.totalMargin}
//                                     displayType="text"
//                                     thousandSeparator
//                                     allowNegative={true}
//                                     prefix={'$'}
//                                     decimalScale="2"
//                                     fixedDecimalScale
//                                 />
//                             </div>
//                         </div>

//                         <div 
//                             className="px-2 py-2 hidden sm:flex items-center justify-center"
//                             style={{
//                                 color: '#1F2937',
//                                 fontSize: 'clamp(11px, 1.0vw, 13px)',
//                                 fontWeight: '400',
//                                 border: '1px solid #e0e0e0',
//                                 backgroundColor: '#fff',
//                                 textAlign: 'center',
//                                 verticalAlign: 'middle'
//                             }}
//                         >
//                             <div className="px-2 py-1 text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out hover:bg-[#f9f9f9]  hover:shadow-[inset_0_0_0_1px_#d1d1d1] min-w-[70px]">
//                                 <NumericFormat
//                                     value={z.openShip}
//                                     displayType="text"
//                                     thousandSeparator
//                                     allowNegative={true}
//                                     decimalScale={!Number.isInteger(z.openShip) && '2'}
//                                     fixedDecimalScale
//                                 />
//                             </div>
//                         </div>

//                         <div 
//                             className="px-2 py-2 hidden sm:flex items-center justify-center"
//                             style={{
//                                 color: '#1F2937',
//                                 fontSize: 'clamp(11px, 1.0vw, 13px)',
//                                 fontWeight: '400',
//                                 border: '1px solid #e0e0e0',
//                                 backgroundColor: '#fff',
//                                 textAlign: 'center',
//                                 verticalAlign: 'middle'
//                             }}
//                         >
//                             <div className="px-2 py-1 text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200 ease-in-out hover:bg-[#f9f9f9]  hover:shadow-[inset_0_0_0_1px_#d1d1d1] min-w-[70px]">
//                                 <NumericFormat
//                                     value={z.remaining}
//                                     displayType="text"
//                                     thousandSeparator
//                                     allowNegative={true}
//                                     prefix={'$'}
//                                     decimalScale="2"
//                                     fixedDecimalScale
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                 ))}

//                 {/* Totals row - matching newTable footer style */}
//                 <div 
//                     className="grid grid-cols-2 sm:grid-cols-5 gap-0"
//                     style={{
//                         background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))',
//                         borderTop: '2px solid #E5E7EB',
//                         padding: '8px'
//                     }}
//                 >
//                     <div 
//                         className="px-2 py-2 flex items-center justify-center"
//                         style={{
//                             color: '#183d79',
//                             fontSize: 'clamp(11px, 1.0vw, 13px)',
//                             fontWeight: '600',
//                             textAlign: 'center'
//                         }}
//                     >
//                         Total
//                     </div>
                    
//                     <div 
//                         className="px-2 py-2 flex items-center justify-center"
//                         style={{
//                             color: '#1F2937',
//                             fontSize: 'clamp(11px, 1.0vw, 13px)',
//                             fontWeight: '500'
//                         }}
//                     >
//                         <NumericFormat
//                             value={purchase}
//                             displayType="text"
//                             thousandSeparator
//                             allowNegative={true}
//                             decimalScale={!Number.isInteger(purchase) && '2'}
//                             fixedDecimalScale
//                         />
//                     </div>
                    
//                     <div 
//                         className="px-2 py-2 hidden sm:flex items-center justify-center"
//                         style={{
//                             color: '#1F2937',
//                             fontSize: 'clamp(11px, 1.0vw, 13px)',
//                             fontWeight: '500'
//                         }}
//                     >
//                         <NumericFormat
//                             value={totalMargin}
//                             displayType="text"
//                             thousandSeparator
//                             allowNegative={true}
//                             prefix={'$'}
//                             decimalScale="2"
//                             fixedDecimalScale
//                         />
//                     </div>
                    
//                     <div 
//                         className="px-2 py-2 hidden sm:flex items-center justify-center"
//                         style={{
//                             color: '#1F2937',
//                             fontSize: 'clamp(11px, 1.0vw, 13px)',
//                             fontWeight: '500'
//                         }}
//                     >
//                         <NumericFormat
//                             value={outStandingShip}
//                             displayType="text"
//                             thousandSeparator
//                             allowNegative={true}
//                             decimalScale="2"
//                             fixedDecimalScale
//                         />
//                     </div>
                    
//                     <div 
//                         className="px-2 py-2 hidden sm:flex items-center justify-center"
//                         style={{
//                             color: '#1F2937',
//                             fontSize: 'clamp(11px, 1.0vw, 13px)',
//                             fontWeight: '500'
//                         }}
//                     >
//                         <NumericFormat
//                             value={remaining}
//                             displayType="text"
//                             thousandSeparator
//                             allowNegative={true}
//                             prefix={'$'}
//                             decimalScale="2"
//                             fixedDecimalScale
//                         />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// }

// export default ThirdPart
import { NumericFormat } from "react-number-format";

const ThirdPart = ({ data, remaining, outStandingShip, purchase, totalMargin, yr, title }) => {

    return (
        <div className="w-full p-2 mt-6">
            {/* Import Poppins font and apply consistent styling exactly like newTable */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                
                .margins-table, .margins-table * {
                    font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
                    font-size: 10px !important;
                    transition-property: color, background-color, border-color, box-shadow !important;
                    transition-duration: 150ms !important;
                    transition-timing-function: ease-in-out !important;
                }

                /* Add border, background, and text alignment styles for table cells */
                .margins-table th, .margins-table td {
                    border: 1px solid #ccc;
                    background-color: #f9f9f9;
                    text-align: center;
                    vertical-align: middle;
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
                className="font-normal mb-2 margins-table"
                style={{ 
                    color: '#1F2937',
                    fontSize: 'clamp(12px, 1.0vw, 14px)',
                    fontWeight: '400'
                }}
            >
                {title}:
            </h1>

            {/* Main container with consistent styling matching newTable */}
            <div 
                className="w-full margins-table"
                style={{
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 1px rgba(99, 102, 241, 0.1) inset',
                }}
            >
                {/* Header section matching newTable */}
                <div 
                    className="flex-shrink-0"
                    style={{ 
                        borderBottom: '2px solid #E5E7EB',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
                    }}
                >
                    {/* Desktop table container matching newTable exactly */}
                    <div className="hidden md:block">
                        <div 
                            className="overflow-auto"
                           
                        >
                            <table className="w-full" style={{ tableLayout: 'auto' }}>
                                {/* THEAD - matching newTable header exactly */}
                                <thead className="sticky top-0 z-10">
                                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                                        <th
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: '#183d79',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center',
                                            }}
                                        >
                                            Months
                                        </th>
                                        <th
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: '#183d79',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center',
                                            }}
                                        >
                                            Purchased quantity (MT)
                                        </th>
                                        <th
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: '#183d79',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center',
                                            }}
                                        >
                                            Profit
                                        </th>
                                        <th
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: '#183d79',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center',
                                            }}
                                        >
                                            Outstanding shipment
                                        </th>
                                        <th
                                            className="px-2 py-2 uppercase text-center"
                                            style={{
                                                color: '#183d79',
                                                minWidth: '60px',
                                                fontSize: 'clamp(10px, 1.0vw, 13px)',
                                                letterSpacing: '0.05em',
                                                textAlign: 'center',
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
                                                color: '#183d79',
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
                                    border: '2px solid #183d79',
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
                                            color: '#183d79'
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