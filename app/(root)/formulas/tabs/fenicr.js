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
// //                                 <p className='text-center text-slate-600 responsiveTextTitle font-semibold'>Composition</p>
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
// //                                 <p className='text-center text-slate-600 responsiveTextTitle font-semibold'>Price</p>
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
// //                         <p className="responsiveTextInput">* Fill in the red and + Formula x Ni</p>
// //                         <p className="responsiveTextInput">* Fe is calculated automatically</p>
// //                     </div>

// //                 </div>



// //                 <div className="col-span-2 md:col-span-1">
// //                     <p className='text-center text-slate-600 text-lg font-semibold'>Sales</p>
// //                     <div className='flex gap-6 pt-2'>
// //                         <div>
// //                             <div>
// //                                 <p className='text-center text-slate-600 responsiveTextTitle font-semibold'>Composition</p>
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
// //                                 <p className='text-center text-slate-600 responsiveTextTitle font-semibold'>Price</p>
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
// //                                         <span className='justify-center responsiveTextInput text-slate-500 items-center flex'>{'Lb ' + addComma(((value?.general?.nilme * value?.fenicr?.formulaNiPrice / 100) / (value?.general?.mt)).toFixed(2))}</span>
// //                                     </div>
// //                                     <div className='w-24 flex flex-col justify-center'>
// //                                         <input type='input' className='input w-full h-7 text-center border-none  cursor-default rounded-none text-red-700 responsiveTextInput'
// //                                             name='crPriceArgus' value={'Argus ' + value?.fenicr?.crPriceArgus + '%'} onChange={(e) => handleChange(e, 'fenicr')} />
// //                                     </div>
// //                                     <div className=' w-24 flex flex-col justify-center'>
// //                                         <input type='input' className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 responsiveTextInput'
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
// //                         <p className="responsiveTextInput">* Fill in the red and + Formula x Ni</p>
// //                         <p className="responsiveTextInput">* Fe is calculated automatically</p>
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
//                     <p className='text-center text-slate-600 responsiveTextTitle font-semibold mb-2'>Composition</p>
//                     <div className='overflow-x-auto mb-4'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='border border-slate-500 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style responsiveTextInput'>Ni</span>
//                                 <input type='text' className='input_style text-red-700 responsiveTextInput' 
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
//                                 <span className='title_style responsiveTextInput'>Cr</span>
//                                 <input type='text' className='input_style text-red-700 responsiveTextInput' 
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
//                                 <span className='title_style responsiveTextInput'>Mo</span>
//                                 <input type='text' className='input_style text-red-700 responsiveTextInput' 
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
//                                 <span className='title_style responsiveTextInput'>Fe</span>
//                                 <input type='text' className='input_style bg-slate-100 responsiveTextInput' 
//                                     value={fe + '%'}
//                                     name='fe' 
//                                     readOnly 
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Price */}
//                     <p className='text-center text-slate-600 responsiveTextTitle font-semibold mb-2'>Price</p>
//                     <div className='overflow-x-auto mb-4'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='border border-slate-500 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Ni</span>
//                                 <input type='text' className='input_style bg-slate-100 responsiveTextInput' 
//                                     value={addComma(value.general?.nilme * value.fenicr?.formulaNiCost / 100)}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Cr</span>
//                                 <input type='text' className='input_style text-red-700 responsiveTextInput'
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
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Mo</span>
//                                 <input type='text' className='input_style text-red-700 responsiveTextInput'
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
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Fe</span>
//                                 <input type='text' className='input_style text-red-700 responsiveTextInput'
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
//                             <span className='title_style bg-blue-300 responsiveTextInput'>Ni LME</span>
//                             <input type='text' className='input_style bg-slate-100 responsiveTextInput' 
//                                 value={addComma(value?.general?.nilme)}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     {/* Formula x Ni */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-customOrange responsiveTextInput'>Formula x Ni</span>
//                             <input type='text' className='input_style bg-orange-200 text-red-600 responsiveTextInput' 
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
//                             <span className='title_style bg-customLavender responsiveTextInput'>Cost</span>
//                             <span className='title_style responsiveTextInput'>Solids Price:</span>
//                             <input type='text' className='input_style bg-orange-200 responsiveTextInput'
//                                 value={addComma(solidsPrice.toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style responsiveTextInput'>Turnings Price:</span>
//                             <input type='text' className='input_style bg-orange-200 responsiveTextInput'
//                                 value={addComma((solidsPrice * 0.92).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style responsiveTextInput'>Price/Euro:</span>
//                             <input type='text' className='input_style bg-customLime responsiveTextInput'
//                                 value={addComma((solidsPrice / value.general?.euroRate).toFixed(2), 'a')}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     <div className='text-red-600 responsiveTextInput'>
//                         <p>* Fill in the red and + Formula x Ni</p>
//                         <p>* Fe is calculated automatically</p>
//                     </div>
//                 </div>

//                 {/* SALES SECTION */}
//                 <div className="w-full">
//                     <p className='text-center text-slate-600 text-base sm:text-lg font-semibold mb-3'>Sales</p>
                    
//                     {/* Composition (Read-only) */}
//                     <p className='text-center text-slate-600 responsiveTextTitle font-semibold mb-2'>Composition</p>
//                     <div className='overflow-x-auto mb-4'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='border border-slate-500 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style responsiveTextInput'>Ni</span>
//                                 <input type='text' className='input_style bg-slate-100 responsiveTextInput'
//                                     value={value?.fenicr?.ni + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style responsiveTextInput'>Cr</span>
//                                 <input type='text' className='input_style bg-slate-100 responsiveTextInput'
//                                     value={value?.fenicr?.cr + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style responsiveTextInput'>Mo</span>
//                                 <input type='text' className='input_style bg-slate-100 responsiveTextInput'
//                                     value={value?.fenicr?.mo + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style responsiveTextInput'>Fe</span>
//                                 <input type='text' className='input_style bg-slate-100 responsiveTextInput'
//                                     value={fe + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Price */}
//                     <p className='text-center text-slate-600 responsiveTextTitle font-semibold mb-2'>Price</p>
//                     <div className='overflow-x-auto mb-2'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='border border-slate-500 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Ni</span>
//                                 <input type='text' className='input_style bg-slate-100 responsiveTextInput' 
//                                     value={addComma(value?.general?.nilme * value?.fenicr?.formulaNiPrice / 100)}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Cr</span>
//                                 <input type='text' className='input_style bg-slate-100 responsiveTextInput'
//                                     value={addComma((value.general?.chargeCrLb * value.general?.mt * value?.fenicr?.crPriceArgus / 100).toFixed(2))} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Mo</span>
//                                 <input type='text' className='input_style bg-slate-100 responsiveTextInput'
//                                     value={addComma((value.general?.MoOxideLb * value?.fenicr?.moPriceArgus * value.general?.mt / 100).toFixed(2))} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Fe</span>
//                                 <input type='text' className='input_style text-red-600 responsiveTextInput'
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
//                                 <span className='responsiveTextInput text-slate-500'>{'Lb ' + addComma(((value?.general?.nilme * value?.fenicr?.formulaNiPrice / 100) / (value?.general?.mt)).toFixed(2))}</span>
//                             </div>
//                             <div className='w-20 sm:w-24 flex justify-center items-center'>
//                                 <input type='text' className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 responsiveTextInput'
//                                     name='crPriceArgus' 
//                                     value={'Argus ' + value?.fenicr?.crPriceArgus + '%'} 
//                                     onChange={(e) => handleChange(e, 'fenicr')} 
//                                 />
//                             </div>
//                             <div className='w-20 sm:w-24 flex justify-center items-center'>
//                                 <input type='text' className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 responsiveTextInput'
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
//                             <span className='title_style bg-blue-300 responsiveTextInput'>Ni LME</span>
//                             <input type='text' className='input_style bg-slate-100 responsiveTextInput'
//                                 value={addComma(value?.general?.nilme)}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     {/* Formula x Ni */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-customOrange responsiveTextInput'>Formula x Ni</span>
//                             <input type='text' className='input_style bg-orange-200 text-red-600 responsiveTextInput' 
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
//                             <span className='title_style bg-customLavender responsiveTextInput'>Sales</span>
//                             <span className='title_style responsiveTextInput'>Solids Price:</span>
//                             <input type='text' className='input_style bg-orange-200 responsiveTextInput'
//                                 value={addComma((solidsPrice1).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style responsiveTextInput'>Turnings Price:</span>
//                             <input type='text' className='input_style bg-orange-200 responsiveTextInput'
//                                 value={addComma((solidsPrice1 * 0.9).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style responsiveTextInput'>Price/Euro:</span>
//                             <input type='text' className='input_style bg-customLime responsiveTextInput'
//                                 value={addComma((solidsPrice1 / value.general?.euroRate).toFixed(2), 'a')}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     <div className='text-red-600 responsiveTextInput'>
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

// Shared styling (style-only constants — no logic)
const headCell = "py-1.5 text-center responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)]";
const labelCls = "responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)] mb-1.5";
const inputCell = "w-full h-6 rounded-control bg-[var(--bg-subtle)] border border-[var(--line-strong)] text-center responsiveTextInput tabular-nums font-medium text-[var(--bad-text)] focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] transition-colors";
const computedInput = "w-full h-6 rounded-control bg-[var(--brand-soft)] border border-transparent text-center responsiveTextInput tabular-nums font-semibold text-[var(--brand-strong)] outline-none cursor-default";
const computedCell = "h-6 rounded-control bg-[var(--brand-soft)] flex items-center justify-center responsiveTextInput tabular-nums font-semibold text-[var(--brand-strong)]";
const pillInput = "w-full h-8 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-center responsiveTextTitle tabular-nums font-semibold text-[var(--bad-text)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors";
const resultPill = "h-8 px-3 rounded-control bg-[var(--brand-soft)] border border-[var(--brand-border)] flex items-center justify-center responsiveTextTitle tabular-nums font-semibold text-[var(--brand-strong)]";

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
        <div className="w-full">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                {/* COST SECTION */}
                <div className="w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] shadow-card overflow-hidden">
                    <div className="px-4 pt-4">
                        <h3 className="responsiveTextTitle font-display font-semibold text-[var(--ink)]">Cost</h3>
                        <p className="responsiveText text-[var(--ink-muted)] mt-0.5">Purchase-side composition and pricing</p>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <p className={labelCls}>Composition</p>
                                    <div className="rounded-2xl border border-[var(--line)] overflow-hidden w-fit bg-[var(--bg-card)]">
                                        <div className="grid grid-cols-[85px_85px_85px_85px] bg-[var(--bg-subtle)] border-b border-[var(--line)]">
                                            <div className={headCell}>Ni</div>
                                            <div className={headCell}>Cr</div>
                                            <div className={headCell}>Mo</div>
                                            <div className={headCell}>Fe</div>
                                        </div>
                                        <div className="grid grid-cols-[85px_85px_85px_85px] bg-[var(--bg-card)]">
                                            <div className="p-1">
                                                <input type="text" className={inputCell}
                                                    value={value?.fenicr?.ni + '%'} name="ni"
                                                    onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value.replace('%','') } }, "fenicr")}
                                                    onBlur={(e) => { const num = parseFloat(e.target.value.replace("%", "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                                />
                                            </div>
                                            <div className="p-1">
                                                <input type="text" className={inputCell}
                                                    value={value?.fenicr?.cr + '%'} name="cr"
                                                    onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value.replace('%','') } }, "fenicr")}
                                                    onBlur={(e) => { const num = parseFloat(e.target.value.replace("%", "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                                />
                                            </div>
                                            <div className="p-1">
                                                <input type="text" className={inputCell}
                                                    value={value?.fenicr?.mo + '%'} name="mo"
                                                    onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value.replace('%','') } }, "fenicr")}
                                                    onBlur={(e) => { const num = parseFloat(e.target.value.replace("%", "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                                />
                                            </div>
                                            <div className="p-1">
                                                <input type="text" className={computedInput}
                                                    value={fe + '%'} readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className={labelCls}>Price</p>
                                    <div className="rounded-2xl border border-[var(--line)] overflow-hidden w-fit bg-[var(--bg-card)]">
                                        <div className="grid grid-cols-[85px_85px_85px_85px] bg-[var(--bg-subtle)] border-b border-[var(--line)]">
                                            <div className={headCell}>Ni</div>
                                            <div className={headCell}>Cr</div>
                                            <div className={headCell}>Mo</div>
                                            <div className={headCell}>Fe</div>
                                        </div>
                                        <div className="grid grid-cols-[85px_85px_85px_85px] bg-[var(--bg-card)]">
                                            <div className="p-1">
                                                <input readOnly className={computedInput}
                                                    value={formatCurrency((value.general?.nilme * value.fenicr?.formulaNiCost / 100).toFixed(2))}
                                                />
                                            </div>
                                            <div className="p-1">
                                                <input type="text" className={inputCell}
                                                    name="crPrice" onChange={(e) => handleChange(e, "fenicr")}
                                                    value={focusedField === "crPrice" ? value.fenicr?.crPrice : formatCurrency(value.fenicr?.crPrice)}
                                                    onFocus={() => setFocusedField("crPrice")}
                                                    onBlur={(e) => { setFocusedField(null); const num = parseFloat(e.target.value.replace(/[^0-9.]/g, "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                                />
                                            </div>
                                            <div className="p-1">
                                                <input type="text" className={inputCell}
                                                    name="moPrice" onChange={(e) => handleChange(e, "fenicr")}
                                                    value={focusedField === "moPrice" ? value.fenicr?.moPrice : formatCurrency(value.fenicr?.moPrice)}
                                                    onFocus={() => setFocusedField("moPrice")}
                                                    onBlur={(e) => { setFocusedField(null); const num = parseFloat(e.target.value.replace(/[^0-9.]/g, "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                                />
                                            </div>
                                            <div className="p-1">
                                                <input type="text" className={inputCell}
                                                    name="fePrice" onChange={(e) => handleChange(e, "fenicr")}
                                                    value={focusedField === "fePrice" ? value.fenicr?.fePrice : formatCurrency(value.fenicr?.fePrice)}
                                                    onFocus={() => setFocusedField("fePrice")}
                                                    onBlur={(e) => { setFocusedField(null); const num = parseFloat(e.target.value.replace(/[^0-9.]/g, "")); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, "fenicr"); }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-28 shrink-0">
                                <p className={labelCls}>Ni LME</p>
                                <div className={resultPill}>{formatCurrency(Number(value.general?.nilme).toFixed(2))}</div>
                            </div>
                        </div>

                        {/* Formula x Ni */}
                        <div className="w-32">
                            <p className={labelCls}>Formula x Ni</p>
                            <input type="text" className={pillInput}
                                value={value?.fenicr?.formulaNiCost + '%'} name="formulaNiCost"
                                onChange={(e) => handleChange(e, 'fenicr')}
                                onBlur={(e) => { const num = parseFloat(e.target.value.replace('%', '')); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, 'fenicr'); }}
                            />
                        </div>

                        {/* Results */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="min-w-0">
                                <p className={labelCls}>Solids Price</p>
                                <div className={resultPill}>{formatCurrency(solidsPrice.toFixed(2))}</div>
                            </div>
                            <div className="min-w-0">
                                <p className={labelCls}>Turnings Price</p>
                                <div className={resultPill}>{formatCurrency((solidsPrice * 0.92).toFixed(2))}</div>
                            </div>
                            <div className="min-w-0">
                                <p className={labelCls}>Price / Euro</p>
                                <div className={resultPill}>{formatCurrency((solidsPrice / value.general?.euroRate).toFixed(2), '€')}</div>
                            </div>
                        </div>

                        <div className='responsiveText text-[var(--ink-muted)] space-y-0.5'>
                            <p>* Fill in the red and + Formula x Ni</p>
                            <p>* Fe is calculated automatically</p>
                        </div>
                    </div>
                </div>

                {/* SALES SECTION */}
                <div className="w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] shadow-card overflow-hidden">
                    <div className="px-4 pt-4">
                        <h3 className="responsiveTextTitle font-display font-semibold text-[var(--ink)]">Sales</h3>
                        <p className="responsiveText text-[var(--ink-muted)] mt-0.5">Sales-side composition and pricing</p>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <p className={labelCls}>Composition</p>
                                    <div className="rounded-2xl border border-[var(--line)] overflow-hidden w-fit bg-[var(--bg-card)]">
                                        <div className="grid grid-cols-[85px_85px_85px_85px] bg-[var(--bg-subtle)] border-b border-[var(--line)]">
                                            <div className={headCell}>Ni</div>
                                            <div className={headCell}>Cr</div>
                                            <div className={headCell}>Mo</div>
                                            <div className={headCell}>Fe</div>
                                        </div>
                                        <div className="grid grid-cols-[85px_85px_85px_85px] bg-[var(--bg-card)]">
                                            <div className="p-1"><div className={computedCell}>{value?.fenicr?.ni}%</div></div>
                                            <div className="p-1"><div className={computedCell}>{value?.fenicr?.cr}%</div></div>
                                            <div className="p-1"><div className={computedCell}>{value?.fenicr?.mo}%</div></div>
                                            <div className="p-1"><div className={computedCell}>{fe}%</div></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className={labelCls}>Price</p>
                                    <div className="rounded-2xl border border-[var(--line)] overflow-hidden w-fit bg-[var(--bg-card)]">
                                        <div className="grid grid-cols-[85px_85px_85px_85px] bg-[var(--bg-subtle)] border-b border-[var(--line)]">
                                            <div className={headCell}>Ni</div>
                                            <div className={headCell}>Cr</div>
                                            <div className={headCell}>Mo</div>
                                            <div className={headCell}>Fe</div>
                                        </div>
                                        <div className="grid grid-cols-[85px_85px_85px_85px] bg-[var(--bg-card)]">
                                            <div className="p-1"><div className={computedCell}>{formatCurrency((value.general?.nilme * value.fenicr?.formulaNiPrice / 100).toFixed(2))}</div></div>
                                            <div className="p-1"><div className={computedCell}>{formatCurrency((value.general?.chargeCrLb * value.general?.mt * value.fenicr?.crPriceArgus / 100).toFixed(2))}</div></div>
                                            <div className="p-1"><div className={computedCell}>{formatCurrency((value.general?.MoOxideLb * value.fenicr?.moPriceArgus * value.general?.mt / 100).toFixed(2))}</div></div>
                                            <div className="p-1">
                                                <input type="text" className={inputCell}
                                                    name="fePrice1"
                                                    value={focusedField === 'fePrice1' ? value.fenicr?.fePrice1 : formatCurrency(value.fenicr?.fePrice1)}
                                                    onFocus={() => setFocusedField('fePrice1')}
                                                    onBlur={(e) => { setFocusedField(null); const num = parseFloat(e.target.value.replace(/[^0-9.]/g, "")); if (!isNaN(num)) handleChange({ target: { name: 'fePrice1', value: num.toFixed(2) } }, 'fenicr'); }}
                                                    onChange={(e) => handleChange(e, 'fenicr')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-28 shrink-0">
                                <p className={labelCls}>Ni LME</p>
                                <div className={resultPill}>{formatCurrency(Number(value.general?.nilme).toFixed(2))}</div>
                            </div>
                        </div>

                        {/* Formula x Ni */}
                        <div className="w-32">
                            <p className={labelCls}>Formula x Ni</p>
                            <input type="text" className={pillInput}
                                value={value?.fenicr?.formulaNiPrice + '%'} name="formulaNiPrice"
                                onChange={(e) => handleChange(e, 'fenicr')}
                                onBlur={(e) => { const num = parseFloat(e.target.value.replace('%', '')); if (!isNaN(num)) handleChange({ target: { name: 'formulaNiPrice', value: num.toFixed(2) } }, 'fenicr'); }}
                            />
                        </div>

                        {/* Results */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="min-w-0">
                                <p className={labelCls}>Solids Price</p>
                                <div className={resultPill}>{formatCurrency(solidsPrice1.toFixed(2))}</div>
                            </div>
                            <div className="min-w-0">
                                <p className={labelCls}>Turnings Price</p>
                                <div className={resultPill}>{formatCurrency((solidsPrice1 * 0.9).toFixed(2))}</div>
                            </div>
                            <div className="min-w-0">
                                <p className={labelCls}>Price / Euro</p>
                                <div className={resultPill}>{formatCurrency((solidsPrice1 / value.general?.euroRate).toFixed(2), '€')}</div>
                            </div>
                        </div>

                        <div className="responsiveText text-[var(--ink-muted)] space-y-0.5">
                            <p>* Fill in the red and + Formula x Ni</p>
                            <p>* Fe is calculated automatically</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ) : null
};

export default Fenicr;
