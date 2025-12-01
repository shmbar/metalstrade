import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useContext, useEffect, useState } from "react";
import { MdPayments, MdClose } from "react-icons/md";
import Datepicker from "react-tailwindcss-datepicker";
import { SettingsContext } from "@contexts/useSettingsContext";

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

const DoalogModalClient = ({ obj, clientPartialPayment }) => {
    const [open, setOpen] = useState(false);
    const [showDatepicker, setShowDatepicker] = useState(false);
    const [date, setDate] = useState(null);
    const [pmnt, setPmnt] = useState('');
    const { setToast } = useContext(SettingsContext);


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
    };

    const handleSave = () => {

        if (date == null || pmnt === '') {
            setToast({ show: true, text: 'Fields not properly filled!', clr: 'fail' })
            return;
        }

        clientPartialPayment({
            date,
            pmnt,
            id: obj?.id
        });

        setDate(null)
        setPmnt('')
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button className="h-5 2xl:h-6 px-1 2xl:px-2 text-xs bg-slate-500">
                    <MdPayments className="scale-[0.8] 2xl:scale-[1]"/>
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-72 border border-slate-500 shadow-lg rounded-lg
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

                    <div className="flex justify-between pt-2">
                        <div>
                            <label className="text-sm justify-start flex">Date</label>
                            {showDatepicker && (
                                <Datepicker
                                    useRange={false}
                                    asSingle={true}
                                    value={date}
                                    popoverDirection="down"
                                    onChange={(val) => setDate(val)}
                                    displayFormat={"DD-MMM-YYYY"}
                                    inputClassName="input w-full text-[15px] shadow-lg h-7 text-xs"
                                />
                            )}
                        </div>

                        <div>
                            <label className="text-sm justify-start flex">Amount</label>
                            <input
                                type="text"
                                className="number-separator input text-[15px] h-7 shadow-lg text-xs w-24"
                                value={addComma(pmnt)}
                                onChange={handleValuePmnt}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-3">
                    <Button className="px-2 h-7 bg-slate-500" onClick={handleSave}>
                        Save
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};


export default DoalogModalClient;
