// // import { useState } from "react";

// // const CellPerc = ({ num, name, title, handleChange }) => {
// //     return (
// //         <div className={`border border-slate-500 w-24 flex flex-col justify-center ${name === 'fe' ? '' : 'border-r-0'}`}>
// //             <span className="title_style">{title}</span>
// //             <input
// //                 type="text"
// //                 className={`input_style ${name === "fe" ? "bg-slate-100" : "text-red-700"}`}
// //                 name={name}
// //                 value={
// //                     num !== undefined && num !== ""
// //                         ? (name === "fe" ? parseFloat(num).toFixed(2) + "%" : num + "%")
// //                         : "0.00%"
// //                 }
// //                 onChange={(e) => {
// //                     if (name === "fe") return; // disable editing for 'fe'
// //                     handleChange(
// //                         {
// //                             target: {
// //                                 name: e.target.name,
// //                                 value: e.target.value.replace("%", ""),
// //                             },
// //                         },
// //                         "supperalloys"
// //                     );
// //                 }}
// //                 onBlur={(e) => {
// //                     if (name === "fe") return; // no formatting for 'fe', just display
// //                     let n = parseFloat(e.target.value.replace("%", ""));
// //                     if (isNaN(n)) n = 0; // default to 0
// //                     handleChange(
// //                         {
// //                             target: {
// //                                 name: e.target.name,
// //                                 value: n.toFixed(2), // store with 2 decimals
// //                             },
// //                         },
// //                         "supperalloys"
// //                     );
// //                 }}
// //             />

// //         </div>
// //     );
// // };


// // const CellPrice = ({ num, name, title, handleChange, setFocusedField }) => {
// //     return (
// //         <div className={`border border-slate-500 w-24 flex flex-col justify-center ${name === 'fePrice' ? '' : 'border-r-0'}`}>
// //             <span className="title_style">{title}</span>
// //             <input
// //                 type="text"
// //                 className={`input_style ${name === 'niPrice' || name === 'MoOxideLb' ? 'cursor-default bg-slate-100' : 'text-red-700'} `}
// //                 name={name}
// //                 value={num}
// //                 onChange={e => handleChange({
// //                     target: {
// //                         name: e.target.name,
// //                         value: e.target.value.replace('%', ''),
// //                     },
// //                 }, 'supperalloys')}
// //                 onFocus={() => {
// //                     if (name === "niPrice" || name === 'MoOxideLb') return; // skip for niPrice
// //                     setFocusedField(name);
// //                 }}
// //                 //  onBlur={() => setFocusedField(null)}
// //                 onBlur={(e) => {
// //                     if (name === "niPrice" || name === 'MoOxideLb') return; // no formatting for 'fe', just display
// //                     let n = parseFloat(e.target.value.replace("%", ""));
// //                     setFocusedField(null)
// //                     if (isNaN(n)) n = 0; // default to 0
// //                     handleChange(
// //                         {
// //                             target: {
// //                                 name: e.target.name,
// //                                 value: n.toFixed(2), // store with 2 decimals
// //                             },
// //                         },
// //                         "supperalloys"
// //                     );
// //                 }}
// //             />
// //         </div>
// //     );
// // };

// // const SupperAlloys = ({ value, handleChange }) => {

// //     const [focusedField, setFocusedField] = useState(null);
// //     const fe = 100 - value?.supperalloys?.ni - value?.supperalloys?.cr - value?.supperalloys?.mo -
// //         value?.supperalloys?.nb - value?.supperalloys?.co - value?.supperalloys?.w -
// //         value?.supperalloys?.hf - value?.supperalloys?.ta

// //     const solidsPrice = value?.supperalloys?.ni * (value.general.nilme / value.general.mt) / 100 +
// //         value?.supperalloys?.cr * value?.supperalloys?.crPrice / 100 +
// //         value?.supperalloys?.mo * value?.supperalloys?.moPrice / 100 +
// //         value?.supperalloys?.nb * value?.supperalloys?.nbPrice / 100 +
// //         value?.supperalloys?.co * value?.supperalloys?.coPrice / 100 +
// //         value?.supperalloys?.w * value?.supperalloys?.wPrice / 100 +
// //         value?.supperalloys?.hf * value?.supperalloys?.hfPrice / 100 +
// //         value?.supperalloys?.ta * value?.supperalloys?.taPrice / 100


// //     const addComma = (nStr, z) => {
// //         nStr += '';
// //         var x = nStr.split('.');
// //         var x1 = x[0];
// //         var x2 = x.length > 1 ? '.' + x[1] : '';
// //         var rgx = /(\d+)(\d{3})/;
// //         while (rgx.test(x1)) {
// //             x1 = x1.replace(rgx, '$1,$2');
// //         }

// //         const symbol = !z ? '$' : '€'
// //         return (symbol + x1 + x2);
// //     }


// //     return (
// //         <div className='border border-slate-300 p-3 rounded-lg flex flex-col md:flex-row w-full'>
// //             <div className='justify-start'>
// //                 <p className='text-center text-slate-600 text-lg font-semibold'>Cost</p>
// //                 <p className='text-center text-slate-600 text-sm font-semibold'>Composition</p>
// //                 <div className='flex justify-center'>
// //                     <CellPerc num={value.supperalloys?.ni} name='ni' title='Ni' handleChange={handleChange} />
// //                     <CellPerc num={value?.supperalloys?.cr} name='cr' title='Cr' handleChange={handleChange} />
// //                     <CellPerc num={value?.supperalloys?.mo} name='mo' title='Mo' handleChange={handleChange} />
// //                     <CellPerc num={value?.supperalloys?.nb} name='nb' title='Nb' handleChange={handleChange} />
// //                     <CellPerc num={value?.supperalloys?.co} name='co' title='Co' handleChange={handleChange} />
// //                     <CellPerc num={value?.supperalloys?.w} name='w' title='W' handleChange={handleChange} />
// //                     <CellPerc num={value?.supperalloys?.hf} name='hf' title='Hf' handleChange={handleChange} />
// //                     <CellPerc num={value?.supperalloys?.ta} name='ta' title='Ta' handleChange={handleChange} />
// //                     <CellPerc num={fe} name='fe' title='Fe' handleChange={{}} />
// //                 </div>

// //                 <p className='text-center text-slate-600 text-sm font-semibold pt-2'>Price/Lbs</p>
// //                 <div className='flex justify-center'>
// //                     <CellPrice num={addComma((value.general.nilme / value.general.mt).toFixed(2))} name='niPrice' title='Ni' handleChange={handleChange} />
// //                     <CellPrice num={focusedField === 'crPrice' ? value.supperalloys?.crPrice : addComma(value.supperalloys?.crPrice)}
// //                         name='crPrice' title='Cr' handleChange={handleChange} setFocusedField={setFocusedField} />
// //                     <CellPrice num={addComma(value?.general?.MoOxideLb)} name='MoOxideLb' title='Mo' handleChange={handleChange} />
// //                     <CellPrice num={focusedField === 'nbPrice' ? value.supperalloys?.nbPrice : addComma(value.supperalloys?.nbPrice)}
// //                         name='nbPrice' title='Nb' handleChange={handleChange} setFocusedField={setFocusedField} />
// //                     <CellPrice num={focusedField === 'coPrice' ? value.supperalloys?.coPrice : addComma(value.supperalloys?.coPrice)}
// //                         name='coPrice' title='Co' handleChange={handleChange} setFocusedField={setFocusedField} />
// //                     <CellPrice num={focusedField === 'wPrice' ? value.supperalloys?.wPrice : addComma(value.supperalloys?.wPrice)}
// //                         name='wPrice' title='W' handleChange={handleChange} setFocusedField={setFocusedField} />
// //                     <CellPrice num={focusedField === 'hfPrice' ? value.supperalloys?.hfPrice : addComma(value.supperalloys?.hfPrice)}
// //                         name='hfPrice' title='Hf' handleChange={handleChange} setFocusedField={setFocusedField} />
// //                     <CellPrice num={focusedField === 'taPrice' ? value.supperalloys?.taPrice : addComma(value.supperalloys?.taPrice)}
// //                         name='taPrice' title='Ta' handleChange={handleChange} setFocusedField={setFocusedField} />
// //                     <CellPrice num={focusedField === 'fePrice' ? value.supperalloys?.fePrice : addComma(value.supperalloys?.fePrice)}
// //                         name='fePrice' title='Fe' handleChange={handleChange} setFocusedField={setFocusedField} />
// //                 </div>



// //                 <div className="grid-cols-2 gap-10 w-full pt-6 justify-between flex">
// //                     <div className="col-span-2 md:col-span-1 justify-center flex">

// //                         <div className=''>
// //                             <div className='border border-slate-500 w-24 flex flex-col justify-center text-center'>
// //                                 <span className='title_style bg-customOrange'> Formula Intrinsic</span>
// //                                 <input type='text' className='input_style bg-orange-200 text-red-600' value={value?.supperalloys?.formulaIntsCost + '%'}
// //                                     name='formulaIntsCost' onChange={(e) => handleChange(e, 'supperalloys')}
// //                                     onBlur={(e) => {
// //                                         let num = parseFloat(e.target.value.replace("%", ""));
// //                                         if (isNaN(num)) num = 0; // default to 0
// //                                         handleChange(
// //                                             {
// //                                                 target: {
// //                                                     name: e.target.name,
// //                                                     value: num.toFixed(2), // store with 2 decimals
// //                                                 },
// //                                             },
// //                                             "supperalloys"
// //                                         );
// //                                     }} />
// //                             </div>

// //                             <div className='pt-6 gap-5 flex items-end'>
// //                                 <div className='border border-slate-500 w-24 flex flex-col'>
// //                                     <span className='title_style bg-customLavender'>Cost</span>
// //                                     <span className='title_style'>Solids Price:</span>
// //                                     <input type='text' className='input_style bg-orange-200'
// //                                         value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100).toFixed(2))}
// //                                         name='formulaNi' onChange={(e) => { }} />
// //                                 </div>
// //                                 <div className='border border-slate-500 w-24 flex flex-col'>
// //                                     <span className='title_style bg-blue-300'>Price per MT:</span>
// //                                     <input type='text' className='input_style bg-slate-100 '
// //                                         value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100 * value.general.mt).toFixed(2))}
// //                                         name='formulaNi' onChange={(e) => { }} />
// //                                 </div>
// //                                 <div className='border border-slate-500 w-24 flex flex-col'>
// //                                     <span className='title_style'>Price/Euro:</span>
// //                                     <input type='text' className='input_style bg-customLime'
// //                                         value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100 / value.general?.euroRate).toFixed(2), 'a')}
// //                                         name='formulaNi' onChange={(e) => { }} />
// //                                 </div>
// //                             </div>
// //                             <div className='border border-slate-500 w-24 mt-4 flex flex-col'>
// //                                 <span className='title_style '>Turnings Price:</span>
// //                                 <input type='text' className='input_style bg-orange-200'
// //                                     value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100 * 0.95).toFixed(2))}
// //                                     name='formulaNi' onChange={(e) => { }} />
// //                             </div>
// //                             <div className='pt-4 text-red-600'>
// //                                 <p className="text-xs">* Fill in the red and + Formula x Ni</p>
// //                                 <p className="text-xs">* Fe is calculated automatically</p>
// //                             </div>
// //                         </div>
// //                     </div>



// //                     <div className="col-span-2 md:col-span-1 justify-center flex">
// //                         <div className='flex'>
// //                             <div className=''>
// //                                 <div className='border border-slate-500 w-24 flex flex-col justify-center'>
// //                                     <span className='title_style bg-customOrange text-center'> Formula Intrinsic</span>
// //                                     <input type='text' className='input_style bg-orange-200 text-red-600' value={value?.supperalloys?.formulaIntsPrice + '%'}
// //                                         name='formulaIntsPrice' onChange={(e) => handleChange(e, 'supperalloys')}
// //                                         onBlur={(e) => {
// //                                             let num = parseFloat(e.target.value.replace("%", ""));
// //                                             if (isNaN(num)) num = 0; // default to 0
// //                                             handleChange(
// //                                                 {
// //                                                     target: {
// //                                                         name: e.target.name,
// //                                                         value: num.toFixed(2), // store with 2 decimals
// //                                                     },
// //                                                 },
// //                                                 "supperalloys"
// //                                             );
// //                                         }} />
// //                                 </div>
// //                                 <div className='pt-6 gap-5 flex items-end'>
// //                                     <div className='border border-slate-500 w-24 flex flex-col'>
// //                                         <span className='title_style bg-customLavender'>Sales</span>
// //                                         <span className='title_style'>Solids Price:</span>
// //                                         <input type='text' className='input_style bg-orange-200 '
// //                                             value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100).toFixed(2))}
// //                                             onChange={(e) => { }} />
// //                                     </div>
// //                                     <div className='border border-slate-500 w-24 flex flex-col'>
// //                                         <span className='title_style bg-blue-300'>Price per MT:</span>
// //                                         <input type='text' className='input_style bg-slate-100 '
// //                                             value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100 * value.general.mt).toFixed(2))}
// //                                             name='formulaNi' onChange={(e) => { }} />
// //                                     </div>

// //                                     <div className='border border-slate-500 w-24 flex flex-col'>
// //                                         <span className='title_style'>Price/Euro:</span>
// //                                         <input type='text' className='input_style bg-customLime '
// //                                             value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100 / value.general?.euroRate).toFixed(2), 'a')}
// //                                             name='formulaNi' onChange={(e) => { }} />
// //                                     </div>
// //                                 </div>
// //                                 <div className='border border-slate-500 w-24 mt-4 flex flex-col'>
// //                                     <span className='title_style'>Turnings Price:</span>
// //                                     <input type='text' className='input_style bg-orange-200'
// //                                         value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100 * 0.95).toFixed(2))}
// //                                         name='formulaNi' onChange={(e) => { }} />
// //                                 </div>
// //                             </div>
// //                         </div>
// //                     </div>
// //                 </div>
// //             </div>
// //         </div>
// //     )
// // };

// // export default SupperAlloys;
// import { useState } from "react";

// const CellPerc = ({ num, name, title, handleChange }) => {
//     return (
//         <div className='border border-slate-500 min-w-[70px] sm:min-w-[80px] flex flex-col justify-center'>
//             <span className="title_style text-xs sm:text-sm">{title}</span>
//             <input
//                 type="text"
//                 className={`input_style text-xs sm:text-sm ${name === "fe" ? "bg-slate-100" : "text-red-700"}`}
//                 name={name}
//                 value={
//                     num !== undefined && num !== ""
//                         ? (name === "fe" ? parseFloat(num).toFixed(2) + "%" : num + "%")
//                         : "0.00%"
//                 }
//                 onChange={(e) => {
//                     if (name === "fe") return;
//                     handleChange(
//                         {
//                             target: {
//                                 name: e.target.name,
//                                 value: e.target.value.replace("%", ""),
//                             },
//                         },
//                         "supperalloys"
//                     );
//                 }}
//                 onBlur={(e) => {
//                     if (name === "fe") return;
//                     let n = parseFloat(e.target.value.replace("%", ""));
//                     if (isNaN(n)) n = 0;
//                     handleChange(
//                         {
//                             target: {
//                                 name: e.target.name,
//                                 value: n.toFixed(2),
//                             },
//                         },
//                         "supperalloys"
//                     );
//                 }}
//             />
//         </div>
//     );
// };

// const CellPrice = ({ num, name, title, handleChange, setFocusedField }) => {
//     return (
//         <div className='border border-slate-500 min-w-[70px] sm:min-w-[80px] flex flex-col justify-center'>
//             <span className="title_style text-xs sm:text-sm">{title}</span>
//             <input
//                 type="text"
//                 className={`input_style text-xs sm:text-sm ${name === 'niPrice' || name === 'MoOxideLb' ? 'cursor-default bg-slate-100' : 'text-red-700'}`}
//                 name={name}
//                 value={num}
//                 onChange={e => handleChange({
//                     target: {
//                         name: e.target.name,
//                         value: e.target.value.replace('%', ''),
//                     },
//                 }, 'supperalloys')}
//                 onFocus={() => {
//                     if (name === "niPrice" || name === 'MoOxideLb') return;
//                     setFocusedField(name);
//                 }}
//                 onBlur={(e) => {
//                     if (name === "niPrice" || name === 'MoOxideLb') return;
//                     let n = parseFloat(e.target.value.replace("%", ""));
//                     setFocusedField(null)
//                     if (isNaN(n)) n = 0;
//                     handleChange(
//                         {
//                             target: {
//                                 name: e.target.name,
//                                 value: n.toFixed(2),
//                             },
//                         },
//                         "supperalloys"
//                     );
//                 }}
//             />
//         </div>
//     );
// };

// const SupperAlloys = ({ value, handleChange }) => {
//     const [focusedField, setFocusedField] = useState(null);
    
//     const fe = 100 - value?.supperalloys?.ni - value?.supperalloys?.cr - value?.supperalloys?.mo -
//         value?.supperalloys?.nb - value?.supperalloys?.co - value?.supperalloys?.w -
//         value?.supperalloys?.hf - value?.supperalloys?.ta

//     const solidsPrice = value?.supperalloys?.ni * (value.general.nilme / value.general.mt) / 100 +
//         value?.supperalloys?.cr * value?.supperalloys?.crPrice / 100 +
//         value?.supperalloys?.mo * value?.supperalloys?.moPrice / 100 +
//         value?.supperalloys?.nb * value?.supperalloys?.nbPrice / 100 +
//         value?.supperalloys?.co * value?.supperalloys?.coPrice / 100 +
//         value?.supperalloys?.w * value?.supperalloys?.wPrice / 100 +
//         value?.supperalloys?.hf * value?.supperalloys?.hfPrice / 100 +
//         value?.supperalloys?.ta * value?.supperalloys?.taPrice / 100

//     const addComma = (nStr, z) => {
//         nStr += '';
//         var x = nStr.split('.');
//         var x1 = x[0];
//         var x2 = x.length > 1 ? '.' + x[1] : '';
//         var rgx = /(\d+)(\d{3})/;
//         while (rgx.test(x1)) {
//             x1 = x1.replace(rgx, '$1,$2');
//         }
//         const symbol = !z ? '$' : '€'
//         return (symbol + x1 + x2);
//     }

//     return (
//         <div className='border border-slate-300 p-2 sm:p-3 rounded-lg w-full'>
//             <div className='w-full'>
//                 <p className='text-center text-slate-600 text-base sm:text-lg font-semibold mb-3'>Cost</p>
                
//                 {/* Composition Section */}
//                 <p className='text-center text-slate-600 text-sm font-semibold mb-2'>Composition</p>
//                 <div className='overflow-x-auto mb-4'>
//                     <div className='flex justify-center gap-0 min-w-[650px]'>
//                         <CellPerc num={value.supperalloys?.ni} name='ni' title='Ni' handleChange={handleChange} />
//                         <CellPerc num={value?.supperalloys?.cr} name='cr' title='Cr' handleChange={handleChange} />
//                         <CellPerc num={value?.supperalloys?.mo} name='mo' title='Mo' handleChange={handleChange} />
//                         <CellPerc num={value?.supperalloys?.nb} name='nb' title='Nb' handleChange={handleChange} />
//                         <CellPerc num={value?.supperalloys?.co} name='co' title='Co' handleChange={handleChange} />
//                         <CellPerc num={value?.supperalloys?.w} name='w' title='W' handleChange={handleChange} />
//                         <CellPerc num={value?.supperalloys?.hf} name='hf' title='Hf' handleChange={handleChange} />
//                         <CellPerc num={value?.supperalloys?.ta} name='ta' title='Ta' handleChange={handleChange} />
//                         <CellPerc num={fe} name='fe' title='Fe' handleChange={{}} />
//                     </div>
//                 </div>

//                 {/* Price/Lbs Section */}
//                 <p className='text-center text-slate-600 text-sm font-semibold mb-2'>Price/Lbs</p>
//                 <div className='overflow-x-auto mb-6'>
//                     <div className='flex justify-center gap-0 min-w-[650px]'>
//                         <CellPrice 
//                             num={addComma((value.general.nilme / value.general.mt).toFixed(2))} 
//                             name='niPrice' 
//                             title='Ni' 
//                             handleChange={handleChange} 
//                             setFocusedField={setFocusedField}
//                         />
//                         <CellPrice 
//                             num={focusedField === 'crPrice' ? value.supperalloys?.crPrice : addComma(value.supperalloys?.crPrice)}
//                             name='crPrice' 
//                             title='Cr' 
//                             handleChange={handleChange} 
//                             setFocusedField={setFocusedField} 
//                         />
//                         <CellPrice 
//                             num={addComma(value?.general?.MoOxideLb)} 
//                             name='MoOxideLb' 
//                             title='Mo' 
//                             handleChange={handleChange}
//                             setFocusedField={setFocusedField}
//                         />
//                         <CellPrice 
//                             num={focusedField === 'nbPrice' ? value.supperalloys?.nbPrice : addComma(value.supperalloys?.nbPrice)}
//                             name='nbPrice' 
//                             title='Nb' 
//                             handleChange={handleChange} 
//                             setFocusedField={setFocusedField} 
//                         />
//                         <CellPrice 
//                             num={focusedField === 'coPrice' ? value.supperalloys?.coPrice : addComma(value.supperalloys?.coPrice)}
//                             name='coPrice' 
//                             title='Co' 
//                             handleChange={handleChange} 
//                             setFocusedField={setFocusedField} 
//                         />
//                         <CellPrice 
//                             num={focusedField === 'wPrice' ? value.supperalloys?.wPrice : addComma(value.supperalloys?.wPrice)}
//                             name='wPrice' 
//                             title='W' 
//                             handleChange={handleChange} 
//                             setFocusedField={setFocusedField} 
//                         />
//                         <CellPrice 
//                             num={focusedField === 'hfPrice' ? value.supperalloys?.hfPrice : addComma(value.supperalloys?.hfPrice)}
//                             name='hfPrice' 
//                             title='Hf' 
//                             handleChange={handleChange} 
//                             setFocusedField={setFocusedField} 
//                         />
//                         <CellPrice 
//                             num={focusedField === 'taPrice' ? value.supperalloys?.taPrice : addComma(value.supperalloys?.taPrice)}
//                             name='taPrice' 
//                             title='Ta' 
//                             handleChange={handleChange} 
//                             setFocusedField={setFocusedField} 
//                         />
//                         <CellPrice 
//                             num={focusedField === 'fePrice' ? value.supperalloys?.fePrice : addComma(value.supperalloys?.fePrice)}
//                             name='fePrice' 
//                             title='Fe' 
//                             handleChange={handleChange} 
//                             setFocusedField={setFocusedField} 
//                         />
//                     </div>
//                 </div>

//                 {/* Results Section - Two columns on desktop, stack on mobile */}
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
//                     {/* Cost Column */}
//                     <div className="flex flex-col items-center">
//                         <div className='border border-slate-500 w-full max-w-[200px] flex flex-col justify-center text-center mb-4'>
//                             <span className='title_style bg-customOrange text-xs sm:text-sm'>Formula Intrinsic</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 text-red-600 text-xs sm:text-sm' 
//                                 value={value?.supperalloys?.formulaIntsCost + '%'}
//                                 name='formulaIntsCost' 
//                                 onChange={(e) => handleChange(e, 'supperalloys')}
//                                 onBlur={(e) => {
//                                     let num = parseFloat(e.target.value.replace("%", ""));
//                                     if (isNaN(num)) num = 0;
//                                     handleChange(
//                                         {
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: num.toFixed(2),
//                                             },
//                                         },
//                                         "supperalloys"
//                                     );
//                                 }} 
//                             />
//                         </div>

//                         <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 w-full mb-4'>
//                             <div className='border border-slate-500 flex flex-col'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Cost</span>
//                                 <span className='title_style text-xs sm:text-sm'>Solids Price:</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-orange-200 text-xs sm:text-sm'
//                                     value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100).toFixed(2))}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border border-slate-500 flex flex-col'>
//                                 <span className='title_style bg-blue-300 text-xs sm:text-sm'>Price per MT:</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100 * value.general.mt).toFixed(2))}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border border-slate-500 flex flex-col'>
//                                 <span className='title_style text-xs sm:text-sm'>Price/Euro:</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-customLime text-xs sm:text-sm'
//                                     value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100 / value.general?.euroRate).toFixed(2), 'a')}
//                                     readOnly 
//                                 />
//                             </div>
//                         </div>

//                         <div className='border border-slate-500 w-full max-w-[200px] flex flex-col mb-4'>
//                             <span className='title_style text-xs sm:text-sm'>Turnings Price:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 text-xs sm:text-sm'
//                                 value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100 * 0.95).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>

//                         <div className='text-red-600 text-xs'>
//                             <p>* Fill in the red and + Formula x Ni</p>
//                             <p>* Fe is calculated automatically</p>
//                         </div>
//                     </div>

//                     {/* Sales Column */}
//                     <div className="flex flex-col items-center">
//                         <div className='border border-slate-500 w-full max-w-[200px] flex flex-col justify-center mb-4'>
//                             <span className='title_style bg-customOrange text-center text-xs sm:text-sm'>Formula Intrinsic</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 text-red-600 text-xs sm:text-sm' 
//                                 value={value?.supperalloys?.formulaIntsPrice + '%'}
//                                 name='formulaIntsPrice' 
//                                 onChange={(e) => handleChange(e, 'supperalloys')}
//                                 onBlur={(e) => {
//                                     let num = parseFloat(e.target.value.replace("%", ""));
//                                     if (isNaN(num)) num = 0;
//                                     handleChange(
//                                         {
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: num.toFixed(2),
//                                             },
//                                         },
//                                         "supperalloys"
//                                     );
//                                 }} 
//                             />
//                         </div>

//                         <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 w-full mb-4'>
//                             <div className='border border-slate-500 flex flex-col'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Sales</span>
//                                 <span className='title_style text-xs sm:text-sm'>Solids Price:</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-orange-200 text-xs sm:text-sm'
//                                     value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100).toFixed(2))}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border border-slate-500 flex flex-col'>
//                                 <span className='title_style bg-blue-300 text-xs sm:text-sm'>Price per MT:</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100 * value.general.mt).toFixed(2))}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border border-slate-500 flex flex-col'>
//                                 <span className='title_style text-xs sm:text-sm'>Price/Euro:</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-customLime text-xs sm:text-sm'
//                                     value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100 / value.general?.euroRate).toFixed(2), 'a')}
//                                     readOnly 
//                                 />
//                             </div>
//                         </div>

//                         <div className='border border-slate-500 w-full max-w-[200px] flex flex-col'>
//                             <span className='title_style text-xs sm:text-sm'>Turnings Price:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 text-xs sm:text-sm'
//                                 value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100 * 0.95).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// };

// export default SupperAlloys;

import { useState } from "react";

const SupperAlloys = ({ value, handleChange }) => {
    const [focusedField, setFocusedField] = useState(null);
    
    const fe = (100 - (value?.supperalloys?.ni || 0) - (value?.supperalloys?.cr || 0) - (value?.supperalloys?.mo || 0) -
        (value?.supperalloys?.nb || 0) - (value?.supperalloys?.co || 0) - (value?.supperalloys?.w || 0) -
        (value?.supperalloys?.hf || 0) - (value?.supperalloys?.ta || 0)).toFixed(2);

    const solidsPrice = (value?.supperalloys?.ni || 0) * (value.general.nilme / value.general.mt) / 100 +
        (value?.supperalloys?.cr || 0) * (value?.supperalloys?.crPrice || 0) / 100 +
        (value?.supperalloys?.mo || 0) * (value?.supperalloys?.moPrice || 0) / 100 +
        (value?.supperalloys?.nb || 0) * (value?.supperalloys?.nbPrice || 0) / 100 +
        (value?.supperalloys?.co || 0) * (value?.supperalloys?.coPrice || 0) / 100 +
        (value?.supperalloys?.w || 0) * (value?.supperalloys?.wPrice || 0) / 100 +
        (value?.supperalloys?.hf || 0) * (value?.supperalloys?.hfPrice || 0) / 100 +
        (value?.supperalloys?.ta || 0) * (value?.supperalloys?.taPrice || 0) / 100;

    const formatCurrency = (num, symbol = '$') => {
        if (!num && num !== 0) return symbol + '0';
        const str = num.toString();
        const parts = str.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return symbol + parts.join('.');
    };

    const elements = ['ni', 'cr', 'mo', 'nb', 'co', 'w', 'hf', 'ta', 'fe'];
    const elementLabels = ['Ni', 'Cr', 'Mo', 'Nb', 'Co', 'W', 'Hf', 'Ta', 'Fe'];
    const priceFields = ['niPrice', 'crPrice', 'MoOxideLb', 'nbPrice', 'coPrice', 'wPrice', 'hfPrice', 'taPrice', 'fePrice'];

        return value.supperalloys != null ? (
        <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-2">
          <h3 className='text-sm font-semibold text-[var(--port-gore)] mb-2 text-center'>Cost</h3>
            
            {/* Composition */}
            <div className="mb-3">
            <p className="text-sm font-medium text-[var(--regent-gray)] mb-2 text-center">
                Composition
            </p>

            <div className="rounded-xl overflow-hidden border border-[#D9ECFF] bg-white">
                {/* Header */}
                <div className="grid grid-cols-9 bg-[#EAF4FF] text-[#2F6FDB] text-xs font-semibold">
                {elementLabels.map((label, idx) => (
                  <div
                  key={label}
                  className={`py-1 text-center ${idx > 0 ? 'border-l border-[#D9ECFF]' : ''}`}
                  >
                  {label}
                  </div>
                ))}
                </div>

                {/* Values */}
                <div className="grid grid-cols-9 bg-white text-xs">
                {elements.map((elem, idx) => (
                  <input
                  key={elem}
                  type="text"
                  className={`w-full text-center py-1 outline-none ${
                    idx > 0 ? 'border-l border-[#D9ECFF]' : ''
                  } ${
                    elem === 'fe'
                    ? 'text-[#2F6FDB] bg-gray-50 cursor-not-allowed'
                    : 'text-[#F44336]'
                  }`}
                    name={elem}
                    value={elem === 'fe'
                        ? fe + '%'
                        : (value.supperalloys?.[elem] || '0') + '%'}
                    readOnly={elem === 'fe'}
                    onChange={(e) => {
                        if (elem === 'fe') return;
                        handleChange({
                        target: {
                            name: elem,
                            value: e.target.value.replace('%', ''),
                        },
                        }, 'supperalloys');
                    }}
                    onBlur={(e) => {
                        if (elem === 'fe') return;
                        const n = parseFloat(e.target.value.replace('%', ''));
                        if (!isNaN(n)) {
                        handleChange({
                            target: { name: elem, value: n.toFixed(2) },
                        }, 'supperalloys');
                        }
                    }}
                    />
                ))}
                </div>
            </div>
            </div>

            {/* Price / Lbs */}
            <div className="mb-3">
            <p className="text-sm font-medium text-[var(--regent-gray)] mb-2 text-center">
                Price / Lbs
            </p>

            <div className="rounded-xl overflow-hidden border border-[#D9ECFF] bg-white">
                {/* Header */}
                <div className="grid grid-cols-9 bg-[#E9E2FF] text-[#2F6FDB] text-xs font-semibold">
                {elementLabels.map((label, idx) => (
                  <div
                  key={label}
                  className={`py-1 text-center ${idx > 0 ? 'border-l border-[#D9ECFF]' : ''}`}
                  >
                  {label}
                  </div>
                ))}
                </div>

                {/* Values */}
                <div className="grid grid-cols-9 bg-white text-xs">
                {priceFields.map((field, idx) => {
                    const isReadOnly = field === 'niPrice' || field === 'MoOxideLb';

                    const displayValue =
                    field === 'niPrice'
                        ? formatCurrency((value.general.nilme / value.general.mt).toFixed(2))
                        : field === 'MoOxideLb'
                        ? formatCurrency(value.general?.MoOxideLb || '0')
                        : focusedField === field
                        ? value.supperalloys?.[field] || ''
                        : formatCurrency(value.supperalloys?.[field] || '0');

                    return (
                    <input
                      key={field}
                      type="text"
                      className={`w-full text-center py-1 outline-none ${
                        idx > 0 ? 'border-l border-[#D9ECFF]' : ''
                        } ${
                        isReadOnly
                            ? 'bg-gray-50 cursor-not-allowed text-[#2F6FDB]'
                            : 'text-[#F44336]'
                        }`}
                        name={field}
                        value={displayValue}
                        readOnly={isReadOnly}
                        onFocus={() => !isReadOnly && setFocusedField(field)}
                        onChange={(e) => {
                        if (isReadOnly) return;
                        handleChange({
                            target: {
                            name: field,
                            value: e.target.value.replace(/[^0-9.]/g, ''),
                            },
                        }, 'supperalloys');
                        }}
                        onBlur={(e) => {
                        if (isReadOnly) return;
                        setFocusedField(null);
                        const n = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                        if (!isNaN(n)) {
                            handleChange({
                            target: { name: field, value: n.toFixed(2) },
                            }, 'supperalloys');
                        }
                        }}
                    />
                    );
                })}
                </div>
            </div>
            </div>

 {/* Results */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">

  {/* LEFT — COST RESULTS */}
  <div className="grid grid-cols-1 gap-3">

    <ResultBox
      title="Solids Price"
      bg="#FFECEC"
      value={formatCurrency(
        (solidsPrice * (value?.supperalloys?.formulaIntsCost || 0) / 100).toFixed(2)
      )}
    />

    <ResultBox
      title="Price per MT"
      bg="#FFECEC"
      value={formatCurrency(
        (solidsPrice * (value?.supperalloys?.formulaIntsCost || 0) / 100 * value.general.mt).toFixed(2)
      )}
    />

    <ResultBox
      title="Price / Euro"
      bg="#E9FFF1"
      value={formatCurrency(
        (solidsPrice * (value?.supperalloys?.formulaIntsCost || 0) / 100 / value.general?.euroRate).toFixed(2),
        '€'
      )}
    />

  </div>

  {/* RIGHT — PRICE RESULTS */}
  <div className="grid grid-cols-1 gap-3">

    <ResultBox
      title="Solids Price"
      bg="#EAF4FF"
      value={formatCurrency(
        (solidsPrice * (value?.supperalloys?.formulaIntsPrice || 0) / 100).toFixed(2)
      )}
    />

    <ResultBox
      title="Price per MT"
      bg="#EAF4FF"
      value={formatCurrency(
        (solidsPrice * (value?.supperalloys?.formulaIntsPrice || 0) / 100 * value.general.mt).toFixed(2)
      )}
    />

    <ResultBox
      title="Price / Euro"
      bg="#E9FFF1"
      value={formatCurrency(
        (solidsPrice * (value?.supperalloys?.formulaIntsPrice || 0) / 100 / value.general?.euroRate).toFixed(2),
        '€'
      )}
    />

  </div>

</div>

        </div>
    ) : null;
};
const ResultBox = ({ title, value, bg }) => (
  <div className="rounded-xl overflow-hidden border border-[#D9ECFF] bg-white text-center">
    <div className="py-1" style={{ backgroundColor: bg }}>
      <p className="text-xs text-[#2F6FDB]">{title}</p>
    </div>
    <div className="py-1 text-xs font-semibold text-[#2F6FDB]">
      {value}
    </div>
  </div>
);

export default SupperAlloys;