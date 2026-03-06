
// import { useState } from "react";

// const Stainless = ({ value, handleChange }) => {
//     const [focusedField, setFocusedField] = useState(null);

//     const fe = (100 - value?.stainless?.ni - value?.stainless?.cr - value?.stainless?.mo).toFixed(2);
    
//     const solidsPrice = value?.stainless?.ni * value?.general?.nilme * value?.stainless?.formulaNiCost / 10000 +
//         value?.stainless?.cr * value?.stainless?.crPrice / 100 +
//         value?.stainless?.mo * value?.stainless?.moPrice / 100 +
//         value?.stainless?.fe * value?.stainless?.fePrice / 100

//     const solidsPrice1 = value?.stainless?.ni * value?.general?.nilme / 100 * value?.stainless?.formulaNiPrice / 100 +
//         value?.stainless?.cr / 100 * value.general?.chargeCrLb * value.general?.mt * value?.stainless?.crPriceArgus / 100 +
//         value?.stainless?.mo / 100 * (value.general?.MoOxideLb * value?.stainless?.moPriceArgus * value.general?.mt / 100) +
//         value?.stainless?.fe * value?.stainless?.fePrice1 / 100

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
//                                 <input 
//                                     type='text' 
//                                     className='input_style text-red-700 text-xs sm:text-sm' 
//                                     value={value?.stainless?.ni + '%'}
//                                     name='ni' 
//                                     onChange={(e) => {
//                                         handleChange({
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: e.target.value.replace('%', ''),
//                                             },
//                                         }, 'stainless');
//                                     }}
//                                     onBlur={(e) => {
//                                         let num = parseFloat(e.target.value.replace("%", ""));
//                                         if (isNaN(num)) num = 0;
//                                         handleChange(
//                                             {
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             },
//                                             "stainless"
//                                         );
//                                     }} 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Cr</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style text-red-700 text-xs sm:text-sm' 
//                                     value={value?.stainless?.cr + '%'}
//                                     name='cr' 
//                                     onChange={(e) => {
//                                         handleChange({
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: e.target.value.replace('%', ''),
//                                             },
//                                         }, 'stainless');
//                                     }}
//                                     onBlur={(e) => {
//                                         let num = parseFloat(e.target.value.replace("%", ""));
//                                         if (isNaN(num)) num = 0;
//                                         handleChange(
//                                             {
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             },
//                                             "stainless"
//                                         );
//                                     }} 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Mo</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style text-red-700 text-xs sm:text-sm' 
//                                     value={value?.stainless?.mo + '%'}
//                                     name='mo' 
//                                     onChange={(e) => {
//                                         handleChange({
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: e.target.value.replace('%', ''),
//                                             },
//                                         }, 'stainless');
//                                     }}
//                                     onBlur={(e) => {
//                                         let num = parseFloat(e.target.value.replace("%", ""));
//                                         if (isNaN(num)) num = 0;
//                                         handleChange(
//                                             {
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             },
//                                             "stainless"
//                                         );
//                                     }} 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Fe</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm' 
//                                     value={fe + '%'}
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
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm' 
//                                     value={addComma(value.general?.nilme * value.stainless?.formulaNiCost / 100)}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Cr</span>
//                                 <input
//                                     type="text"
//                                     className="input_style text-red-700 text-xs sm:text-sm"
//                                     name="crPrice"
//                                     value={
//                                         focusedField === "crPrice"
//                                             ? value.stainless?.crPrice ?? ""
//                                             : value.stainless?.crPrice !== undefined && value.stainless?.crPrice !== ""
//                                                 ? addComma(parseFloat(value.stainless.crPrice).toFixed(2))
//                                                 : "0.00"
//                                     }
//                                     onChange={(e) => handleChange(e, "stainless")}
//                                     onFocus={() => setFocusedField("crPrice")}
//                                     onBlur={(e) => {
//                                         setFocusedField(null);
//                                         let num = parseFloat(e.target.value);
//                                         if (isNaN(num)) num = 0;
//                                         handleChange(
//                                             {
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             },
//                                             "stainless"
//                                         );
//                                     }}
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Mo</span>
//                                 <input
//                                     type="text"
//                                     className="input_style text-red-700 text-xs sm:text-sm"
//                                     name="moPrice"
//                                     value={
//                                         focusedField === "moPrice"
//                                             ? value.stainless?.moPrice ?? ""
//                                             : value.stainless?.moPrice !== undefined && value.stainless?.moPrice !== ""
//                                                 ? addComma(parseFloat(value.stainless.moPrice).toFixed(2))
//                                                 : "0.00"
//                                     }
//                                     onChange={(e) => handleChange(e, "stainless")}
//                                     onFocus={() => setFocusedField("moPrice")}
//                                     onBlur={(e) => {
//                                         setFocusedField(null);
//                                         let num = parseFloat(e.target.value.replace(/,/g, ""));
//                                         if (isNaN(num)) num = 0;
//                                         handleChange(
//                                             {
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             },
//                                             "stainless"
//                                         );
//                                     }}
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Fe</span>
//                                 <input
//                                     type="text"
//                                     className="input_style text-red-700 text-xs sm:text-sm"
//                                     name="fePrice"
//                                     value={
//                                         focusedField === "fePrice"
//                                             ? value.stainless?.fePrice ?? ""
//                                             : value.stainless?.fePrice !== undefined && value.stainless?.fePrice !== ""
//                                                 ? addComma(parseFloat(value.stainless.fePrice).toFixed(2))
//                                                 : "0.00"
//                                     }
//                                     onChange={(e) => handleChange(e, "stainless")}
//                                     onFocus={() => setFocusedField("fePrice")}
//                                     onBlur={(e) => {
//                                         setFocusedField(null);
//                                         let num = parseFloat(e.target.value.replace(/,/g, ""));
//                                         if (isNaN(num)) num = 0;
//                                         handleChange(
//                                             {
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             },
//                                             "stainless"
//                                         );
//                                     }}
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Ni LME Display */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-blue-300 text-xs sm:text-sm'>Ni LME</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-slate-100 text-xs sm:text-sm' 
//                                 value={addComma(value?.general?.nilme)}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     {/* Formula x Ni */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-customOrange text-xs sm:text-sm'>Formula x Ni</span>
//                             <input
//                                 type="text"
//                                 className="input_style bg-orange-200 text-red-600 text-xs sm:text-sm"
//                                 name="formulaNiCost"
//                                 value={
//                                     value?.stainless?.formulaNiCost !== undefined && value.stainless.formulaNiCost !== ""
//                                         ? value.stainless.formulaNiCost + "%"
//                                         : "0.00%"
//                                 }
//                                 onChange={(e) =>
//                                     handleChange(
//                                         {
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: e.target.value.replace("%", ""),
//                                             },
//                                         },
//                                         "stainless"
//                                     )
//                                 }
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
//                                         "stainless"
//                                     );
//                                 }}
//                             />
//                         </div>
//                     </div>

//                     {/* Results */}
//                     <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4'>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style bg-customLavender text-xs sm:text-sm'>Cost</span>
//                             <span className='title_style text-xs sm:text-sm'>Solids Price:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 text-xs sm:text-sm'
//                                 value={addComma(solidsPrice.toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style text-xs sm:text-sm'>Turnings Price:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 text-xs sm:text-sm'
//                                 value={addComma((solidsPrice * 0.9).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style text-xs sm:text-sm'>Price/Euro:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-customLime text-xs sm:text-sm'
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
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={value?.stainless?.ni + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Cr</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={value?.stainless?.cr + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Mo</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={value?.stainless?.mo + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style text-xs sm:text-sm'>Fe</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={value?.stainless?.fe + '%'} 
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
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm' 
//                                     value={addComma(value?.general?.nilme * value?.stainless?.formulaNiPrice / 100)}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Cr</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={addComma((value.general?.chargeCrLb * value.general?.mt * value?.stainless?.crPriceArgus / 100).toFixed(2))} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Mo</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 text-xs sm:text-sm'
//                                     value={addComma((value.general?.MoOxideLb * value?.stainless?.moPriceArgus * value.general?.mt / 100).toFixed(2))} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r bg-slate-100 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender text-xs sm:text-sm'>Fe</span>
//                                 <input
//                                     type="text"
//                                     className="input_style text-red-600 text-xs sm:text-sm"
//                                     name="fePrice1"
//                                     value={
//                                         focusedField === "fePrice1"
//                                             ? value.stainless?.fePrice1 ?? ""
//                                             : value.stainless?.fePrice1 !== undefined && value.stainless?.fePrice1 !== ""
//                                                 ? addComma(parseFloat(value.stainless.fePrice1).toFixed(2))
//                                                 : "0.00"
//                                     }
//                                     onChange={(e) => handleChange(e, "stainless")}
//                                     onFocus={() => setFocusedField("fePrice1")}
//                                     onBlur={(e) => {
//                                         setFocusedField(null);
//                                         let num = parseFloat(e.target.value.replace(/,/g, ""));
//                                         if (isNaN(num)) num = 0;
//                                         handleChange(
//                                             {
//                                                 target: {
//                                                     name: e.target.name,
//                                                     value: num.toFixed(2),
//                                                 },
//                                             },
//                                             "stainless"
//                                         );
//                                     }}
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Argus percentages */}
//                     <div className='overflow-x-auto mb-4'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='w-20 sm:w-24 flex justify-center items-center'>
//                                 <span className='text-xs text-slate-500'>{'Lb ' + addComma(((value?.general?.nilme * value?.stainless?.formulaNiPrice / 100) / (value.general?.mt)).toFixed(2))}</span>
//                             </div>
//                             <div className='w-20 sm:w-24 flex justify-center items-center'>
//                                 <input 
//                                     type='text' 
//                                     className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 text-xs'
//                                     name='crPriceArgus' 
//                                     value={'Argus ' + value?.stainless?.crPriceArgus + '%'} 
//                                     onChange={(e) => handleChange(e, 'stainless')} 
//                                 />
//                             </div>
//                             <div className='w-20 sm:w-24 flex justify-center items-center'>
//                                 <input 
//                                     type='text' 
//                                     className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 text-xs'
//                                     name='moPriceArgus' 
//                                     value={'Argus ' + value?.stainless?.moPriceArgus + '%'} 
//                                     onChange={(e) => handleChange(e, 'stainless')} 
//                                 />
//                             </div>
//                         </div>
//                     </div>

//                     {/* Ni LME Display */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-blue-300 text-xs sm:text-sm'>Ni LME</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-slate-100 text-xs sm:text-sm'
//                                 value={addComma(value?.general?.nilme)}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     {/* Formula x Ni */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-customOrange text-xs sm:text-sm'>Formula x Ni</span>
//                             <input
//                                 type="text"
//                                 className="input_style bg-orange-200 text-red-600 text-xs sm:text-sm"
//                                 name="formulaNiPrice"
//                                 value={
//                                     value?.stainless?.formulaNiPrice !== undefined && value.stainless.formulaNiPrice !== ""
//                                         ? value.stainless.formulaNiPrice + "%"
//                                         : "0.00%"
//                                 }
//                                 onChange={(e) =>
//                                     handleChange(
//                                         {
//                                             target: {
//                                                 name: e.target.name,
//                                                 value: e.target.value.replace("%", ""),
//                                             },
//                                         },
//                                         "stainless"
//                                     )
//                                 }
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
//                                         "stainless"
//                                     );
//                                 }}
//                             />
//                         </div>
//                     </div>

//                     {/* Results */}
//                     <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4'>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style bg-customLavender text-xs sm:text-sm'>Sales</span>
//                             <span className='title_style text-xs sm:text-sm'>Solids Price:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 text-xs sm:text-sm'
//                                 value={addComma((solidsPrice1).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style text-xs sm:text-sm'>Turnings Price:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 rounded-none text-xs sm:text-sm'
//                                 value={addComma((solidsPrice1 * 0.9).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style text-xs sm:text-sm'>Price/Euro:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-customLime text-xs sm:text-sm'
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
//     )
// };

// export default Stainless;

import { useState } from "react";

const Stainless = ({ value, handleChange }) => {
    const [focusedField, setFocusedField] = useState(null);

    const fe = (100 - value?.stainless?.ni - value?.stainless?.cr - value?.stainless?.mo).toFixed(2);
    
    const solidsPrice = value?.stainless?.ni * value?.general?.nilme * value?.stainless?.formulaNiCost / 10000 +
        value?.stainless?.cr * value?.stainless?.crPrice / 100 +
        value?.stainless?.mo * value?.stainless?.moPrice / 100 +
        value?.stainless?.fe * value?.stainless?.fePrice / 100

    const solidsPrice1 = value?.stainless?.ni * value?.general?.nilme / 100 * value?.stainless?.formulaNiPrice / 100 +
        value?.stainless?.cr / 100 * value.general?.chargeCrLb * value.general?.mt * value?.stainless?.crPriceArgus / 100 +
        value?.stainless?.mo / 100 * (value.general?.MoOxideLb * value?.stainless?.moPriceArgus * value.general?.mt / 100) +
        value?.stainless?.fe * value?.stainless?.fePrice1 / 100

    const formatCurrency = (num, symbol = '$') => {
        if (!num && num !== 0) return symbol + '0';
        const str = num.toString();
        const parts = str.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return symbol + parts.join('.');
    }

        return value.stainless != null ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
                {/* COST SECTION */}
                <div className="w-full bg-white rounded-xl border border-[#D9ECFF] shadow-sm p-3 text-center">
                    <h3 className='text-base text-[var(--endeavour)] mb-3'>Cost</h3>
                    
                    {/* Composition */}
                    <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2 text-center">
                        Composition
                    </p>

                    <div className="rounded-xl overflow-hidden border border-[#D9ECFF] bg-white grid grid-cols-4">
                        {/* Ni */}
                        <div>
                        <div className="bg-[#EAF4FF]  py-1 text-xs text-center text-[#2F6FDB] border-b border-[#dedede] font-normal">
                            Ni
                        </div>
                        <input
                            type="text"
                            className="w-full py-2 text-center text-sm outline-none bg-[#fafafa]"
                            value={value?.stainless?.ni + '%'}
                            name="ni"
                            onChange={(e) =>
                            handleChange(
                                {
                                target: {
                                    name: e.target.name,
                                    value: e.target.value.replace('%', ''),
                                },
                                },
                                'stainless'
                            )
                            }
                            onBlur={(e) => {
                            const num = parseFloat(e.target.value.replace('%', ''));
                            if (!isNaN(num)) {
                                handleChange(
                                {
                                    target: { name: e.target.name, value: num.toFixed(2) },
                                },
                                'stainless'
                                );
                            }
                            }}
                        />
                        </div>

                        {/* Cr */}
                        <div className="border-l border-[#dedede]">
                        <div className="bg-[#EAF4FF] py-1 text-xs text-center text-[#2F6FDB] border-b border-[#D9ECFF] font-normal">
                            Cr
                        </div>
                        <input
                            type="text"
                            className="w-full py-2 text-center text-sm outline-none bg-[#fafafa]"
                            value={value?.stainless?.cr + '%'}
                            name="cr"
                            onChange={(e) =>
                            handleChange(
                                {
                                target: {
                                    name: e.target.name,
                                    value: e.target.value.replace('%', ''),
                                },
                                },
                                'stainless'
                            )
                            }
                            onBlur={(e) => {
                            const num = parseFloat(e.target.value.replace('%', ''));
                            if (!isNaN(num)) {
                                handleChange(
                                {
                                    target: { name: e.target.name, value: num.toFixed(2) },
                                },
                                'stainless'
                                );
                            }
                            }}
                        />
                        </div>

                        {/* Mo */}
                        <div className="border-l border-[#dedede]">
                        <div className="bg-[#EAF4FF] py-1 text-xs text-center text-[#2F6FDB] border-b border-[#D9ECFF] font-normal">
                            Mo
                        </div>
                        <input
                            type="text"
                            className="w-full py-2 text-center text-sm  outline-none bg-[#fafafa]"
                            value={value?.stainless?.mo + '%'}
                            name="mo"
                            onChange={(e) =>
                            handleChange(
                                {
                                target: {
                                    name: e.target.name,
                                    value: e.target.value.replace('%', ''),
                                },
                                },
                                'stainless'
                            )
                            }
                            onBlur={(e) => {
                            const num = parseFloat(e.target.value.replace('%', ''));
                            if (!isNaN(num)) {
                                handleChange(
                                {
                                    target: { name: e.target.name, value: num.toFixed(2) },
                                },
                                'stainless'
                                );
                            }
                            }}
                        />
                        </div>

                        {/* Fe */}
                        <div className="border-l border-[#dedede]">
                        <div className="bg-[#EAF4FF] py-1 text-xs text-center text-[#2F6FDB] border-b border-[#D9ECFF] font-normal">
                            Fe
                        </div>
                        <input
                            type="text"
                            className="w-full py-2 text-center text-sm cursor-not-allowed border-0 bg-[#fafafa]"
                            value={fe + '%'}
                            readOnly
                        />
                        </div>
                    </div>
                    </div>


                    {/* Price Row */}
                    <div className="mb-3 mt-4">
                    <p className="text-sm font-normal text-gray-600 mb-2 text-center">
                        Price
                    </p>

                    <div className="rounded-xl overflow-hidden border border-[#dedede] bg-white grid grid-cols-4">
                        {/* Ni */}
                        <div>
                        <div className="bg-[#E9E2FF] py-1 text-xs text-center text-[#2F6FDB] border-b border-[#D9ECFF] font-normal">
                            Ni
                        </div>
                        <input
                            type="text"
                            className="w-full py-2 text-center text-sm bg-white text-[var(--endeavour)] border-0 cursor-not-allowed bg-[#fafafa]"
                            value={formatCurrency(
                            (value.general?.nilme * value.stainless?.formulaNiCost / 100).toFixed(2)
                            )}
                            readOnly
                        />
                        </div>

                        {/* Cr */}
                        <div className="border-l border-[#D9ECFF]">
                        <div className="bg-[#E9E2FF] py-1 text-xs text-center text-[#2F6FDB] border-b border-[#D9ECFF] font-normal">
                            Cr
                        </div>
                        <input
                            type="text"
                            className="w-full py-2 text-center text-sm outline-none text-[#F44336] focus:ring-1 focus:ring-[var(--endeavour)]"
                            name="crPrice"
                            value={
                            focusedField === 'crPrice'
                                ? value.stainless?.crPrice
                                : formatCurrency(value.stainless?.crPrice)
                            }
                            onChange={(e) => handleChange(e, 'stainless')}
                            onFocus={() => setFocusedField('crPrice')}
                            onBlur={(e) => {
                            setFocusedField(null);
                            const num = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                            if (!isNaN(num)) {
                                handleChange(
                                {
                                    target: { name: e.target.name, value: num.toFixed(2) },
                                },
                                'stainless'
                                );
                            }
                            }}
                        />
                        </div>

                        {/* Mo */}
                        <div className="border-l border-[#D9ECFF]">
                        <div className="bg-[#E9E2FF] py-1 text-xs text-center text-[#2F6FDB] border-b border-[#D9ECFF] font-normal">
                            Mo
                        </div>
                        <input
                            type="text"
                            className="w-full py-2 text-center text-sm  outline-none text-[#F44336] focus:ring-1 focus:ring-[var(--endeavour)]"
                            name="moPrice"
                            value={
                            focusedField === 'moPrice'
                                ? value.stainless?.moPrice
                                : formatCurrency(value.stainless?.moPrice)
                            }
                            onChange={(e) => handleChange(e, 'stainless')}
                            onFocus={() => setFocusedField('moPrice')}
                            onBlur={(e) => {
                            setFocusedField(null);
                            const num = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                            if (!isNaN(num)) {
                                handleChange(
                                {
                                    target: { name: e.target.name, value: num.toFixed(2) },
                                },
                                'stainless'
                                );
                            }
                            }}
                        />
                        </div>

                        {/* Fe */}
                        <div className="border-l border-[#D9ECFF]">
                        <div className="bg-[#E9E2FF] py-1 text-xs text-center text-[#2F6FDB] border-b border-[#D9ECFF] font-normal">
                            Fe
                        </div>
                        <input
                            type="text"
                            className="w-full py-2 text-center text-sm outline-none text-[#F44336] focus:ring-1 focus:ring-[var(--endeavour)]"
                            name="fePrice"
                            value={
                            focusedField === 'fePrice'
                                ? value.stainless?.fePrice
                                : formatCurrency(value.stainless?.fePrice)
                            }
                            onChange={(e) => handleChange(e, 'stainless')}
                            onFocus={() => setFocusedField('fePrice')}
                            onBlur={(e) => {
                            setFocusedField(null);
                            const num = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                            if (!isNaN(num)) {
                                handleChange(
                                {
                                    target: { name: e.target.name, value: num.toFixed(2) },
                                },
                                'stainless'
                                );
                            }
                            }}
                        />
                        </div>
                    </div>
                    </div>

                    {/* Formula x Ni */}
                    <div className="mb-3 mt-4 flex">
                    <div className="w-36 rounded-xl overflow-hidden border border-[#dedede] bg-white">
                        
                        {/* Header strip */}
                        <div className="bg-[#FFDADA] text-[#F44336] text-xs py-2 text-center">
                        Formula x Ni
                        </div>

                        {/* Value */}
                        <input
                        type="text"
                        className="w-full text-center py-1 outline-none text-xs text-[#F44336] bg-[#fafafa]"
                        name="formulaNiCost"
                        value={value?.stainless?.formulaNiCost + '%'}
                        onChange={(e) =>
                            handleChange(
                            {
                                target: {
                                name: e.target.name,
                                value: e.target.value.replace('%', ''),
                                },
                            },
                            'stainless'
                            )
                        }
                        onBlur={(e) => {
                            const num = parseFloat(e.target.value.replace('%', ''));
                            if (!isNaN(num)) {
                            handleChange(
                                {
                                target: {
                                    name: e.target.name,
                                    value: num.toFixed(2),
                                },
                                },
                                'stainless'
                            );
                            }
                        }}
                        />
                    </div>
                    </div>


                    {/* Results */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 mt-8">

                    {/* Solids Price */}
                        <div className="rounded-xl overflow-hidden border border-[#dedede] bg-white text-center">
                        <div className="bg-[#FFECEC] py-1">
                        <p className="text-xs text-[#2F6FDB] ">
                            Solids Price
                        </p>
                        </div>
                        <div className="py-2 text-xs  text-[#2F6FDB] bg-[#fafafa]">
                        {formatCurrency(solidsPrice.toFixed(2))}
                        </div>
                    </div>

                    {/* Turnings Price */}
                    <div className="rounded-xl overflow-hidden border border-[#dedede] bg-white text-center">
                        <div className="bg-[#FFECEC] py-1">
                        <p className="text-xs text-[#2F6FDB] ">
                            Turnings Price
                        </p>
                        </div>
                        <div className="py-2 text-sm  text-[#2F6FDB] bg-[#fafafa]">
                        {formatCurrency((solidsPrice * 0.92).toFixed(2))}
                        </div>
                    </div>

                    {/* Price / Euro */}
                    <div className="rounded-xl overflow-hidden border border-[#dedede] bg-white text-center">
                        <div className="bg-[#E9FFF1] py-1">
                        <p className="text-xs text-[#2F6FDB]">
                            Price / Euro
                        </p>
                        </div>
                        <div className="py-2 text-sm text-[#2F6FDB] bg-[#fafafa]">
                        {formatCurrency(
                            (solidsPrice / value.general?.euroRate).toFixed(2),
                            '€'
                        )}
                        </div>
                    </div>

                    </div>

                    <div className='text-xs text-[var(--endeavour)]  space-y-1 text-left'>
                        <p>* Fill in the red and + Formula x Ni</p>
                        <p>* Fe is calculated automatically</p>
                    </div>
                </div>

                {/* SALES SECTION */}
                <div className="w-full bg-white rounded-xl border border-[#D9ECFF] shadow-sm p-3 text-center">
                    <h3 className='text-base text-[var(--endeavour)] mb-3'>Sales</h3>
                    {/* Composition (Read-only) */}
                    <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2 text-center">Composition</p>

                    <div className="rounded-xl overflow-hidden border border-[#dedede] bg-white grid grid-cols-4">
                        {[
                        { label: 'Ni', value: value?.stainless?.ni + '%' },
                        { label: 'Cr', value: value?.stainless?.cr + '%' },
                        { label: 'Mo', value: value?.stainless?.mo + '%' },
                        { label: 'Fe', value: fe + '%' },
                        ].map((item, idx) => (
                        <div key={item.label} className={idx > 0 ? 'border-l border-[#D9ECFF]' : ''}>
                            <div className="bg-[#EAF4FF] text-center py-1 text-xs text-[#2F6FDB] border-b border-[#dedede] font-normal">
                            {item.label}
                            </div>
                            <div className="py-2 text-sm text-center bg-[#fafafa]">
                            {item.value}
                            </div>
                        </div>
                        ))}
                    </div>
                    </div>


                     {/* Price */}
                    <div className="mb-3 mt-4">
                    <p className="text-sm font-normal text-gray-600 mb-2 text-center">Price</p>

                    <div className="rounded-xl overflow-hidden border border-[#D9ECFF] bg-white grid grid-cols-4">
                        {/* Ni */}
                        <div>
                        <div className="bg-[#E9E2FF] text-center py-1 text-xs text-[#2F6FDB] border-b border-[#dedede] font-normal">
                            Ni
                        </div>
                        <div className="py-2 text-sm text-center text-[#2F6FDB] bg-[#fafafa]">
                            {formatCurrency(
                            (value?.general?.nilme * value?.stainless?.formulaNiPrice / 100).toFixed(2)
                            )}
                        </div>
                        </div>

                        {/* Cr */}
                        <div className="border-l border-[#D9ECFF]">
                        <div className="bg-[#E9E2FF] text-center py-1 text-xs text-[#2F6FDB] border-b border-[#dedede] font-normal">
                            Cr
                        </div>
                        <div className="py-2 text-sm text-center text-[#F44336] bg-[#fafafa]">
                            {formatCurrency(
                            (value.general?.chargeCrLb * value.general?.mt * value?.stainless?.crPriceArgus / 100).toFixed(2)
                            )}
                        </div>
                        </div>

                        {/* Mo */}
                        <div className="border-l border-[#D9ECFF]">
                        <div className="bg-[#E9E2FF] text-center py-1 text-xs  text-[#2F6FDB] border-b border-[#dedede] font-normal">
                            Mo
                        </div>
                        <div className="py-2 text-sm text-center text-[#F44336] bg-[#fafafa]">
                            {formatCurrency(
                            (value.general?.MoOxideLb * value?.stainless?.moPriceArgus * value.general?.mt / 100).toFixed(2)
                            )}
                        </div>
                        </div>

                        {/* Fe (editable) */}
                        <div className="border-l border-[#D9ECFF]">
                        <div className="bg-[#E9E2FF] text-center py-1 text-xs text-[#2F6FDB] border-b border-[#dedede] font-normal">
                            Fe
                        </div>
                        <input
                            type="text"
                            className="w-full py-2 text-sm text-center text-[#F44336] outline-none bg-[#fafafa]"
                            name="fePrice1"
                            value={
                            focusedField === 'fePrice1'
                                ? value.stainless?.fePrice1
                                : formatCurrency(value.stainless?.fePrice1)
                            }
                            onChange={(e) => handleChange(e, 'stainless')}
                            onFocus={() => setFocusedField('fePrice1')}
                            onBlur={(e) => {
                            setFocusedField(null);
                            const num = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                            if (!isNaN(num)) {
                                handleChange(
                                { target: { name: e.target.name, value: num.toFixed(2) } },
                                'stainless'
                                );
                            }
                            }}
                        />
                        </div>
                    </div>
                    </div>

                    {/* Formula x Ni */}
                     <div className="mb-3 mt-4 flex">
                    <div className="w-36 rounded-xl overflow-hidden border border-[#dedede] bg-white">
                        
                        <div className="bg-[#FFDADA] text-[#F44336] text-xs py-2 text-center">
                        Formula x Ni
                        </div>

                        <input
                        type="text"
                        className="w-full text-center py-1 outline-none text-sm text-[#F44336] bg-[#fafafa]"
                        name="formulaNiPrice"
                        value={value?.stainless?.formulaNiPrice + '%'}
                        onChange={(e) =>
                            handleChange(
                            {
                                target: {
                                name: e.target.name,
                                value: e.target.value.replace('%', ''),
                                },
                            },
                            'stainless'
                            )
                        }
                        onBlur={(e) => {
                            const num = parseFloat(e.target.value.replace('%', ''));
                            if (!isNaN(num)) {
                            handleChange(
                                { target: { name: e.target.name, value: num.toFixed(2) } },
                                'stainless'
                            );
                            }
                        }}
                        />
                    </div>
                    </div>

                    {/* Results */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 mt-8">

                    <div className="rounded-xl overflow-hidden border border-[#dedede] bg-white text-center">
                        <div className="bg-[#FFECEC] py-1">
                        <p className="text-xs  text-[#2F6FDB]">Solids Price</p>
                        </div>
                        <div className="py-2 text-sm  text-[#2F6FDB] bg-[#fafafa]">
                        {formatCurrency(solidsPrice.toFixed(2))}
                        </div>
                    </div>

                        <div className="rounded-xl overflow-hidden border border-[#dedede] bg-white text-center">
                        <div className="bg-[#FFECEC] py-1">
                        <p className="text-xs  text-[#2F6FDB]">Turnings Price</p>
                        </div>
                        <div className="py-1 text-xs  text-[#2F6FDB] bg-[#fafafa]">
                        {formatCurrency((solidsPrice * 0.92).toFixed(2))}
                        </div>
                    </div>

                        <div className="rounded-xl overflow-hidden border border-[#dedede] bg-white text-center">
                        <div className="bg-[#E9FFF1] py-1">
                        <p className="text-xs  text-[#2F6FDB]">Price / Euro</p>
                        </div>
                        <div className="py-1 text-xs  text-[#2F6FDB] bg-[#fafafa]">
                        {formatCurrency((solidsPrice / value.general?.euroRate).toFixed(2), '€')}
                        </div>
                    </div>

                    </div>


                    <div className='text-xs text-[var(--endeavour)]  space-y-1 text-left'>
                        <p>* Fill in the red and + Formula x Ni</p>
                        <p>* Fe is calculated automatically</p>
                    </div>
                </div>
            </div>
    ) : null;
};

export default Stainless;