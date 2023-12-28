import React, { useContext, useState, useRef } from 'react';
import { HiChevronLeft } from 'react-icons/hi';
import { HiChevronRight } from 'react-icons/hi';
import { HiChevronDoubleRight } from 'react-icons/hi';
import { HiChevronDoubleLeft } from 'react-icons/hi';
import dateFormat from "dateformat";
import { SettingsContext } from "@contexts/useSettingsContext";
import { Transition } from '@headlessui/react'
import ChkBox from '@components/checkbox.js'

export default function MonthSelect(props) {
    const [openMonth, setOpenMonth] = useState(false);
    const { dateSelect, setDateSelect, setLastAction } = useContext(SettingsContext);
    const [allYear, setAllYear] = useState(false)
    const [checkedItems, setCheckedItems] = useState(dateSelect.month);
    const isEmpty = !dateSelect.month.length
    const isManyMonths = dateSelect.month.length > 1

    const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ];


    const handleClickMnth = (val) => {
        setAllYear(false)

        let curMonth = dateSelect.month[0] * 1

        if (val === 'prev' && curMonth === 1) {
            setDateSelect({ ...dateSelect, month: ['12'], year: +dateSelect.year - 1 });
            setCheckedItems(['12'])
        } else if (val === 'next' && curMonth === 12) {
            setDateSelect({ ...dateSelect, month: ['01'], year: +dateSelect.year + 1 });
            setCheckedItems(['01'])
        } else if (val === 'prev' && curMonth !== 1) {
            setDateSelect({ ...dateSelect, month: [(curMonth - 1).toString().padStart(2, '0')] });
            setCheckedItems([(curMonth - 1).toString().padStart(2, '0')])
        } else if (val === 'next' && curMonth !== 12 ) {
            setDateSelect({ ...dateSelect, month: [(curMonth + 1).toString().padStart(2, '0') ] });
            setCheckedItems([(curMonth + 1).toString().padStart(2, '0')])
     //   } else if (val === 'prev' && dateSelect.month === null) {
      //      setDateSelect({ year: +dateSelect.year - 1, month: 11 });
       // } else if (val === 'next' && dateSelect.month === null) {
        //    setDateSelect({ year: +dateSelect.year + 1, month: 0 });
        }
        
        setOpenMonth(false);
        setLastAction('months')
    };

    const handleClickYr = (val) => {
        let newdTmp = val === 'prev' ? +dateSelect.year - 1 : +dateSelect.year + 1;
        setDateSelect({ ...dateSelect, year: newdTmp });
        setOpenMonth(false);
        setLastAction('months')
    };

    const handleMontClick = (i) => {

        setAllYear(false);

        let ind = (i + 1).toString().padStart(2, '0')
        let tmp = dateSelect.month
        tmp = tmp.includes(ind) ? tmp.filter(item => item !== ind) : [...tmp, ind]

        setCheckedItems(tmp)
        setDateSelect({ ...dateSelect, month: tmp });
        setOpenMonth(false);
    };

    const selectAll = () => {
        setAllYear(!allYear);
        let tmp = !allYear ? Array.from({ length: 12 }, (_, index) => (index + 1).toString().padStart(2, '0')) : []
        setCheckedItems(tmp)
        setOpenMonth(false);
        setDateSelect({ ...dateSelect, month: tmp });
    }

    return (
        <div className='flex relative'>
            <button disabled={isEmpty || isManyMonths} onClick={() => handleClickYr('prev')} className={`h-6 w-8 border border-slate-400 rounded-l-md justify-center flex items-center
            ${isEmpty || isManyMonths ? 'bg-slate-100' : ''}`}>
                <HiChevronDoubleLeft className={`paginator_arrow scale-75 ${isEmpty || isManyMonths ? 'cursor-default' : ''}`} />
            </button>
            <button disabled={isEmpty || isManyMonths} onClick={() => handleClickMnth('prev')}
                className={`h-6 w-8 border border-slate-400 border-l-0 justify-center flex items-center
                ${isEmpty || isManyMonths ? 'bg-slate-100' : ''}`}>
                <HiChevronLeft className={`paginator_arrow scale-75 ${isEmpty || isManyMonths ? 'cursor-default' : ''}`} />
            </button>

            <button className='h-6 px-2 text-xs text-slate-700 border border-slate-400 border-l-0' onClick={() => setOpenMonth(!openMonth)} >
                {isEmpty ? 'Select month' :
                    dateSelect.month.length === 1 ? dateFormat(new Date(dateSelect.year, dateSelect.month[0] * 1 - 1, 1), 'mmm-yyyy') :
                        dateSelect.month.length + ' months selected'
                }
            </button>


            <div className="absolute z-10 top-7 transform px-2 ml-10 sm:px-0">
                <Transition show={openMonth} enter="transition-opacity duration-300"
                    enterFrom="opacity-0 "
                    enterTo="opacity-100 "
                    leave="transition-opacity "
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0">
                    <div className="overflow-auto max-h-80 md:max-h-full md:overflow-hidden rounded-lg shadow-lg bg-white py-2 px-2 w-full ">



                        <div className='text-md  '>
                            {months.map((x, i) => {
                                return (
                                    <div key={i} className='text-[0.85rem] text-slate-700 py-1.5 px-1 cursor-pointer 
                                    hover:bg-slate-200 rounded-md flex gap-2 items-center'
                                        onClick={() => handleMontClick(i)}>
                                        <div className='item-center flex'>
                                            <ChkBox checked={checkedItems.includes((i + 1).toString().padStart(2, '0'))} size='h-5 w-5' onChange={() => handleMontClick(i)} />
                                        </div>
                                        <span> {x}-{dateSelect.year}</span>
                                    </div>
                                )
                            })}
                        </div>




                        <div className='border-t border-slate-300'>
                            <div className='mt-1 text-[0.85rem] text-slate-700 py-1 px-1 cursor-pointer
                             hover:bg-slate-200 rounded-md flex gap-2'
                                onClick={selectAll}>
                                <div>
                                    <ChkBox checked={allYear} size='h-5 w-5' onChange={() => selectAll()} />
                                </div>
                                <span>Select All</span>
                            </div>
                        </div>

                    </div>
                </Transition>
            </div>

            {openMonth ? (<div className='fixed top-0 right-0 bottom-0 left-0' onClick={() => setOpenMonth(false)} />) : null}

            <button disabled={isEmpty || isManyMonths} onClick={() => handleClickMnth('next')} className={`h-6 w-8 border border-slate-400 border-l-0 justify-center flex
             ${isEmpty || isManyMonths ? 'bg-slate-100' : ''} items-center`}>
                <HiChevronRight className={`paginator_arrow scale-75 ${isEmpty || isManyMonths ? 'cursor-default' : ''}`} />
            </button>
            <button disabled={isEmpty || isManyMonths} onClick={() => handleClickYr('next')} className={`h-6 w-8 border border-slate-400 border-l-0 rounded-r-md justify-center flex 
             ${isEmpty || isManyMonths ? 'bg-slate-100' : ''} items-center`}>
                <HiChevronDoubleRight className={`paginator_arrow scale-75 ${isEmpty || isManyMonths ? 'cursor-default' : ''}`} />
            </button>
        </div>
    );
};

