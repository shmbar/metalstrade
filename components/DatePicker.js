'use client';

/* react-tailwindcss-datepicker with a tooltip on its icon button (UX audit, 2026-09-30).

   The library's button beside every date field is icon-only and unnamed. It also does two
   different things: with the field empty it opens the calendar; with a date in it, a click
   CLEARS the date (the library's own toggle behaviour, v1.6.6). The picture changes (a
   calendar, then a ×) but nothing said so, and 17 date fields across the contract,
   invoice, expense and payment windows used it raw.

   This wrapper changes nothing but that: the same two glyphs, copied from the library
   (heroicons outline, 1.5 stroke, h-5 w-5), now carry a `data-tip` the tooltip engine
   (components/GlobalTooltip.js) shows — "Pick a date" / "Clear the date", or the range
   wording. Every prop passes straight through; a caller's own `toggleIcon` still wins. */

import Datepicker from 'react-tailwindcss-datepicker';

const Glyph = ({ tip, d }) => (
    <svg data-tip={tip} className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

const CALENDAR = 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z';
const CLEAR = 'M6 18L18 6M6 6l12 12';

export default function DatePicker({ toggleIcon, ...props }) {
    const single = props.asSingle || props.useRange === false;
    const icon = toggleIcon || ((isEmpty) => (isEmpty
        ? <Glyph tip={single ? 'Pick a date' : 'Pick a date range'} d={CALENDAR} />
        : <Glyph tip={single ? 'Clear the date' : 'Clear the dates'} d={CLEAR} />));
    return <Datepicker {...props} toggleIcon={icon} />;
}
