'use client'
import Datepicker from "react-tailwindcss-datepicker";
import Tltip from "../../../../components/tlTip";

const getDateValue = (props) =>
    typeof props.getValue === 'function' ? props.getValue() : props.value;

/* w-full, NOT a fixed width. The date column is `tableLayout: fixed`, and this
   input used to be w-24 (96px) — wider than its own cell. The cell sets
   overflow:visible for the calendar popup, so the input just spilled past the
   wrapper instead of being clipped, and the clear button (absolute right-0
   against the wrapper) landed ~21px inside the input's visible right edge:
   floating between the date and the column divider rather than sitting in the
   padding reserved for it. Input and wrapper have to share a width for right-0
   to mean "the right edge of this input".

   Padding is SYMMETRIC (px-3) and the text is centred, so the date sits in the
   middle of the cell and the clear button lives in the right gutter. The old
   pl-1/pr-4 pair squeezed the content box to ~55px against a "DD.MM.YY" that
   measures ~58px at --fs-body on a wide viewport — and an <input> clips to its
   content box rather than overflowing, so the year's last digit vanished under
   the × button. The column is 9% (see COLUMN_CONFIGS in ../newTable.js) and the
   cell contributes no horizontal padding, which leaves ~85px of content box:
   the date can't reach the button at any rung of the type ladder.

   responsiveTextTableTitle, NOT responsiveText. This is a table cell like every
   other one in the row, but it was the only one still reading its size off the
   body rung after the rest of the body band moved to the caption rung — 11px
   against 9px, which is exactly why the date column looked a size up in every
   row. The two global datepicker rules that force --fs-body !important are
   keyed to .header-datepicker / .react-tailwindcss-datepicker-container, and
   this picker carries neither (containerClassName replaces the library's
   default class list), so the class here is what actually decides the size. */
const DATE_INPUT_CLASS =
    'responsiveTextTableTitle h-7 py-0 px-3 w-full bg-transparent border-0 outline-none cursor-pointer text-[var(--brand)] text-center';

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
        /* w-full down the whole chain: this div is what the clear button below is
           positioned against, so it has to be exactly as wide as the input. */
        <div className="relative flex items-center justify-center w-full">
            <div className="datepicker-wrapper w-full">
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
                        /* One rung above the date beside it, not three. At
                           --fs-input this glyph was the largest thing in the
                           table body; --fs-table keeps it big enough to read as
                           a hit target without competing with the row. */
                        style={{ fontSize: 'var(--fs-table)', padding: '1px 2px' }}
                    >
                        ×
                    </button>
                </Tltip>
            )}
        </div>
    );
};

export default DatePicker;
