import { useState } from "react";

const Fenicr = ({ value, handleChange }) => {
    const [focusedField, setFocusedField] = useState(null);


    const fe = (100 - value?.fenicr?.ni - value?.fenicr?.cr - value?.fenicr?.mo).toFixed(2)
    const solidsPrice = value?.fenicr?.ni * value?.general?.nilme * value?.fenicr?.formulaNiCost / 10000 +
        value?.fenicr?.cr * value?.fenicr?.crPrice / 100 +
        value?.fenicr?.mo * value?.fenicr?.moPrice / 100 +
        fe * value?.fenicr?.fePrice / 100


    const solidsPrice1 = value?.fenicr?.ni * value?.general?.nilme / 100 * value?.fenicr?.formulaNiPrice / 100 +
        value?.fenicr?.cr / 100 * value.general?.chargeCrLb * value.general?.mt * value?.fenicr?.crPriceArgus / 100 +
        value?.fenicr?.mo / 100 * (value.general?.MoOxideLb * value?.fenicr?.moPriceArgus * value.general?.mt / 100) +
        fe * value?.fenicr?.fePrice1 / 100


    const addComma = (nStr, z) => {
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1,$2');
        }

        const symbol = !z ? '$' : '€'
        return (symbol + x1 + x2);
    }

    return value.fenicr != null ? (
        <div className='border border-slate-300 p-3 rounded-lg flex flex-col md:flex-row w-full'>

            <div className="grid grid-cols-2 w-[75rem]">
                <div className="col-span-2 md:col-span-1">
                    <p className='text-center text-slate-600 text-lg font-semibold'>Cost</p>
                    <div className='flex gap-6 pt-2'>
                        <div>
                            <div>
                                <p className='text-center text-slate-600 text-sm font-semibold'>Composition</p>
                                <div className='flex justify-center'>
                                    <div className='border border-slate-500 w-24 flex flex-col justify-center'>
                                        <span className='title_style'>Ni</span>
                                        <input type='input' className='input_style text-red-700' value={value?.fenicr?.ni + '%'}
                                            name='ni' onChange={(e) => {
                                                handleChange({
                                                    target: {
                                                        name: e.target.name,
                                                        value: e.target.value.replace('%', ''),
                                                    },
                                                }, 'fenicr');
                                            }}
                                            onBlur={(e) => {
                                                let num = parseFloat(e.target.value.replace("%", ""));
                                                if (!isNaN(num)) {
                                                    handleChange(
                                                        {
                                                            target: {
                                                                name: e.target.name,
                                                                value: num.toFixed(2), // format with 2 decimals
                                                            },
                                                        },
                                                        "fenicr"
                                                    );
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style'>Cr</span>
                                        <input type='input' className='input_style text-red-700' value={value?.fenicr?.cr + '%'}
                                            name='cr' onChange={(e) => {
                                                handleChange({
                                                    target: {
                                                        name: e.target.name,
                                                        value: e.target.value.replace('%', ''),
                                                    },
                                                }, 'fenicr');
                                            }}
                                            onBlur={(e) => {
                                                let num = parseFloat(e.target.value.replace("%", ""));
                                                if (!isNaN(num)) {
                                                    handleChange(
                                                        {
                                                            target: {
                                                                name: e.target.name,
                                                                value: num.toFixed(2), // format with 2 decimals
                                                            },
                                                        },
                                                        "fenicr"
                                                    );
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style'>Mo</span>
                                        <input type='text' className='input_style text-red-700' value={value?.fenicr?.mo + '%'}
                                            name='mo' onChange={(e) => {
                                                handleChange({
                                                    target: {
                                                        name: e.target.name,
                                                        value: e.target.value.replace('%', ''),
                                                    },
                                                }, 'fenicr');
                                            }}
                                            onBlur={(e) => {
                                                let num = parseFloat(e.target.value.replace("%", ""));
                                                if (!isNaN(num)) {
                                                    handleChange(
                                                        {
                                                            target: {
                                                                name: e.target.name,
                                                                value: num.toFixed(2), // format with 2 decimals
                                                            },
                                                        },
                                                        "fenicr"
                                                    );
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style'>Fe</span>
                                        <input type='input' className='input_style bg-slate-100' value={fe + '%'}
                                            name='fe' onChange={(e) => { }} />
                                    </div>
                                </div>
                            </div>
                            <div className=''>
                                <p className='text-center text-slate-600 text-sm font-semibold'>Price</p>
                                <div className='flex justify-center'>
                                    <div className='border border-slate-500 w-24 flex flex-col justify-center'>
                                        <span className='title_style bg-customLavender'>Ni</span>
                                        <input type='input' className='input_style bg-slate-100' value={addComma(value.general?.nilme * value.fenicr?.formulaNiCost / 100)}
                                            onChange={(e) => { }} />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style bg-customLavender'>Cr</span>
                                        <input type='input' className='input_style text-red-700 '
                                            name='crPrice' onChange={(e) => handleChange(e, 'fenicr')}
                                            value={focusedField === 'crPrice' ? value.fenicr?.crPrice : addComma(value.fenicr?.crPrice)}
                                            onFocus={() => setFocusedField('crPrice')}
                                            onBlur={(e) => {
                                                setFocusedField(null);

                                                let num = parseFloat(e.target.value);
                                                if (!isNaN(num)) {
                                                    handleChange(
                                                        {
                                                            target: {
                                                                name: e.target.name,
                                                                value: num.toFixed(2), // force 2 decimals
                                                            },
                                                        },
                                                        "fenicr"
                                                    );
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style bg-customLavender'>Mo</span>
                                        <input type='input' className='input_style text-red-700'
                                            name='moPrice' onChange={(e) => handleChange(e, 'fenicr')}
                                            value={focusedField === 'moPrice' ? value.fenicr?.moPrice : addComma(value.fenicr?.moPrice)}
                                            onFocus={() => setFocusedField('moPrice')}
                                            onBlur={(e) => {
                                                setFocusedField(null);

                                                let num = parseFloat(e.target.value);
                                                if (!isNaN(num)) {
                                                    handleChange(
                                                        {
                                                            target: {
                                                                name: e.target.name,
                                                                value: num.toFixed(2), // force 2 decimals
                                                            },
                                                        },
                                                        "fenicr"
                                                    );
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style bg-customLavender'>Fe</span>
                                        <input type='input' className='input_style text-red-700'
                                            name='fePrice' onChange={(e) => handleChange(e, 'fenicr')}
                                            value={focusedField === 'fePrice' ? value.fenicr?.fePrice : addComma(value.fenicr?.fePrice)}
                                            onFocus={() => setFocusedField('fePrice')}
                                            onBlur={(e) => {
                                                setFocusedField(null);

                                                let num = parseFloat(e.target.value);
                                                if (!isNaN(num)) {
                                                    handleChange(
                                                        {
                                                            target: {
                                                                name: e.target.name,
                                                                value: num.toFixed(2), // force 2 decimals
                                                            },
                                                        },
                                                        "fenicr"
                                                    );
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className='items-end flex'>
                            <div className='border border-slate-500 w-24 flex flex-col'>
                                <span className='title_style bg-blue-300'>Ni LME</span>
                                <input type='text' className='input_style bg-slate-100' value={addComma(value?.general?.nilme)}
                                    name='nilme' onChange={(e) => { }} />
                            </div>
                        </div>
                    </div>


                    <div className='items-end flex pt-[44px]'>
                        <div className='border border-slate-500 w-24 flex flex-col'>
                            <span className='title_style bg-customOrange'> Formula x Ni</span>
                            <input type='text' className='input_style bg-orange-200 text-red-600' value={value?.fenicr?.formulaNiCost + '%'}
                                name='formulaNiCost' onChange={(e) => handleChange(e, 'fenicr')}
                                onBlur={(e) => {
                                    let num = parseFloat(e.target.value.replace("%", ""));
                                    if (!isNaN(num)) {
                                        handleChange(
                                            {
                                                target: {
                                                    name: e.target.name,
                                                    value: num.toFixed(2), // store with 2 decimals
                                                },
                                            },
                                            "fenicr"
                                        );
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className=''>
                        <div className='items-end flex pt-6 gap-6'>
                            <div className='border border-slate-500 w-24 flex flex-col'>
                                <span className='title_style bg-customLavender'>Cost</span>
                                <span className='title_style'>Solids Price:</span>
                                <input type='text' className='input_style bg-orange-200 input_style'
                                    value={addComma(solidsPrice.toFixed(2))}
                                    name='formulaNi' onChange={(e) => { }} />
                            </div>
                            <div className='border border-slate-500 w-24 flex flex-col'>
                                <span className='title_style'>Turnings Price:</span>
                                <input type='text' className='input_style bg-orange-200 '
                                    value={addComma((solidsPrice * 0.92).toFixed(2))}
                                    name='formulaNi' onChange={(e) => { }} />
                            </div>
                            <div className='border border-slate-500 w-24 flex flex-col'>
                                <span className='title_style'>Price/Euro:</span>
                                <input type='text' className='input_style bg-customLime'
                                    value={addComma((solidsPrice / value.general?.euroRate).toFixed(2), 'a')}
                                    name='formulaNi' onChange={(e) => { }} />
                            </div>
                        </div>
                    </div>

                    <div className='pt-4 text-red-600'>
                        <p className="text-xs">* Fill in the red and + Formula x Ni</p>
                        <p className="text-xs">* Fe is calculated automatically</p>
                    </div>

                </div>



                <div className="col-span-2 md:col-span-1">
                    <p className='text-center text-slate-600 text-lg font-semibold'>Sales</p>
                    <div className='flex gap-6 pt-2'>
                        <div>
                            <div>
                                <p className='text-center text-slate-600 text-sm font-semibold'>Composition</p>
                                <div className='flex justify-center'>
                                    <div className='border border-slate-500 w-24 flex flex-col justify-center'>
                                        <span className='title_style'>Ni</span>
                                        <input type='input' className='input_style bg-slate-100'
                                            value={value?.fenicr?.ni + '%'} onChange={(e) => { }} />
                                    </div>
                                    <div className='border-y border-slate-500 border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style'>Cr</span>
                                        <input type='input' className='input_style bg-slate-100'
                                            value={value?.fenicr?.cr + '%'} onChange={(e) => { }} />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style'>Mo</span>
                                        <input type='input' className='input_style bg-slate-100'
                                            value={value?.fenicr?.mo + '%'} onChange={(e) => { }} />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style'>Fe</span>
                                        <input type='input' className='input_style bg-slate-100'
                                            value={fe + '%'} onChange={(e) => { }} />
                                    </div>
                                </div>
                            </div>
                            <div className=''>
                                <p className='text-center text-slate-600 text-sm font-semibold'>Price</p>
                                <div className='flex justify-center'>
                                    <div className='border border-slate-500 w-24 flex flex-col justify-center'>
                                        <span className='title_style bg-customLavender'>Ni</span>
                                        <input type='input' className='input_style bg-slate-100' value={addComma(value?.general?.nilme * value?.fenicr?.formulaNiPrice / 100)}
                                            onChange={(e) => { }} />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style bg-customLavender'>Cr</span>
                                        <input type='input' className='input_style bg-slate-100'
                                            value={addComma((value.general?.chargeCrLb * value.general?.mt * value?.fenicr?.crPriceArgus / 100).toFixed(2))} onChange={(e) => { }} />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style bg-customLavender'>Mo</span>
                                        <input type='input' className='input_style bg-slate-100'
                                            value={addComma((value.general?.MoOxideLb * value?.fenicr?.moPriceArgus * value.general?.mt / 100).toFixed(2))} onChange={(e) => { }} />
                                    </div>
                                    <div className='border-y border-slate-500  border-r w-24 flex flex-col justify-center'>
                                        <span className='title_style bg-customLavender'>Fe</span>
                                        <input type='input' className='input_style  text-red-600 '
                                            name='fePrice1' onChange={(e) => handleChange(e, 'fenicr')}
                                            value={focusedField === 'fePrice1' ? value.fenicr?.fePrice1 : addComma(value.fenicr?.fePrice1)}
                                            onFocus={() => setFocusedField('fePrice1')}
                                            onBlur={(e) => {
                                                setFocusedField(null);

                                                let num = parseFloat(e.target.value);
                                                if (!isNaN(num)) {
                                                    handleChange(
                                                        {
                                                            target: {
                                                                name: e.target.name,
                                                                value: num.toFixed(2), // force 2 decimals
                                                            },
                                                        },
                                                        "fenicr"
                                                    );
                                                }
                                            }}
                                        />

                                    </div>
                                </div>
                            </div>
                            <div className='justify-start flex'>
                                <div className='flex justify-center'>
                                    <div className='w-24 flex flex-col justify-center'>
                                        <span className='justify-center text-xs text-slate-500 items-center flex'>{'Lb ' + addComma(((value?.general?.nilme * value?.fenicr?.formulaNiPrice / 100) / (value?.general?.mt)).toFixed(2))}</span>
                                    </div>
                                    <div className='w-24 flex flex-col justify-center'>
                                        <input type='input' className='input w-full h-7 text-center border-none  cursor-default rounded-none text-red-700 text-xs'
                                            name='crPriceArgus' value={'Argus ' + value?.fenicr?.crPriceArgus + '%'} onChange={(e) => handleChange(e, 'fenicr')} />
                                    </div>
                                    <div className=' w-24 flex flex-col justify-center'>
                                        <input type='input' className='input w-full h-7 text-center border-none cursor-default rounded-none text-red-700 text-xs'
                                            name='moPriceArgus' value={'Argus ' + value?.fenicr?.moPriceArgus + '%'} onChange={(e) => handleChange(e, 'fenicr')} />
                                    </div>

                                </div>
                            </div>
                        </div>
                        <div className='items-end flex'>
                            <div className='border border-slate-500 w-24 flex flex-col mb-7'>
                                <span className='title_style bg-blue-300'>Ni LME</span>
                                <input type='input' className='input_style bg-slate-100' value={addComma(value?.general?.nilme)}
                                    onChange={(e) => { }} />
                            </div>
                        </div>
                    </div>

                    <div className='items-end flex pt-4'>
                        <div className='border border-slate-500 w-24 flex flex-col'>
                            <span className='title_style bg-customOrange'> Formula x Ni</span>
                            <input type='text' className='input_style bg-orange-200 text-red-600' value={value?.fenicr?.formulaNiPrice + '%'}
                                name='formulaNiPrice' onChange={(e) => handleChange(e, 'fenicr')}
                                  onBlur={(e) => {
                                    let num = parseFloat(e.target.value.replace("%", ""));
                                    if (!isNaN(num)) {
                                        handleChange(
                                            {
                                                target: {
                                                    name: e.target.name,
                                                    value: num.toFixed(2), // store with 2 decimals
                                                },
                                            },
                                            "fenicr"
                                        );
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className=''>
                        <div className='items-end flex pt-6 gap-6'>
                            <div className='border border-slate-500 w-24 flex flex-col'>
                                <span className='title_style bg-customLavender'>Sales</span>
                                <span className='title_style'>Solids Price:</span>
                                <input type='text' className='input_style bg-orange-200'
                                    value={addComma((solidsPrice1).toFixed(2))}
                                    name='formulaNi' onChange={(e) => { }} />
                            </div>
                            <div className='border border-slate-500 w-24 flex flex-col'>
                                <span className='title_style'>Turnings Price:</span>
                                <input type='text' className='input_style bg-orange-200'
                                    value={addComma((solidsPrice1 * 0.9).toFixed(2))}
                                    name='formulaNi' onChange={(e) => { }} />
                            </div>
                            <div className='border border-slate-500 w-24 flex flex-col'>
                                <span className='title_style'>Price/Euro:</span>
                                <input type='text' className='input_style bg-customLime '
                                    value={addComma((solidsPrice1 / value.general?.euroRate).toFixed(2), 'a')}
                                    name='formulaNi' onChange={(e) => { }} />
                            </div>
                        </div>
                    </div>

                    <div className='pt-4 text-red-600'>
                        <p className="text-xs">* Fill in the red and + Formula x Ni</p>
                        <p className="text-xs">* Fe is calculated automatically</p>
                    </div>
                </div>
            </div>

        </div>
    ) : ''
};

export default Fenicr;
