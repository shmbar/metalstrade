import React, { useContext, useState, useRef } from 'react';
import { HiChevronLeft } from 'react-icons/hi';
import { HiChevronRight } from 'react-icons/hi';
import { HiChevronDoubleRight } from 'react-icons/hi';
import { HiChevronDoubleLeft } from 'react-icons/hi';
import dateFormat from "dateformat";
import { SettingsContext } from "../contexts/useSettingsContext";
import { Transition } from '@headlessui/react'
import ChkBox from '../components/checkbox.js'

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
            <button disabled={isEmpty || isManyMonths} onClick={() => handleClickYr('prev')} className={`h-[26px] w-7 border border-[var(--endeavour)] rounded-l-2xl justify-center flex items-center hover:bg-[var(--selago)] transition-colors
            ${isEmpty || isManyMonths ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <HiChevronDoubleLeft className={`scale-75 text-[var(--endeavour)]`} />
            </button>
            <button disabled={isEmpty || isManyMonths} onClick={() => handleClickMnth('prev')}
                className={`h-[26px] w-7 border border-[var(--endeavour)] border-l-0 justify-center flex items-center hover:bg-[var(--selago)] transition-colors
                ${isEmpty || isManyMonths ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <HiChevronLeft className={`scale-75 text-[var(--endeavour)]`} />
            </button>

            <button className='h-[26px] px-3 text-[11px] text-[var(--chathams-blue)] border border-[var(--endeavour)] border-l-0 hover:bg-[var(--selago)] transition-colors whitespace-nowrap' onClick={() => setOpenMonth(!openMonth)} >
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
                    <div className="overflow-hidden rounded-2xl shadow-xl bg-white w-full border border-[#dbeeff]">
                        <div className='py-1.5 px-3 text-[11px] font-semibold' style={{ background: '#dbeeff', color: 'var(--chathams-blue)' }}>Select Month</div>
                        <div className='py-1 px-1 overflow-auto max-h-72'>
                            {months.map((x, i) => {
                                return (
                                    <div key={i} className='text-[11px] py-1 px-2 cursor-pointer hover:bg-[#ebf2fc] rounded-lg flex gap-2 items-center transition-colors'
                                        style={{ color: 'var(--chathams-blue)' }}
                                        onClick={() => handleMontClick(i)}>
                                        <ChkBox checked={checkedItems.includes((i + 1).toString().padStart(2, '0'))} size='h-4 w-4' onChange={() => handleMontClick(i)} />
                                        <span>{x}-{dateSelect.year}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className='border-t border-[#dbeeff] px-1 pb-1'>
                            <div className='mt-1 text-[11px] py-1 px-2 cursor-pointer hover:bg-[#ebf2fc] rounded-lg flex gap-2 items-center transition-colors'
                                style={{ color: 'var(--chathams-blue)' }}
                                onClick={selectAll}>
                                <ChkBox checked={allYear} size='h-4 w-4' onChange={() => selectAll()} />
                                <span>Select All</span>
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>

            {openMonth ? (<div className='fixed top-0 right-0 bottom-0 left-0' onClick={() => setOpenMonth(false)} />) : null}

            <button disabled={isEmpty || isManyMonths} onClick={() => handleClickMnth('next')} className={`h-[26px] w-7 border border-[var(--endeavour)] border-l-0 justify-center flex items-center hover:bg-[var(--selago)] transition-colors
             ${isEmpty || isManyMonths ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <HiChevronRight className={`scale-75 text-[var(--endeavour)]`} />
            </button>
            <button disabled={isEmpty || isManyMonths} onClick={() => handleClickYr('next')} className={`h-[26px] w-7 border border-[var(--endeavour)] border-l-0 rounded-r-2xl justify-center flex items-center hover:bg-[var(--selago)] transition-colors
             ${isEmpty || isManyMonths ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <HiChevronDoubleRight className={`scale-75 text-[var(--endeavour)]`} />
            </button>
        </div>
    );
};

