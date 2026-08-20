
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
//                     <p className='text-center text-slate-600 responsiveTextTitle font-semibold mb-2'>Composition</p>
//                     <div className='overflow-x-auto mb-4'>
//                         <div className='flex justify-center min-w-[400px]'>
//                             <div className='border border-slate-500 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style responsiveTextInput'>Ni</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style text-red-700 responsiveTextInput' 
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
//                                 <span className='title_style responsiveTextInput'>Cr</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style text-red-700 responsiveTextInput' 
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
//                                 <span className='title_style responsiveTextInput'>Mo</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style text-red-700 responsiveTextInput' 
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
//                                 <span className='title_style responsiveTextInput'>Fe</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 responsiveTextInput' 
//                                     value={fe + '%'}
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
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 responsiveTextInput' 
//                                     value={addComma(value.general?.nilme * value.stainless?.formulaNiCost / 100)}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Cr</span>
//                                 <input
//                                     type="text"
//                                     className="input_style text-red-700 responsiveTextInput"
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
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Mo</span>
//                                 <input
//                                     type="text"
//                                     className="input_style text-red-700 responsiveTextInput"
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
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Fe</span>
//                                 <input
//                                     type="text"
//                                     className="input_style text-red-700 responsiveTextInput"
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
//                             <span className='title_style bg-blue-300 responsiveTextInput'>Ni LME</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-slate-100 responsiveTextInput' 
//                                 value={addComma(value?.general?.nilme)}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     {/* Formula x Ni */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-customOrange responsiveTextInput'>Formula x Ni</span>
//                             <input
//                                 type="text"
//                                 className="input_style bg-orange-200 text-red-600 responsiveTextInput"
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
//                             <span className='title_style bg-customLavender responsiveTextInput'>Cost</span>
//                             <span className='title_style responsiveTextInput'>Solids Price:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 responsiveTextInput'
//                                 value={addComma(solidsPrice.toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style responsiveTextInput'>Turnings Price:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 responsiveTextInput'
//                                 value={addComma((solidsPrice * 0.9).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style responsiveTextInput'>Price/Euro:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-customLime responsiveTextInput'
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
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 responsiveTextInput'
//                                     value={value?.stainless?.ni + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style responsiveTextInput'>Cr</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 responsiveTextInput'
//                                     value={value?.stainless?.cr + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style responsiveTextInput'>Mo</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 responsiveTextInput'
//                                     value={value?.stainless?.mo + '%'} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style responsiveTextInput'>Fe</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 responsiveTextInput'
//                                     value={value?.stainless?.fe + '%'} 
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
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 responsiveTextInput' 
//                                     value={addComma(value?.general?.nilme * value?.stainless?.formulaNiPrice / 100)}
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Cr</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 responsiveTextInput'
//                                     value={addComma((value.general?.chargeCrLb * value.general?.mt * value?.stainless?.crPriceArgus / 100).toFixed(2))} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Mo</span>
//                                 <input 
//                                     type='text' 
//                                     className='input_style bg-slate-100 responsiveTextInput'
//                                     value={addComma((value.general?.MoOxideLb * value?.stainless?.moPriceArgus * value.general?.mt / 100).toFixed(2))} 
//                                     readOnly 
//                                 />
//                             </div>
//                             <div className='border-y border-slate-500 border-r bg-slate-100 w-20 sm:w-24 flex flex-col justify-center'>
//                                 <span className='title_style bg-customLavender responsiveTextInput'>Fe</span>
//                                 <input
//                                     type="text"
//                                     className="input_style text-red-600 responsiveTextInput"
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
//                                 <span className='responsiveTextInput text-slate-500'>{'Lb ' + addComma(((value?.general?.nilme * value?.stainless?.formulaNiPrice / 100) / (value.general?.mt)).toFixed(2))}</span>
//                             </div>
//                             <div className='w-20 sm:w-24 flex justify-center items-center'>
//                                 <input 
//                                     type='text' 
//                                     className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 responsiveTextInput'
//                                     name='crPriceArgus' 
//                                     value={'Argus ' + value?.stainless?.crPriceArgus + '%'} 
//                                     onChange={(e) => handleChange(e, 'stainless')} 
//                                 />
//                             </div>
//                             <div className='w-20 sm:w-24 flex justify-center items-center'>
//                                 <input 
//                                     type='text' 
//                                     className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 responsiveTextInput'
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
//                             <span className='title_style bg-blue-300 responsiveTextInput'>Ni LME</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-slate-100 responsiveTextInput'
//                                 value={addComma(value?.general?.nilme)}
//                                 readOnly 
//                             />
//                         </div>
//                     </div>

//                     {/* Formula x Ni */}
//                     <div className='flex justify-center mb-4'>
//                         <div className='border border-slate-500 w-24 sm:w-28 flex flex-col'>
//                             <span className='title_style bg-customOrange responsiveTextInput'>Formula x Ni</span>
//                             <input
//                                 type="text"
//                                 className="input_style bg-orange-200 text-red-600 responsiveTextInput"
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
//                             <span className='title_style bg-customLavender responsiveTextInput'>Sales</span>
//                             <span className='title_style responsiveTextInput'>Solids Price:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 responsiveTextInput'
//                                 value={addComma((solidsPrice1).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style responsiveTextInput'>Turnings Price:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-orange-200 rounded-none responsiveTextInput'
//                                 value={addComma((solidsPrice1 * 0.9).toFixed(2))}
//                                 readOnly 
//                             />
//                         </div>
//                         <div className='border border-slate-500 flex flex-col'>
//                             <span className='title_style responsiveTextInput'>Price/Euro:</span>
//                             <input 
//                                 type='text' 
//                                 className='input_style bg-customLime responsiveTextInput'
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
//     )
// };

// export default Stainless;

import { useState } from "react";

// Shared styling (style-only constants — no logic)
/* Composition and Price share one column width so their Ni/Cr/Mo/Fe line up with
   each other, and it is sized to the widest value EITHER can hold — a price like
   "$57,408.30" at --fs-input with tabular figures. At 85px the cell left ~76px of
   content box for a value that measures ~78px, so prices sat on the edge of being
   clipped while the percentages beside them used barely half their cell. 104px
   clears the longest price with room and keeps both grids aligned. */
const headCell = "py-1.5 text-center responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)]";
const labelCls = "responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)] mb-1.5";
const inputCell = "w-full h-8 rounded-control bg-[var(--bg-subtle)] border border-[var(--line-strong)] text-center responsiveTextInput tabular-nums font-medium text-[var(--bad-text)] focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] transition-colors";
const computedInput = "w-full h-8 rounded-control bg-[var(--brand-soft)] border border-transparent text-center responsiveTextInput tabular-nums font-medium text-[var(--brand-strong)] outline-none cursor-default";
const computedCell = "h-8 rounded-control bg-[var(--brand-soft)] flex items-center justify-center responsiveTextInput tabular-nums font-medium text-[var(--brand-strong)]";
const pillInput = "w-full h-8 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-center responsiveTextInput tabular-nums font-medium text-[var(--bad-text)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors";
const resultPill = "h-8 px-3 rounded-control bg-[var(--brand-soft)] border border-[var(--brand-border)] flex items-center justify-center responsiveTextInput tabular-nums font-medium text-[var(--brand-strong)]";

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
                                    <div className="grid grid-cols-[104px_104px_104px_104px] bg-[var(--bg-subtle)] border-b border-[var(--line)]">
                                        <div className={headCell}>Ni</div>
                                        <div className={headCell}>Cr</div>
                                        <div className={headCell}>Mo</div>
                                        <div className={headCell}>Fe</div>
                                    </div>
                                    <div className="grid grid-cols-[104px_104px_104px_104px] bg-[var(--bg-card)]">
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                className={inputCell}
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
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                className={inputCell}
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
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                className={inputCell}
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
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                className={computedInput}
                                                value={fe + '%'}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price Row */}
                            <div>
                                <p className={labelCls}>Price</p>
                                <div className="rounded-2xl border border-[var(--line)] overflow-hidden w-fit bg-[var(--bg-card)]">
                                    <div className="grid grid-cols-[104px_104px_104px_104px] bg-[var(--bg-subtle)] border-b border-[var(--line)]">
                                        <div className={headCell}>Ni</div>
                                        <div className={headCell}>Cr</div>
                                        <div className={headCell}>Mo</div>
                                        <div className={headCell}>Fe</div>
                                    </div>
                                    <div className="grid grid-cols-[104px_104px_104px_104px] bg-[var(--bg-card)]">
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                className={computedInput}
                                                value={formatCurrency(
                                                    (value.general?.nilme * value.stainless?.formulaNiCost / 100).toFixed(2)
                                                )}
                                                readOnly
                                            />
                                        </div>
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                className={inputCell}
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
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                className={inputCell}
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
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                className={inputCell}
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
                            name="formulaNiCost" value={value?.stainless?.formulaNiCost + '%'}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value.replace('%', '') } }, 'stainless')}
                            onBlur={(e) => { const num = parseFloat(e.target.value.replace('%', '')); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, 'stainless'); }}
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
                                    <div className="grid grid-cols-[104px_104px_104px_104px] bg-[var(--bg-subtle)] border-b border-[var(--line)]">
                                        {[
                                            { label: 'Ni', value: value?.stainless?.ni + '%' },
                                            { label: 'Cr', value: value?.stainless?.cr + '%' },
                                            { label: 'Mo', value: value?.stainless?.mo + '%' },
                                            { label: 'Fe', value: fe + '%' },
                                        ].map((item) => (
                                            <div key={item.label} className={headCell}>
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-[104px_104px_104px_104px] bg-[var(--bg-card)]">
                                        {[
                                            { label: 'Ni', value: value?.stainless?.ni + '%' },
                                            { label: 'Cr', value: value?.stainless?.cr + '%' },
                                            { label: 'Mo', value: value?.stainless?.mo + '%' },
                                            { label: 'Fe', value: fe + '%' },
                                        ].map((item) => (
                                            <div key={item.label} className="p-1">
                                                <div className={computedCell}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Price */}
                            <div>
                                <p className={labelCls}>Price</p>
                                <div className="rounded-2xl border border-[var(--line)] overflow-hidden w-fit bg-[var(--bg-card)]">
                                    <div className="grid grid-cols-[104px_104px_104px_104px] bg-[var(--bg-subtle)] border-b border-[var(--line)]">
                                        <div className={headCell}>Ni</div>
                                        <div className={headCell}>Cr</div>
                                        <div className={headCell}>Mo</div>
                                        <div className={headCell}>Fe</div>
                                    </div>
                                    <div className="grid grid-cols-[104px_104px_104px_104px] bg-[var(--bg-card)]">
                                        <div className="p-1">
                                            <div className={computedCell}>
                                                {formatCurrency(
                                                    (value?.general?.nilme * value?.stainless?.formulaNiPrice / 100).toFixed(2)
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-1">
                                            <div className={computedCell}>
                                                {formatCurrency(
                                                    (value.general?.chargeCrLb * value.general?.mt * value?.stainless?.crPriceArgus / 100).toFixed(2)
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-1">
                                            <div className={computedCell}>
                                                {formatCurrency(
                                                    (value.general?.MoOxideLb * value?.stainless?.moPriceArgus * value.general?.mt / 100).toFixed(2)
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-1">
                                            <input
                                                type="text"
                                                className={inputCell}
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
                            name="formulaNiPrice" value={value?.stainless?.formulaNiPrice + '%'}
                            onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.value.replace('%', '') } }, 'stainless')}
                            onBlur={(e) => { const num = parseFloat(e.target.value.replace('%', '')); if (!isNaN(num)) handleChange({ target: { name: e.target.name, value: num.toFixed(2) } }, 'stainless'); }}
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
                            <div className={resultPill}>{formatCurrency((solidsPrice1 * 0.92).toFixed(2))}</div>
                        </div>
                        <div className="min-w-0">
                            <p className={labelCls}>Price / Euro</p>
                            <div className={resultPill}>{formatCurrency((solidsPrice1 / value.general?.euroRate).toFixed(2), '€')}</div>
                        </div>
                    </div>

                    <div className='responsiveText text-[var(--ink-muted)] space-y-0.5'>
                        <p>* Fill in the red and + Formula x Ni</p>
                        <p>* Fe is calculated automatically</p>
                    </div>
                </div>
            </div>
        </div>
    ) : null;
};

export default Stainless;
