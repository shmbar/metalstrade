import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../../components/ui/popover"
import { Button } from "../../../components/ui/button"
import { useContext, useEffect, useState } from "react";
import { MdPayments, MdClose } from "react-icons/md";
import Datepicker from "react-tailwindcss-datepicker";
import { SettingsContext } from "../../../contexts/useSettingsContext";

const addComma = (nStr) => {
    if (nStr === null || nStr === undefined) return "";
    nStr += '';
    let x = nStr.split('.');
    let x1 = x[0];
    let x2 = x.length > 1 ? '.' + x[1] : '';
    let rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1,$2');
    }
    return x1 + x2;
};

const DoalogModal = ({ obj, supplierPartialPayment }) => {
    const [open, setOpen] = useState(false);
    const [showDatepicker, setShowDatepicker] = useState(false);
    const [date, setDate] = useState(null);
    const [pmnt, setPmnt] = useState('');
    const [perc, setPerc] = useState('')
    const { setToast } = useContext(SettingsContext);


    const handleValuePerc = (e) => {
        setPerc(e.target.value)
        setPmnt(obj.invValue * e.target.value / 100)
    }

    // Wait a tick before showing the datepicker
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setShowDatepicker(true), 1);
            return () => clearTimeout(timer);
        } else {
            setShowDatepicker(false);
        }
    }, [open]);

    const handleValuePmnt = (e) => {
        let raw = e.target.value.replace(/[^0-9.]/g, '');
        setPmnt(raw);

        const val = parseFloat(raw);
        const inv = parseFloat(obj.invValue);

        if (!isNaN(val) && !isNaN(inv) && inv !== 0) {
            setPerc((val / inv * 100).toFixed(1));
        } else {
            setPerc('');
        }
    };

    const handleSave = () => {

        if (date == null || pmnt === '' || perc === '') {
            setToast({ show: true, text: 'Fields not properly filled!', clr: 'fail' })
            return;
        }

        supplierPartialPayment({
            date,
            pmnt,
            perc,
            id: obj?.id
        });

        setDate(null)
        setPmnt('')
        setPerc('')
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className="p-0 bg-transparent border-0 outline-none leading-none">
                    <MdPayments className="w-3 h-3 text-[var(--endeavour)]"/>
                </button>
            </PopoverTrigger>

              <PopoverContent className="w-full max-w-xs md:max-w-md bg-white p-4 border border-slate-300 shadow-lg rounded-2xl z-50
                 data-[state=open]:animate-fade-zoom-in
                 data-[state=closed]:animate-fade-zoom-out
">
                <div className="grid gap-2">
                    <div className="text-sm justify-end flex">
                        <MdClose
                            className="scale-[1.5] cursor-pointer"
                            onClick={() => setOpen(false)}
                        />
                    </div>

                    <h4 className="leading-none font-medium">
                        Set Date and Amount to pay
                    </h4>

                    <div className="flex flex-col md:flex-row justify-between pt-2 gap-3">
                        <div className="flex-1 min-w-0">
                            <label className="text-sm justify-start flex">Date</label>
                            {showDatepicker && (
                                <Datepicker
                                    useRange={false}
                                    asSingle={true}
                                    value={date}
                                    popoverDirection="down"
                                    onChange={(val) => setDate(val)}
                                    displayFormat={"DD.MM.YY"}
                                    primaryColor="blue"
                                    inputClassName="input w-full h-7 text-xs rounded-2xl border border-[var(--endeavour)] focus:outline-none focus:ring-1 focus:ring-blue-200 px-2"
                                    containerClassName="react-tailwindcss-datepicker-container relative"
                                />
                            )}
                        </div>
                        <div className="flex items-start md:items-end">
                            <label className='text-sm justify-start flex'>%</label>
                            <div className='flex'>
                                <input type='text' className="pr-3 number-separator input h-7 shadow-sm text-xs w-20 md:w-14 rounded-full" name='invValue'
                                    value={perc} onChange={e => handleValuePerc(e)} />
                                <span className='ml-2 text-slate-600 flex items-center'>%</span>

                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <label className="text-sm justify-start flex">Amount</label>
                            <input
                                type="text"
                                className="number-separator input h-7 shadow-sm text-xs w-full rounded-full"
                                value={addComma(pmnt)}
                                onChange={handleValuePmnt}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-3">
                    <Button className="px-2 h-7 bg-[#d4eafc] hover:bg-[#b8ddf8] text-[var(--endeavour)] border-0 shadow-none rounded-full" onClick={handleSave}>
                        Save
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};


export default DoalogModal;
