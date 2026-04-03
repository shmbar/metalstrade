// // import { useState } from "react";

// // const Fenicr = ({ value, handleChange }) => {
// //     const [focusedField, setFocusedField] = useState(null);


// //     const fe = (100 - value?.fenicr?.ni - value?.fenicr?.cr - value?.fenicr?.mo).toFixed(2)
// //     const solidsPrice = value?.fenicr?.ni * value?.general?.nilme * value?.fenicr?.formulaNiCost / 10000 +
// //         value?.fenicr?.cr * value?.fenicr?.crPrice / 100 +
// //         value?.fenicr?.mo * value?.fenicr?.moPrice / 100 +
// //         fe * value?.fenicr?.fePrice / 100


// //     const solidsPrice1 = value?.fenicr?.ni * value?.general?.nilme / 100 * value?.fenicr?.formulaNiPrice / 100 +
// //         value?.fenicr?.cr / 100 * value.general?.chargeCrLb * value.general?.mt * value?.fenicr?.crPriceArgus / 100 +
// //         value?.fenicr?.mo / 100 * (value.general?.MoOxideLb * value?.fenicr?.moPriceArgus * value.general?.mt / 100) +
// //         fe * value?.fenicr?.fePrice1 / 100


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

// //     return value.fenicr != null ? (
// //         <div className='border border-slate-300 p-3 rounded-lg flex flex-col md:flex-row w-full'>

// //             <div className="grid grid-cols-2 w-[75rem]">
// //                 <div className="col-span-2 md:col-span-1">
// //                     <p className='text-center text-slate-600 text-lg font-semibold'>Cost</p>
// //                     <div className='flex gap-6 pt-2'>
// //                         <div>
// //                             <div>
// //                                 <p className='text-center text-slate-600 text-sm font-semibold'>Composition</p>
// //                                 <div className='flex justify-center'>
// //                                     <div className='border border-slate-500 w-24 flex flex-col justify-center'>
// //                                         <span className='title_style'>Ni</span>
// //                                         <input type='input' className='input_style text-red-700' value={value?.fenicr?.ni + '%'}
// //                                             name='ni' onChange={(e) => {
// //                                                 handleChange({
// //                                                     target: {
// //                                                         name: e.target.name,
// //                                                         value: e.target.value.replace('%', ''),
// //                                                     },
// //                                                 }, 'fenicr');
// //                                             }}
// //                                             onBlur={(e) => {
// //                                                 let num = parseFloat(e.target.value.replace("%", ""));
// //                                                 if (!isNaN(num)) {
// //                                                     handleChange(
// //                                                         {
// //                                                             target: {
// //                                                                 name: e.target.name,
// //                                                                 value: num.toFixed(2), // format with 2 decimals
// //                                                             },
// //                                                         },
// //                                                         "fenicr"
// //                                                     );
// //                                                 }
// //                                             }}
// //                                         />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style'>Cr</span>
// //                                         <input type='input' className='input_style text-red-700' value={value?.fenicr?.cr + '%'}
// //                                             name='cr' onChange={(e) => {
// //                                                 handleChange({
// //                                                     target: {
// //                                                         name: e.target.name,
// //                                                         value: e.target.value.replace('%', ''),
// //                                                     },
// //                                                 }, 'fenicr');
// //                                             }}
// //                                             onBlur={(e) => {
// //                                                 let num = parseFloat(e.target.value.replace("%", ""));
// //                                                 if (!isNaN(num)) {
// //                                                     handleChange(
// //                                                         {
// //                                                             target: {
// //                                                                 name: e.target.name,
// //                                                                 value: num.toFixed(2), // format with 2 decimals
// //                                                             },
// //                                                         },
// //                                                         "fenicr"
// //                                                     );
// //                                                 }
// //                                             }}
// //                                         />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style'>Mo</span>
// //                                         <input type='text' className='input_style text-red-700' value={value?.fenicr?.mo + '%'}
// //                                             name='mo' onChange={(e) => {
// //                                                 handleChange({
// //                                                     target: {
// //                                                         name: e.target.name,
// //                                                         value: e.target.value.replace('%', ''),
// //                                                     },
// //                                                 }, 'fenicr');
// //                                             }}
// //                                             onBlur={(e) => {
// //                                                 let num = parseFloat(e.target.value.replace("%", ""));
// //                                                 if (!isNaN(num)) {
// //                                                     handleChange(
// //                                                         {
// //                                                             target: {
// //                                                                 name: e.target.name,
// //                                                                 value: num.toFixed(2), // format with 2 decimals
// //                                                             },
// //                                                         },
// //                                                         "fenicr"
// //                                                     );
// //                                                 }
// //                                             }}
// //                                         />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style'>Fe</span>
// //                                         <input type='input' className='input_style bg-slate-100' value={fe + '%'}
// //                                             name='fe' onChange={(e) => { }} />
// //                                     </div>
// //                                 </div>
// //                             </div>
// //                             <div className=''>
// //                                 <p className='text-center text-slate-600 text-sm font-semibold'>Price</p>
// //                                 <div className='flex justify-center'>
// //                                     <div className='border border-slate-500 w-24 flex flex-col justify-center'>
// //                                         <span className='title_style bg-customLavender'>Ni</span>
// //                                         <input type='input' className='input_style bg-slate-100' value={addComma(value.general?.nilme * value.fenicr?.formulaNiCost / 100)}
// //                                             onChange={(e) => { }} />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style bg-customLavender'>Cr</span>
// //                                         <input type='input' className='input_style text-red-700 '
// //                                             name='crPrice' onChange={(e) => handleChange(e, 'fenicr')}
// //                                             value={focusedField === 'crPrice' ? value.fenicr?.crPrice : addComma(value.fenicr?.crPrice)}
// //                                             onFocus={() => setFocusedField('crPrice')}
// //                                             onBlur={(e) => {
// //                                                 setFocusedField(null);

// //                                                 let num = parseFloat(e.target.value);
// //                                                 if (!isNaN(num)) {
// //                                                     handleChange(
// //                                                         {
// //                                                             target: {
// //                                                                 name: e.target.name,
// //                                                                 value: num.toFixed(2), // force 2 decimals
// //                                                             },
// //                                                         },
// //                                                         "fenicr"
// //                                                     );
// //                                                 }
// //                                             }}
// //                                         />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style bg-customLavender'>Mo</span>
// //                                         <input type='input' className='input_style text-red-700'
// //                                             name='moPrice' onChange={(e) => handleChange(e, 'fenicr')}
// //                                             value={focusedField === 'moPrice' ? value.fenicr?.moPrice : addComma(value.fenicr?.moPrice)}
// //                                             onFocus={() => setFocusedField('moPrice')}
// //                                             onBlur={(e) => {
// //                                                 setFocusedField(null);

// //                                                 let num = parseFloat(e.target.value);
// //                                                 if (!isNaN(num)) {
// //                                                     handleChange(
// //                                                         {
// //                                                             target: {
// //                                                                 name: e.target.name,
// //                                                                 value: num.toFixed(2), // force 2 decimals
// //                                                             },
// //                                                         },
// //                                                         "fenicr"
// //                                                     );
// //                                                 }
// //                                             }}
// //                                         />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style bg-customLavender'>Fe</span>
// //                                         <input type='input' className='input_style text-red-700'
// //                                             name='fePrice' onChange={(e) => handleChange(e, 'fenicr')}
// //                                             value={focusedField === 'fePrice' ? value.fenicr?.fePrice : addComma(value.fenicr?.fePrice)}
// //                                             onFocus={() => setFocusedField('fePrice')}
// //                                             onBlur={(e) => {
// //                                                 setFocusedField(null);

// //                                                 let num = parseFloat(e.target.value);
// //                                                 if (!isNaN(num)) {
// //                                                     handleChange(
// //                                                         {
// //                                                             target: {
// //                                                                 name: e.target.name,
// //                                                                 value: num.toFixed(2), // force 2 decimals
// //                                                             },
// //                                                         },
// //                                                         "fenicr"
// //                                                     );
// //                                                 }
// //                                             }}
// //                                         />
// //                                     </div>
// //                                 </div>

// //                             </div>
// //                         </div>
// //                         <div className='items-end flex'>
// //                             <div className='border border-slate-500 w-24 flex flex-col'>
// //                                 <span className='title_style bg-blue-300'>Ni LME</span>
// //                                 <input type='text' className='input_style bg-slate-100' value={addComma(value?.general?.nilme)}
// //                                     name='nilme' onChange={(e) => { }} />
// //                             </div>
// //                         </div>
// //                     </div>


// //                     <div className='items-end flex pt-[44px]'>
// //                         <div className='border border-slate-500 w-24 flex flex-col'>
// //                             <span className='title_style bg-customOrange'> Formula x Ni</span>
// //                             <input type='text' className='input_style bg-orange-200 text-red-600' value={value?.fenicr?.formulaNiCost + '%'}
// //                                 name='formulaNiCost' onChange={(e) => handleChange(e, 'fenicr')}
// //                                 onBlur={(e) => {
// //                                     let num = parseFloat(e.target.value.replace("%", ""));
// //                                     if (!isNaN(num)) {
// //                                         handleChange(
// //                                             {
// //                                                 target: {
// //                                                     name: e.target.name,
// //                                                     value: num.toFixed(2), // store with 2 decimals
// //                                                 },
// //                                             },
// //                                             "fenicr"
// //                                         );
// //                                     }
// //                                 }}
// //                             />
// //                         </div>
// //                     </div>
// //                     <div className=''>
// //                         <div className='items-end flex pt-6 gap-6'>
// //                             <div className='border border-slate-500 w-24 flex flex-col'>
// //                                 <span className='title_style bg-customLavender'>Cost</span>
// //                                 <span className='title_style'>Solids Price:</span>
// //                                 <input type='text' className='input_style bg-orange-200 input_style'
// //                                     value={addComma(solidsPrice.toFixed(2))}
// //                                     name='formulaNi' onChange={(e) => { }} />
// //                             </div>
// //                             <div className='border border-slate-500 w-24 flex flex-col'>
// //                                 <span className='title_style'>Turnings Price:</span>
// //                                 <input type='text' className='input_style bg-orange-200 '
// //                                     value={addComma((solidsPrice * 0.92).toFixed(2))}
// //                                     name='formulaNi' onChange={(e) => { }} />
// //                             </div>
// //                             <div className='border border-slate-500 w-24 flex flex-col'>
// //                                 <span className='title_style'>Price/Euro:</span>
// //                                 <input type='text' className='input_style bg-customLime'
// //                                     value={addComma((solidsPrice / value.general?.euroRate).toFixed(2), 'a')}
// //                                     name='formulaNi' onChange={(e) => { }} />
// //                             </div>
// //                         </div>
// //                     </div>

// //                     <div className='pt-4 text-red-600'>
// //                         <p className="text-xs">* Fill in the red and + Formula x Ni</p>
// //                         <p className="text-xs">* Fe is calculated automatically</p>
// //                     </div>

// //                 </div>



// //                 <div className="col-span-2 md:col-span-1">
// //                     <p className='text-center text-slate-600 text-lg font-semibold'>Sales</p>
// //                     <div className='flex gap-6 pt-2'>
// //                         <div>
// //                             <div>
// //                                 <p className='text-center text-slate-600 text-sm font-semibold'>Composition</p>
// //                                 <div className='flex justify-center'>
// //                                     <div className='border border-slate-500 w-24 flex flex-col justify-center'>
// //                                         <span className='title_style'>Ni</span>
// //                                         <input type='input' className='input_style bg-slate-100'
// //                                             value={value?.fenicr?.ni + '%'} onChange={(e) => { }} />
// //                                     </div>
// //                                     <div className='border-y border-slate-500 border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style'>Cr</span>
// //                                         <input type='input' className='input_style bg-slate-100'
// //                                             value={value?.fenicr?.cr + '%'} onChange={(e) => { }} />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style'>Mo</span>
// //                                         <input type='input' className='input_style bg-slate-100'
// //                                             value={value?.fenicr?.mo + '%'} onChange={(e) => { }} />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style'>Fe</span>
// //                                         <input type='input' className='input_style bg-slate-100'
// //                                             value={fe + '%'} onChange={(e) => { }} />
// //                                     </div>
// //                                 </div>
// //                             </div>
// //                             <div className=''>
// //                                 <p className='text-center text-slate-600 text-sm font-semibold'>Price</p>
// //                                 <div className='flex justify-center'>
// //                                     <div className='border border-slate-500 w-24 flex flex-col justify-center'>
// //                                         <span className='title_style bg-customLavender'>Ni</span>
// //                                         <input type='input' className='input_style bg-slate-100' value={addComma(value?.general?.nilme * value?.fenicr?.formulaNiPrice / 100)}
// //                                             onChange={(e) => { }} />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style bg-customLavender'>Cr</span>
// //                                         <input type='input' className='input_style bg-slate-100'
// //                                             value={addComma((value.general?.chargeCrLb * value.general?.mt * value?.fenicr?.crPriceArgus / 100).toFixed(2))} onChange={(e) => { }} />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style bg-customLavender'>Mo</span>
// //                                         <input type='input' className='input_style bg-slate-100'
// //                                             value={addComma((value.general?.MoOxideLb * value?.fenicr?.moPriceArgus * value.general?.mt / 100).toFixed(2))} onChange={(e) => { }} />
// //                                     </div>
// //                                     <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
// //                                         <span className='title_style bg-customLavender'>Fe</span>
// //                                         <input type='input' className='input_style  text-red-600 '
// //                                             name='fePrice1' onChange={(e) => handleChange(e, 'fenicr')}
// //                                             value={focusedField === 'fePrice1' ? value.fenicr?.fePrice1 : addComma(value.fenicr?.fePrice1)}
// //                                             onFocus={() => setFocusedField('fePrice1')}
// //                                             onBlur={(e) => {
// //                                                 setFocusedField(null);

// //                                                 let num = parseFloat(e.target.value);
// //                                                 if (!isNaN(num)) {
// //                                                     handleChange(
// //                                                         {
// //                                                             target: {
// //                                                                 name: e.target.name,
// //                                                                 value: num.toFixed(2), // force 2 decimals
// //                                                             },
// //                                                         },
// //                                                         "fenicr"
// //                                                     );
// //                                                 }
// //                                             }}
// //                                         />

// //                                     </div>
// //                                 </div>
// //                             </div>
// //                             <div className='justify-start flex'>
// //                                 <div className='flex justify-center'>
// //                                     <div className='w-24 flex flex-col justify-center'>
// //                                         <span className='justify-center text-xs text-slate-500 items-center flex'>{'Lb ' + addComma(((value?.general?.nilme * value?.fenicr?.formulaNiPrice / 100) / (value?.general?.mt)).toFixed(2))}</span>
// //                                     </div>
// //                                     <div className='w-24 flex flex-col justify-center'>
// //                                         <input type='input' className='input w-full h-7 text-center border-none  cursor-default rounded-none text-red-700 text-xs'
// //                                             name='crPriceArgus' value={'Argus ' + value?.fenicr?.crPriceArgus + '%'} onChange={(e) => handleChange(e, 'fenicr')} />
// //                                     </div>
// //                                     <div className=' w-24 flex flex-col justify-center'>
// //                                         <input type='input' className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 text-xs'
// //                                             name='moPriceArgus' value={'Argus ' + value?.fenicr?.moPriceArgus + '%'} onChange={(e) => handleChange(e, 'fenicr')} />
// //                                     </div>

// //                                 </div>
// //                             </div>
// //                         </div>
// //                         <div className='items-end flex'>
// //                             <div className='border border-slate-500 w-24 flex flex-col mb-7'>
// //                                 <span className='title_style bg-blue-300'>Ni LME</span>
// //                                 <input type='input' className='input_style bg-slate-100' value={addComma(value?.general?.nilme)}
// //                                     onChange={(e) => { }} />
// //                             </div>
// //                         </div>
// //                     </div>

// //                     <div className='items-end flex pt-4'>
// //                         <div className='border border-slate-500 w-24 flex flex-col'>
// //                             <span className='title_style bg-customOrange'> Formula x Ni</span>
// //                             <input type='text' className='input_style bg-orange-200 text-red-600' value={value?.fenicr?.formulaNiPrice + '%'}
// //                                 name='formulaNiPrice' onChange={(e) => handleChange(e, 'fenicr')}
// //                                   onBlur={(e) => {
// //                                     let num = parseFloat(e.target.value.replace("%", ""));
// //                                     if (!isNaN(num)) {
// //                                         handleChange(
// //                                             {
// //                                                 target: {
// //                                                     name: e.target.name,
// //                                                     value: num.toFixed(2), // store with 2 decimals
// //                                                 },
// //                                             },
// //                                             "fenicr"
// //                                         );
// //                                     }
// //                                 }}
// //                             />
// //                         </div>
// //                     </div>
// //                     <div className=''>
// //                         <div className='items-end flex pt-6 gap-6'>
// //                             <div className='border border-slate-500 w-24 flex flex-col'>
// //                                 <span className='title_style bg-customLavender'>Sales</span>
// //                                 <span className='title_style'>Solids Price:</span>
// //                                 <input type='text' className='input_style bg-orange-200'
// //                                     value={addComma((solidsPrice1).toFixed(2))}
// //                                     name='formulaNi' onChange={(e) => { }} />
// //                             </div>
// //                             <div className='border border-slate-500 w-24 flex flex-col'>
// //                                 <span className='title_style'>Turnings Price:</span>
// //                                 <input type='text' className='input_style bg-orange-200'
// //                                     value={addComma((solidsPrice1 * 0.9).toFixed(2))}
// //                                     name='formulaNi' onChange={(e) => { }} />
// //                             </div>
// //                             <div className='border border-slate-500 w-24 flex flex-col'>
// //                                 <span className='title_style'>Price/Euro:</span>
// //                                 <input type='text' className='input_style bg-customLime '
// //                                     value={addComma((solidsPrice1 / value.general?.euroRate).toFixed(2), 'a')}
// //                                     name='formulaNi' onChange={(e) => { }} />
// //                             </div>
// //                         </div>
// //                     </div>

// //                     <div className='pt-4 text-red-600'>
// //                         <p className="text-xs">* Fill in the red and + Formula x Ni</p>
// //                         <p className="text-xs">* Fe is calculated automatically</p>
// //                     </div>
// //                 </div>
// //             </div>

// //         </div>
// //     ) : ''
// // };

// // export default Fenicr;
// import { useState } from "react";

// const Fenicr = ({ value, handleChange }) => {
//     const [focusedField, setFocusedField] = useState(null);

//     const fe = (100 - value?.fenicr?.ni - value?.fenicr?.cr - value?.fenicr?.mo).toFixed(2)
//     const solidsPrice = value?.fenicr?.ni * value?.general?.nilme * value?.fenicr?.formulaNiCost / 10000 +
//         value?.fenicr?.cr * value?.fenicr?.crPrice / 100 +
//         value?.fenicr?.mo * value?.fenicr?.moPrice / 100 +
//         fe * value?.fenicr?.fePrice / 100

//     const solidsPrice1 = value?.fenicr?.ni * value?.general?.nilme / 100 * value?.fenicr?.formulaNiPrice / 100 +
//         value?.fenicr?.cr / 100 * value.general?.chargeCrLb * value.general?.mt * value?.fenicr?.crPriceArgus / 100 +
//         value?.fenicr?.mo / 100 * (value.general?.MoOxideLb * value?.fenicr?.moPriceArgus * value.general?.mt / 100) +
//         fe * value?.fenicr?.fePrice1 / 100

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

//     return value.fenicr != null ? (
//         <div className='border border-slate-300 p-2 sm:p-3 rounded-lg w-full overflow-x-auto'>
//             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
//                 {/* COST SECTION */}
//                 <div className="w-full">
//                     <p className='text-center text-slate-600 text-base sm:text-lg font-semibold mb-3'>Cost</p>
                    
//                     {/* Composition */}
//                     <p className='text-center text-slate-600 text-sm font-semibold mb-2'>Composition</p>
//                     <div className='overflow-x-auto mb-4'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='border border-slate-500 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Ni</span>
//                                 <input type='text' className='input_style text-red-700 text-xs sm:text-sm' 
//                                     value={value?.fenicr?.ni + '%'}
//                                     name='ni' 
//                                     onChange={(e) => {
//                                         handleChange({
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: e.target.value.replace('%', ''),
//                                             },
//                                         }, 'fenicr');
//                                     }}
//                                     onBlur={(e) => {
//                                         let num = parseFloat(e.target.value.replace("%", ""));
//                                         if (!isNaN(num)) {
//                                             handleChange({
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             }, "fenicr");
//                                         }
//                                     }}
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Cr</span>
//                                 <input type='text' className='input_style text-red-700 text-xs sm:text-sm' 
//                                     value={value?.fenicr?.cr + '%'}
//                                     name='cr' 
//                                     onChange={(e) => {
//                                         handleChange({
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: e.target.value.replace('%', ''),
//                                             },
//                                         }, 'fenicr');
//                                     }}
//                                     onBlur={(e) => {
//                                         let num = parseFloat(e.target.value.replace("%", ""));
//                                         if (!isNaN(num)) {
//                                             handleChange({
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             }, "fenicr");
//                                         }
//                                     }}
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Mo</span>
//                                 <input type='text' className='input_style text-red-700 text-xs sm:text-sm' 
//                                     value={value?.fenicr?.mo + '%'}
//                                     name='mo' 
//                                     onChange={(e) => {
//                                         handleChange({
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: e.target.value.replace('%', ''),
//                                             },
//                                         }, 'fenicr');
//                                     }}
//                                     onBlur={(e) => {
//                                         let num = parseFloat(e.target.value.replace("%", ""));
//                                         if (!isNaN(num)) {
//                                             handleChange({
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             }, "fenicr");
//                                         }
//                                     }}
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Fe</span>
//                                 <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm' 
//                                     value={fe + '%'}
//                                     name='fe' 
//                                     readOnly 
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Price */}
//                     <p className='text-center text-slate-600 text-sm font-semibold mb-2'>Price</p>
//                     <div className='overflow-x-auto mb-4'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='border border-slate-500 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Ni</span>
//                                 <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm' 
//                                     value={addComma(value.general?.nilme * value.fenicr?.formulaNiCost / 100)}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Cr</span>
//                                 <input type='text' className='input_style text-red-700 text-xs sm:text-sm'
//                                     name='crPrice' 
//                                     onChange={(e) => handleChange(e, 'fenicr')}
//                                     value={focusedField === 'crPrice' ? value.fenicr?.crPrice : addComma(value.fenicr?.crPrice)}
//                                     onFocus={() => setFocusedField('crPrice')}
//                                     onBlur={(e) => {
//                                         setFocusedField(null);
//                                         let num = parseFloat(e.target.value);
//                                         if (!isNaN(num)) {
//                                             handleChange({
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             }, "fenicr");
//                                         }
//                                     }}
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Mo</span>
//                                 <input type='text' className='input_style text-red-700 text-xs sm:text-sm'
//                                     name='moPrice' 
//                                     onChange={(e) => handleChange(e, 'fenicr')}
//                                     value={focusedField === 'moPrice' ? value.fenicr?.moPrice : addComma(value.fenicr?.moPrice)}
//                                     onFocus={() => setFocusedField('moPrice')}
//                                     onBlur={(e) => {
//                                         setFocusedField(null);
//                                         let num = parseFloat(e.target.value);
//                                         if (!isNaN(num)) {
//                                             handleChange({
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             }, "fenicr");
//                                         }
//                                     }}
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Fe</span>
//                                 <input type='text' className='input_style text-red-700 text-xs sm:text-sm'
//                                     name='fePrice' 
//                                     onChange={(e) => handleChange(e, 'fenicr')}
//                                     value={focusedField === 'fePrice' ? value.fenicr?.fePrice : addComma(value.fenicr?.fePrice)}
//                                     onFocus={() => setFocusedField('fePrice')}
//                                     onBlur={(e) => {
//                                         setFocusedField(null);
//                                         let num = parseFloat(e.target.value);
//                                         if (!isNaN(num)) {
//                                             handleChange({
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             }, "fenicr");
//                                         }
//                                     }}
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Ni LME Display */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-blue-300 text-xs sm:text-sm'>Ni LME</span>
//                             <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm' 
//                                 value={addComma(value?.general?.nilme)}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     {/* Formula x Ni */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-customOrange text-xs sm:text-sm'>Formula x Ni</span>
//                             <input type='text' className='input_style bg-orange-200 text-red-600 text-xs sm:text-sm' 
//                                 value={value?.fenicr?.formulaNiCost + '%'}
//                                 name='formulaNiCost' 
//                                 onChange={(e) => handleChange(e, 'fenicr')}
//                                 onBlur={(e) => {
//                                     let num = parseFloat(e.target.value.replace("%", ""));
//                                     if (!isNaN(num)) {
//                                         handleChange({
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: num.toFixed(2),
//                                             },
//                                         }, "fenicr");
//                                     }
//                                 }}
//                             />
//                         </div>
//                     </div>

//                     {/* Results */}
//                     <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4'>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style bg-customLavender text-xs sm:text-sm'>Cost</span>
//                             <span className='title_style text-xs sm:text-sm'>Solids Price:</span>
//                             <input type='text' className='input_style bg-orange-200 text-xs sm:text-sm'
//                                 value={addComma(solidsPrice.toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style text-xs sm:text-sm'>Turnings Price:</span>
//                             <input type='text' className='input_style bg-orange-200 text-xs sm:text-sm'
//                                 value={addComma((solidsPrice * 0.92).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style text-xs sm:text-sm'>Price/Euro:</span>
//                             <input type='text' className='input_style bg-customLime text-xs sm:text-sm'
//                                 value={addComma((solidsPrice / value.general?.euroRate).toFixed(2), 'a')}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     <div className='text-red-600 text-xs'>
//                         <p>* Fill in the red and + Formula x Ni</p>
//                         <p>* Fe is calculated automatically</p>
//                     </div>
//                 </div>

//                 {/* SALES SECTION */}
//                 <div className="w-full">
//                     <p className='text-center text-slate-600 text-base sm:text-lg font-semibold mb-3'>Sales</p>
                    
//                     {/* Composition (Read-only) */}
//                     <p className='text-center text-slate-600 text-sm font-semibold mb-2'>Composition</p>
//                     <div className='overflow-x-auto mb-4'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='border border-slate-500 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Ni</span>
//                                 <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={value?.fenicr?.ni + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Cr</span>
//                                 <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={value?.fenicr?.cr + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Mo</span>
//                                 <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={value?.fenicr?.mo + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Fe</span>
//                                 <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={fe + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Price */}
//                     <p className='text-center text-slate-600 text-sm font-semibold mb-2'>Price</p>
//                     <div className='overflow-x-auto mb-2'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='border border-slate-500 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Ni</span>
//                                 <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm' 
//                                     value={addComma(value?.general?.nilme * value?.fenicr?.formulaNiPrice / 100)}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Cr</span>
//                                 <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={addComma((value.general?.chargeCrLb * value.general?.mt * value?.fenicr?.crPriceArgus / 100).toFixed(2))} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Mo</span>
//                                 <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={addComma((value.general?.MoOxideLb * value?.fenicr?.moPriceArgus * value.general?.mt / 100).toFixed(2))} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Fe</span>
//                                 <input type='text' className='input_style text-red-600 text-xs sm:text-sm'
//                                     name='fePrice1' 
//                                     onChange={(e) => handleChange(e, 'fenicr')}
//                                     value={focusedField === 'fePrice1' ? value.fenicr?.fePrice1 : addComma(value.fenicr?.fePrice1)}
//                                     onFocus={() => setFocusedField('fePrice1')}
//                                     onBlur={(e) => {
//                                         setFocusedField(null);
//                                         let num = parseFloat(e.target.value);
//                                         if (!isNaN(num)) {
//                                             handleChange({
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             }, "fenicr");
//                                         }
//                                     }}
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Argus percentages */}
//                     <div className='overflow-x-auto mb-4'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='w-20 sm:w-24 flex justify-center items-center'>
//                                 <span className='text-xs text-slate-500'>{'Lb ' + addComma(((value?.general?.nilme * value?.fenicr?.formulaNiPrice / 100) / (value?.general?.mt)).toFixed(2))}</span>
//                             </div>
//                             <div className='w-20 sm:w-24 flex justify-center items-center'>
//                                 <input type='text' className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 text-xs'
//                                     name='crPriceArgus' 
//                                     value={'Argus ' + value?.fenicr?.crPriceArgus + '%'} 
//                                     onChange={(e) => handleChange(e, 'fenicr')} 
//                                 />
//                             </div>
//                             <div className='w-20 sm:w-24 flex justify-center items-center'>
//                                 <input type='text' className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 text-xs'
//                                     name='moPriceArgus' 
//                                     value={'Argus ' + value?.fenicr?.moPriceArgus + '%'} 
//                                     onChange={(e) => handleChange(e, 'fenicr')} 
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Ni LME Display */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-blue-300 text-xs sm:text-sm'>Ni LME</span>
//                             <input type='text' className='input_style bg-slate-100 text-xs sm:text-sm'
//                                 value={addComma(value?.general?.nilme)}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     {/* Formula x Ni */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-customOrange text-xs sm:text-sm'>Formula x Ni</span>
//                             <input type='text' className='input_style bg-orange-200 text-red-600 text-xs sm:text-sm' 
//                                 value={value?.fenicr?.formulaNiPrice + '%'}
//                                 name='formulaNiPrice' 
//                                 onChange={(e) => handleChange(e, 'fenicr')}
//                                 onBlur={(e) => {
//                                     let num = parseFloat(e.target.value.replace("%", ""));
//                                     if (!isNaN(num)) {
//                                         handleChange({
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: num.toFixed(2),
//                                             },
//                                         }, "fenicr");
//                                     }
//                                 }}
//                             />
//                         </div>
//                     </div>

//                     {/* Results */}
//                     <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4'>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style bg-customLavender text-xs sm:text-sm'>Sales</span>
//                             <span className='title_style text-xs sm:text-sm'>Solids Price:</span>
//                             <input type='text' className='input_style bg-orange-200 text-xs sm:text-sm'
//                                 value={addComma((solidsPrice1).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style text-xs sm:text-sm'>Turnings Price:</span>
//                             <input type='text' className='input_style bg-orange-200 text-xs sm:text-sm'
//                                 value={addComma((solidsPrice1 * 0.9).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style text-xs sm:text-sm'>Price/Euro:</span>
//                             <input type='text' className='input_style bg-customLime text-xs sm:text-sm'
//                                 value={addComma((solidsPrice1 / value.general?.euroRate).toFixed(2), 'a')}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     <div className='text-red-600 text-xs'>
//                         <p>* Fill in the red and + Formula x Ni</p>
//                         <p>* Fe is calculated automatically</p>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     ) : null
// };

// export default Fenicr;


import { useState } from "react";

const Fenicr = ({ value, handleChange, focusedField, setFocusedField, addComma }) => {
    const fe = (100 - value?.fenicr?.ni - value?.fenicr?.cr - value?.fenicr?.mo).toFixed(2)
    
    const solidsPrice = value?.fenicr?.ni * value?.general?.nilme * value?.fenicr?.formulaNiCost / 10000 +
        value?.fenicr?.cr * value?.fenicr?.crPrice / 100 +
        value?.fenicr?.mo * value?.fenicr?.moPrice / 100 +
        fe * value?.fenicr?.fePrice / 100

    const solidsPrice1 = value?.fenicr?.ni * value?.general?.nilme / 100 * value?.fenicr?.formulaNiPrice / 100 +
        value?.fenicr?.cr / 100 * value.general?.chargeCrLb * value.general?.mt * value?.fenicr?.crPriceArgus / 100 +
        value?.fenicr?.mo / 100 * (value.general?.MoOxideLb * value?.fenicr?.moPriceArgus * value.general?.mt / 100) +
        fe * value?.fenicr?.fePrice1 / 100

    const formatCurrency = (num, symbol = '$') => {
        if (!num) return symbol + '0';
        const str = num.toString();
        const parts = str.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return symbol + parts.join('.');
    }

    return value.fenicr != null ? (
        <div className="w-full rounded-xl p-1">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                {/* COST SECTION */}
                <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-2 text-center">
                    <h3 className="text-xs font-medium text-[var(--endeavour)] mb-1">Cost</h3>

                    {/* Composition + Price with Ni LME aside */}
                    <div className="flex gap-2 items-end mb-1.5 mt-1">
                    <div className="flex-1 min-w-0 px-2">
                        <p className="text-xs text-[#979797] mb-1 text-center">Composition</p>
                        <div className="rounded-xl overflow-hidden border border-[#b8ddf8] bg-white mb-1">
                            <div className="grid grid-cols-4 bg-[#EAF4FF] text-[#2F6FDB] text-xs">
                                <div className="py-1 text-center">Ni</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Cr</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Mo</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Fe</div>
                            </div>
                            <div className="grid grid-cols-4 bg-white text-xs">
                                <input type="text" className="w-full text-center py-1 outline-none text-[#F44336] bg-[#fafafa]"
                                    value={value?.fenicr?.ni + '%'} name="ni"
                                    onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value.replace('%','') } }, "fenicr")}
                                    onBlur={(e) => { const num = parseFloat(e.target.value.replace("%", "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                />
                                <input type="text" className="w-full text-center py-1 outline-none border-l border-[#b8ddf8] bg-[#fafafa] text-[#F44336]"
                                    value={value?.fenicr?.cr + '%'} name="cr"
                                    onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value.replace('%','') } }, "fenicr")}
                                    onBlur={(e) => { const num = parseFloat(e.target.value.replace("%", "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                />
                                <input type="text" className="w-full text-center py-1 outline-none border-l border-[#b8ddf8] bg-[#fafafa] text-[#2F6FDB]"
                                    value={value?.fenicr?.mo + '%'} name="mo"
                                    onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value.replace('%','') } }, "fenicr")}
                                    onBlur={(e) => { const num = parseFloat(e.target.value.replace("%", "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                />
                                <input type="text" className="w-full text-center py-1 cursor-not-allowed border-l border-[#b8ddf8] bg-[#fafafa] outline-none text-[#2F6FDB]"
                                    value={fe + '%'} readOnly
                                />
                            </div>
                        </div>
                        <p className="text-xs text-[#979797] mb-1 text-center">Price</p>
                        <div className="rounded-xl overflow-hidden border border-[#b8ddf8] bg-white">
                            <div className="grid grid-cols-4 bg-[#E9E2FF] text-[#2F6FDB] text-xs">
                                <div className="py-1 text-center">Ni</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Cr</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Mo</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Fe</div>
                            </div>
                            <div className="grid grid-cols-4 bg-white text-xs">
                                <input readOnly className="w-full text-center py-1 bg-white outline-none text-[#2F6FDB]"
                                    value={formatCurrency((value.general?.nilme * value.fenicr?.formulaNiCost / 100).toFixed(2))}
                                />
                                <input type="text" className="w-full text-center py-1 outline-none border-l border-[#b8ddf8] bg-[#fafafa] text-[#F44336]"
                                    name="crPrice" onChange={(e) => handleChange(e, "fenicr")}
                                    value={focusedField === "crPrice" ? value.fenicr?.crPrice : formatCurrency(value.fenicr?.crPrice)}
                                    onFocus={() => setFocusedField("crPrice")}
                                    onBlur={(e) => { setFocusedField(null); const num = parseFloat(e.target.value.replace(/[^0-9.]/g, "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                />
                                <input type="text" className="w-full text-center py-1 outline-none border-l border-[#b8ddf8] bg-[#fafafa] text-[#F44336]"
                                    name="moPrice" onChange={(e) => handleChange(e, "fenicr")}
                                    value={focusedField === "moPrice" ? value.fenicr?.moPrice : formatCurrency(value.fenicr?.moPrice)}
                                    onFocus={() => setFocusedField("moPrice")}
                                    onBlur={(e) => { setFocusedField(null); const num = parseFloat(e.target.value.replace(/[^0-9.]/g, "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                />
                                <input type="text" className="w-full text-center py-1 outline-none border-l border-[#b8ddf8] bg-[#fafafa] text-[#F44336]"
                                    name="fePrice" onChange={(e) => handleChange(e, "fenicr")}
                                    value={focusedField === "fePrice" ? value.fenicr?.fePrice : formatCurrency(value.fenicr?.fePrice)}
                                    onFocus={() => setFocusedField("fePrice")}
                                    onBlur={(e) => { setFocusedField(null); const num = parseFloat(e.target.value.replace(/[^0-9.]/g, "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="w-20 flex-shrink-0 rounded-xl overflow-hidden border border-[#b8ddf8]">
                        <div className="py-1 text-center bg-[#dbeeff] text-xs text-[var(--endeavour)] font-medium">Ni LME</div>
                        <div className="py-1 text-center text-xs text-[#2F6FDB] bg-[#EAF4FF]">{formatCurrency(Number(value.general?.nilme).toFixed(2))}</div>
                    </div>
                    </div>

                    {/* Formula x Ni */}
                    <div className="mb-1 mt-1 flex pl-2 pr-24">
                    <div className="w-32 rounded-xl overflow-hidden border border-[#b8ddf8] bg-white">
                        <div className="bg-[#FFDADA] text-[#F44336] text-xs py-1 text-center">Formula x Ni</div>
                        <input type="text" className="w-full text-center py-1 outline-none text-xs text-[#F44336] border-t border-[#b8ddf8] bg-[#fafafa]"
                            value={value?.fenicr?.formulaNiCost + '%'} name="formulaNiCost"
                            onChange={(e) => handleChange(e, 'fenicr')}
                            onBlur={(e) => { const num = parseFloat(e.target.value.replace('%', '')); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, 'fenicr'); }}
                        />
                    </div>
                    </div>

                    {/* Results */}
                    <div className="grid grid-cols-3 mt-1 gap-1.5 mb-1 pl-2 pr-24">
                    <div className="rounded-xl overflow-hidden border border-[#b8ddf8] bg-white text-center">
                        <div className="bg-[#FFECEC] py-1"><p className="text-xs text-[#2F6FDB]">Solids Price</p></div>
                        <div className="py-1 text-xs text-[#2F6FDB] border-t border-[#b8ddf8] bg-[#fafafa]">{formatCurrency(solidsPrice.toFixed(2))}</div>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-[#b8ddf8] bg-white text-center">
                        <div className="bg-[#FFECEC] py-1"><p className="text-xs text-[#2F6FDB]">Turnings Price</p></div>
                        <div className="py-1 text-xs text-[#2F6FDB] border-t border-[#b8ddf8] bg-[#fafafa]">{formatCurrency((solidsPrice * 0.92).toFixed(2))}</div>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-[#b8ddf8] bg-white text-center">
                        <div className="bg-[#E9FFF1] py-1"><p className="text-xs text-[#2F6FDB]">Price / Euro</p></div>
                        <div className="py-1 text-xs text-[#2F6FDB] border-t border-[#b8ddf8] bg-[#fafafa]">{formatCurrency((solidsPrice / value.general?.euroRate).toFixed(2), '€')}</div>
                    </div>
                    </div>

                    <div className='text-xs mt-3 text-[var(--endeavour)] space-y-0.5 text-left pl-2'>
                        <p>* Fill in the red and + Formula x Ni</p>
                        <p>* Fe is calculated automatically</p>
                    </div>
                </div>

                {/* SALES SECTION */}
                <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-2 text-center">
                    <h3 className="text-xs font-medium text-[var(--endeavour)] mb-1">Sales</h3>

                    {/* Composition + Price with Ni LME aside */}
                    <div className="flex gap-2 items-end mb-1.5 mt-1">
                    <div className="flex-1 min-w-0 px-2">
                        <p className="text-xs text-[#979797] mb-1 text-center">Composition</p>
                        <div className="rounded-xl overflow-hidden border border-[#b8ddf8] bg-white mb-1">
                            <div className="grid grid-cols-4 bg-[#EAF4FF] text-[#2F6FDB] text-xs">
                                <div className="py-1 text-center">Ni</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Cr</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Mo</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Fe</div>
                            </div>
                            <div className="grid grid-cols-4 bg-[#fafafa] text-xs">
                                <div className="py-1 text-center text-[#F44336]">{value?.fenicr?.ni}%</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8] text-[#F44336]">{value?.fenicr?.cr}%</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8] text-[#2F6FDB]">{value?.fenicr?.mo}%</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8] text-[#2F6FDB]">{fe}%</div>
                            </div>
                        </div>
                        <p className="text-xs text-[#979797] mb-1 text-center">Price</p>
                        <div className="rounded-xl overflow-hidden border border-[#b8ddf8] bg-white">
                            <div className="grid grid-cols-4 bg-[#E9E2FF] text-[#2F6FDB] text-xs">
                                <div className="py-1 text-center">Ni</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Cr</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Mo</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8]">Fe</div>
                            </div>
                            <div className="grid grid-cols-4 bg-[#fafafa] text-xs">
                                <div className="py-1 text-center text-[#2F6FDB]">{formatCurrency((value.general?.nilme * value.fenicr?.formulaNiPrice / 100).toFixed(2))}</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8] text-[#F44336]">{formatCurrency((value.general?.chargeCrLb * value.general?.mt * value.fenicr?.crPriceArgus / 100).toFixed(2))}</div>
                                <div className="py-1 text-center border-l border-[#b8ddf8] text-[#F44336]">{formatCurrency((value.general?.MoOxideLb * value.fenicr?.moPriceArgus * value.general?.mt / 100).toFixed(2))}</div>
                                <input type="text" className="w-full text-center py-1 outline-none border-l border-[#b8ddf8] bg-[#fafafa] text-[#F44336] text-xs"
                                    name="fePrice1"
                                    value={focusedField === 'fePrice1' ? value.fenicr?.fePrice1 : formatCurrency(value.fenicr?.fePrice1)}
                                    onFocus={() => setFocusedField('fePrice1')}
                                    onBlur={(e) => { setFocusedField(null); const num = parseFloat(e.target.value.replace(/[^0-9.]/g, "")); if (!isNaN(num)) handleChange({ target: { name: 'fePrice1', value: num.toFixed(2) } }, 'fenicr'); }}
                                    onChange={(e) => handleChange(e, 'fenicr')}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="w-20 flex-shrink-0 rounded-xl overflow-hidden border border-[#b8ddf8]">
                        <div className="py-1 text-center bg-[#dbeeff] text-xs text-[var(--endeavour)] font-medium">Ni LME</div>
                        <div className="py-1 text-center text-xs text-[#2F6FDB] bg-[#EAF4FF]">{formatCurrency(Number(value.general?.nilme).toFixed(2))}</div>
                    </div>
                    </div>

                    {/* Formula x Ni */}
                    <div className="mb-1 mt-1 flex pl-2 pr-24">
                        <div className="w-32 rounded-xl overflow-hidden border border-[#b8ddf8] bg-white">
                            <div className="bg-[#FFDADA] text-[#F44336] text-xs py-1 text-center">Formula x Ni</div>
                            <input type="text" className="w-full text-center py-1 outline-none text-xs text-[#F44336] bg-[#fafafa] border-[#b8ddf8]"
                                value={value?.fenicr?.formulaNiPrice + '%'} name="formulaNiPrice"
                                onChange={(e) => handleChange(e, 'fenicr')}
                                onBlur={(e) => { const num = parseFloat(e.target.value.replace('%', '')); if (!isNaN(num)) handleChange({ target: { name: 'formulaNiPrice', value: num.toFixed(2) } }, 'fenicr'); }}
                            />
                        </div>
                    </div>

                    {/* Results */}
                    <div className="grid grid-cols-3 mt-1 gap-1.5 mb-1 pl-2 pr-24">
                        <div className="rounded-xl overflow-hidden border border-[#b8ddf8] bg-white text-center">
                            <div className="bg-[#FFECEC] py-1 text-xs text-[#2F6FDB]">Solids Price</div>
                            <div className="py-1 text-xs text-[#2F6FDB] border-t border-[#b8ddf8] bg-[#fafafa]">{formatCurrency(solidsPrice1.toFixed(2))}</div>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-[#b8ddf8] bg-white text-center">
                            <div className="bg-[#FFECEC] py-1 text-xs text-[#2F6FDB]">Turnings Price</div>
                            <div className="py-1 text-xs text-[#2F6FDB] border-t border-[#b8ddf8] bg-[#fafafa]">{formatCurrency((solidsPrice1 * 0.9).toFixed(2))}</div>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-[#b8ddf8] bg-white text-center">
                            <div className="bg-[#E9FFF1] py-1"><p className="text-xs text-[#2F6FDB]">Price / Euro</p></div>
                            <div className="py-1 text-xs text-[#2F6FDB] border-t border-[#b8ddf8] bg-[#fafafa]">{formatCurrency((solidsPrice1 / value.general?.euroRate).toFixed(2), '€')}</div>
                        </div>
                    </div>

                    <div className="text-xs mt-3 text-[var(--endeavour)] space-y-0.5 text-left pl-2">
                        <p>* Fill in the red and + Formula x Ni</p>
                        <p>* Fe is calculated automatically</p>
                    </div>
                </div>
            </div>
        </div>
    ) : null
};

export default Fenicr;
