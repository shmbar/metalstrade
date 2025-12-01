import { useState } from "react";

const CellPerc = ({ num, name, title, handleChange }) => {
    return (
        <div className={`border border-slate-500 w-24 flex flex-col justify-center ${name === 'fe' ? '' : 'border-r-0'}`}>
            <span className="title_style">{title}</span>
            <input
                type="text"
                className={`input_style ${name === "fe" ? "bg-slate-100" : "text-red-700"}`}
                name={name}
                value={
                    num !== undefined && num !== ""
                        ? (name === "fe" ? parseFloat(num).toFixed(2) + "%" : num + "%")
                        : "0.00%"
                }
                onChange={(e) => {
                    if (name === "fe") return; // disable editing for 'fe'
                    handleChange(
                        {
                            target: {
                                name: e.target.name,
                                value: e.target.value.replace("%", ""),
                            },
                        },
                        "supperalloys"
                    );
                }}
                onBlur={(e) => {
                    if (name === "fe") return; // no formatting for 'fe', just display
                    let n = parseFloat(e.target.value.replace("%", ""));
                    if (isNaN(n)) n = 0; // default to 0
                    handleChange(
                        {
                            target: {
                                name: e.target.name,
                                value: n.toFixed(2), // store with 2 decimals
                            },
                        },
                        "supperalloys"
                    );
                }}
            />

        </div>
    );
};


const CellPrice = ({ num, name, title, handleChange, setFocusedField }) => {
    return (
        <div className={`border border-slate-500 w-24 flex flex-col justify-center ${name === 'fePrice' ? '' : 'border-r-0'}`}>
            <span className="title_style">{title}</span>
            <input
                type="text"
                className={`input_style ${name === 'niPrice' || name === 'MoOxideLb' ? 'cursor-default bg-slate-100' : 'text-red-700'} `}
                name={name}
                value={num}
                onChange={e => handleChange({
                    target: {
                        name: e.target.name,
                        value: e.target.value.replace('%', ''),
                    },
                }, 'supperalloys')}
                onFocus={() => {
                    if (name === "niPrice" || name === 'MoOxideLb') return; // skip for niPrice
                    setFocusedField(name);
                }}
                //  onBlur={() => setFocusedField(null)}
                onBlur={(e) => {
                    if (name === "niPrice" || name === 'MoOxideLb') return; // no formatting for 'fe', just display
                    let n = parseFloat(e.target.value.replace("%", ""));
                    setFocusedField(null)
                    if (isNaN(n)) n = 0; // default to 0
                    handleChange(
                        {
                            target: {
                                name: e.target.name,
                                value: n.toFixed(2), // store with 2 decimals
                            },
                        },
                        "supperalloys"
                    );
                }}
            />
        </div>
    );
};

const SupperAlloys = ({ value, handleChange }) => {

    const [focusedField, setFocusedField] = useState(null);
    const fe = 100 - value?.supperalloys?.ni - value?.supperalloys?.cr - value?.supperalloys?.mo -
        value?.supperalloys?.nb - value?.supperalloys?.co - value?.supperalloys?.w -
        value?.supperalloys?.hf - value?.supperalloys?.ta

    const solidsPrice = value?.supperalloys?.ni * (value.general.nilme / value.general.mt) / 100 +
        value?.supperalloys?.cr * value?.supperalloys?.crPrice / 100 +
        value?.supperalloys?.mo * value?.supperalloys?.moPrice / 100 +
        value?.supperalloys?.nb * value?.supperalloys?.nbPrice / 100 +
        value?.supperalloys?.co * value?.supperalloys?.coPrice / 100 +
        value?.supperalloys?.w * value?.supperalloys?.wPrice / 100 +
        value?.supperalloys?.hf * value?.supperalloys?.hfPrice / 100 +
        value?.supperalloys?.ta * value?.supperalloys?.taPrice / 100


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


    return (
        <div className='border border-slate-300 p-3 rounded-lg flex flex-col md:flex-row w-full'>
            <div className='justify-start'>
                <p className='text-center text-slate-600 text-lg font-semibold'>Cost</p>
                <p className='text-center text-slate-600 text-sm font-semibold'>Composition</p>
                <div className='flex justify-center'>
                    <CellPerc num={value.supperalloys?.ni} name='ni' title='Ni' handleChange={handleChange} />
                    <CellPerc num={value?.supperalloys?.cr} name='cr' title='Cr' handleChange={handleChange} />
                    <CellPerc num={value?.supperalloys?.mo} name='mo' title='Mo' handleChange={handleChange} />
                    <CellPerc num={value?.supperalloys?.nb} name='nb' title='Nb' handleChange={handleChange} />
                    <CellPerc num={value?.supperalloys?.co} name='co' title='Co' handleChange={handleChange} />
                    <CellPerc num={value?.supperalloys?.w} name='w' title='W' handleChange={handleChange} />
                    <CellPerc num={value?.supperalloys?.hf} name='hf' title='Hf' handleChange={handleChange} />
                    <CellPerc num={value?.supperalloys?.ta} name='ta' title='Ta' handleChange={handleChange} />
                    <CellPerc num={fe} name='fe' title='Fe' handleChange={{}} />
                </div>

                <p className='text-center text-slate-600 text-sm font-semibold pt-2'>Price/Lbs</p>
                <div className='flex justify-center'>
                    <CellPrice num={addComma((value.general.nilme / value.general.mt).toFixed(2))} name='niPrice' title='Ni' handleChange={handleChange} />
                    <CellPrice num={focusedField === 'crPrice' ? value.supperalloys?.crPrice : addComma(value.supperalloys?.crPrice)}
                        name='crPrice' title='Cr' handleChange={handleChange} setFocusedField={setFocusedField} />
                    <CellPrice num={addComma(value?.general?.MoOxideLb)} name='MoOxideLb' title='Mo' handleChange={handleChange} />
                    <CellPrice num={focusedField === 'nbPrice' ? value.supperalloys?.nbPrice : addComma(value.supperalloys?.nbPrice)}
                        name='nbPrice' title='Nb' handleChange={handleChange} setFocusedField={setFocusedField} />
                    <CellPrice num={focusedField === 'coPrice' ? value.supperalloys?.coPrice : addComma(value.supperalloys?.coPrice)}
                        name='coPrice' title='Co' handleChange={handleChange} setFocusedField={setFocusedField} />
                    <CellPrice num={focusedField === 'wPrice' ? value.supperalloys?.wPrice : addComma(value.supperalloys?.wPrice)}
                        name='wPrice' title='W' handleChange={handleChange} setFocusedField={setFocusedField} />
                    <CellPrice num={focusedField === 'hfPrice' ? value.supperalloys?.hfPrice : addComma(value.supperalloys?.hfPrice)}
                        name='hfPrice' title='Hf' handleChange={handleChange} setFocusedField={setFocusedField} />
                    <CellPrice num={focusedField === 'taPrice' ? value.supperalloys?.taPrice : addComma(value.supperalloys?.taPrice)}
                        name='taPrice' title='Ta' handleChange={handleChange} setFocusedField={setFocusedField} />
                    <CellPrice num={focusedField === 'fePrice' ? value.supperalloys?.fePrice : addComma(value.supperalloys?.fePrice)}
                        name='fePrice' title='Fe' handleChange={handleChange} setFocusedField={setFocusedField} />
                </div>



                <div className="grid-cols-2 gap-10 w-full pt-6 justify-between flex">
                    <div className="col-span-2 md:col-span-1 justify-center flex">

                        <div className=''>
                            <div className='border border-slate-500 w-24 flex flex-col justify-center text-center'>
                                <span className='title_style bg-customOrange'> Formula Intrinsic</span>
                                <input type='text' className='input_style bg-orange-200 text-red-600' value={value?.supperalloys?.formulaIntsCost + '%'}
                                    name='formulaIntsCost' onChange={(e) => handleChange(e, 'supperalloys')}
                                    onBlur={(e) => {
                                        let num = parseFloat(e.target.value.replace("%", ""));
                                        if (isNaN(num)) num = 0; // default to 0
                                        handleChange(
                                            {
                                                target: {
                                                    name: e.target.name,
                                                    value: num.toFixed(2), // store with 2 decimals
                                                },
                                            },
                                            "supperalloys"
                                        );
                                    }} />
                            </div>

                            <div className='pt-6 gap-5 flex items-end'>
                                <div className='border border-slate-500 w-24 flex flex-col'>
                                    <span className='title_style bg-customLavender'>Cost</span>
                                    <span className='title_style'>Solids Price:</span>
                                    <input type='text' className='input_style bg-orange-200'
                                        value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100).toFixed(2))}
                                        name='formulaNi' onChange={(e) => { }} />
                                </div>
                                <div className='border border-slate-500 w-24 flex flex-col'>
                                    <span className='title_style bg-blue-300'>Price per MT:</span>
                                    <input type='text' className='input_style bg-slate-100 '
                                        value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100 * value.general.mt).toFixed(2))}
                                        name='formulaNi' onChange={(e) => { }} />
                                </div>
                                <div className='border border-slate-500 w-24 flex flex-col'>
                                    <span className='title_style'>Price/Euro:</span>
                                    <input type='text' className='input_style bg-customLime'
                                        value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100 / value.general?.euroRate).toFixed(2), 'a')}
                                        name='formulaNi' onChange={(e) => { }} />
                                </div>
                            </div>
                            <div className='border border-slate-500 w-24 mt-4 flex flex-col'>
                                <span className='title_style '>Turnings Price:</span>
                                <input type='text' className='input_style bg-orange-200'
                                    value={addComma((solidsPrice * value?.supperalloys?.formulaIntsCost / 100 * 0.95).toFixed(2))}
                                    name='formulaNi' onChange={(e) => { }} />
                            </div>
                            <div className='pt-4 text-red-600'>
                                <p className="text-xs">* Fill in the red and + Formula x Ni</p>
                                <p className="text-xs">* Fe is calculated automatically</p>
                            </div>
                        </div>
                    </div>



                    <div className="col-span-2 md:col-span-1 justify-center flex">
                        <div className='flex'>
                            <div className=''>
                                <div className='border border-slate-500 w-24 flex flex-col justify-center'>
                                    <span className='title_style bg-customOrange text-center'> Formula Intrinsic</span>
                                    <input type='text' className='input_style bg-orange-200 text-red-600' value={value?.supperalloys?.formulaIntsPrice + '%'}
                                        name='formulaIntsPrice' onChange={(e) => handleChange(e, 'supperalloys')}
                                        onBlur={(e) => {
                                            let num = parseFloat(e.target.value.replace("%", ""));
                                            if (isNaN(num)) num = 0; // default to 0
                                            handleChange(
                                                {
                                                    target: {
                                                        name: e.target.name,
                                                        value: num.toFixed(2), // store with 2 decimals
                                                    },
                                                },
                                                "supperalloys"
                                            );
                                        }} />
                                </div>
                                <div className='pt-6 gap-5 flex items-end'>
                                    <div className='border border-slate-500 w-24 flex flex-col'>
                                        <span className='title_style bg-customLavender'>Sales</span>
                                        <span className='title_style'>Solids Price:</span>
                                        <input type='text' className='input_style bg-orange-200 '
                                            value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100).toFixed(2))}
                                            onChange={(e) => { }} />
                                    </div>
                                    <div className='border border-slate-500 w-24 flex flex-col'>
                                        <span className='title_style bg-blue-300'>Price per MT:</span>
                                        <input type='text' className='input_style bg-slate-100 '
                                            value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100 * value.general.mt).toFixed(2))}
                                            name='formulaNi' onChange={(e) => { }} />
                                    </div>

                                    <div className='border border-slate-500 w-24 flex flex-col'>
                                        <span className='title_style'>Price/Euro:</span>
                                        <input type='text' className='input_style bg-customLime '
                                            value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100 / value.general?.euroRate).toFixed(2), 'a')}
                                            name='formulaNi' onChange={(e) => { }} />
                                    </div>
                                </div>
                                <div className='border border-slate-500 w-24 mt-4 flex flex-col'>
                                    <span className='title_style'>Turnings Price:</span>
                                    <input type='text' className='input_style bg-orange-200'
                                        value={addComma((solidsPrice * value?.supperalloys?.formulaIntsPrice / 100 * 0.95).toFixed(2))}
                                        name='formulaNi' onChange={(e) => { }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default SupperAlloys;
