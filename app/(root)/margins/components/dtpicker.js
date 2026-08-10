'use client'
import Datepicker from "react-tailwindcss-datepicker";
import Tltip from "../../../../components/tlTip";

const getDateValue = (props) =>
    typeof props.getValue === 'function' ? props.getValue() : props.value;

/* Wide enough for "DD.MM.YY" at the top breakpoint, with right padding so the
   centred text clears the absolutely-positioned clear button. */
const DATE_INPUT_CLASS =
    'responsiveText h-7 py-0 pl-1 pr-4 w-24 bg-transparent border-0 outline-none cursor-pointer text-[var(--brand)] text-center';

/* Positioning note.
   This component used to hand-position the popup: a MutationObserver watched for
   it opening, then pinned it with `position: fixed` at the input's viewport
   coordinates, re-running on every scroll.

   That is why the calendar opened away from its cell here and nowhere else.
   Every other datepicker in the app leaves positioning to the library — the
   popup is `absolute` inside the `relative` wrapper, and one rule in globals.css
   ("Align left-side datepicker popup to input's left edge",
   div.relative.w-full.text-gray-700 > div.absolute.z-10:not(.right-0) { left: 0 })
   snaps it to the input. The hand-rolled `fixed` path bypassed that rule and
   computed its own coordinates, which is both why it landed in the wrong place
   and why it was fragile enough to hang the tab when the maths was touched.

   Now it does what the rest of the app does. */
const DatePicker = ({ props, handleChangeDate, month, handleCancelDate }) => {
    const dateVal = getDateValue(props);

    const value = {
        startDate: dateVal?.startDate || null,
        endDate: dateVal?.startDate || null,
    };

    const handleChange = (newValue) => {
        if (newValue?.startDate) {
            handleChangeDate(new Date(newValue.startDate), props.row.original.id, month);
        }
        // Intentionally ignore null events — the library fires null when clicking
        // an already-selected date (toggle behaviour). We use a separate clear
        // button so the user can always re-pick the same date without it clearing.
    };

    const handleClear = () => {
        handleCancelDate(null, props.row.original.id, month);
    };

    return (
        <div className="relative flex items-center justify-center">
            <div className="datepicker-wrapper">
                <Datepicker
                    asSingle={true}
                    useRange={false}
                    value={value}
                    onChange={handleChange}
                    displayFormat="DD.MM.YY"
                    placeholder="DD.MM.YY"
                    primaryColor="blue"
                    readOnly={true}
                    showShortcuts={false}
                    inputClassName={DATE_INPUT_CLASS}
                    /* Same wrapper the working pickers use: `relative` so the popup
                       anchors to this input, and --z-page-popover so it clears page
                       furniture without floating over modals. */
                    containerClassName="relative z-page-popover [&>div]:border-0 [&>div]:shadow-none [&>div]:rounded-none [&>div]:bg-transparent"
                    toggleClassName="hidden"
                    popoverDirection="down"
                />
            </div>
            {dateVal?.startDate && (
                <Tltip direction="top" tltpText="Clear date">
                    <button
                        onClick={handleClear}
                        className="absolute top-1/2 -translate-y-1/2 right-0 text-[var(--ink-muted)] hover:text-[var(--bad-text)] transition-colors z-10 font-medium leading-none"
                        style={{ fontSize: 'var(--fs-input)', padding: '1px 2px' }}
                    >
                        ×
                    </button>
                </Tltip>
            )}
        </div>
    );
};

export default DatePicker;
