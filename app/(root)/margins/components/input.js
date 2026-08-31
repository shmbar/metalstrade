import { addComma } from '../../../../app/(root)/cashflow/funcs';
import { cn } from '../../../../lib/utils';
import { useRef, useState } from 'react';
import Tltip from '../../../../components/tlTip';
import { useNumericCaret } from '@utils/numericCaret';

const showAmount = (nStr) => {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1,$2');
  }
  x2 = x2.length > 3 ? x2.substring(0, 3) : x2;
  return x1 + x2;
};

// Flat at rest (matches read-only tables app-wide); the input box only appears
// on hover/focus so the grid doesn't read as a wall of boxes.
//
// min-w-0 is load-bearing, not tidying. Every call site renders this inside a
// `flex` wrapper, and a flex item defaults to `min-width: auto` — for an <input>
// that resolves to the intrinsic width of its `size` attribute (~20ch, ~177px).
// That floor overrules `w-full`, so in a ~120px Margin cell the input stayed
// ~177px, overflowed to the right, and the cell's `overflow: hidden` cut it off:
// "$2,400,000" rendered as "$2,400,00" with a wide gap on the left, because the
// centred text was centred inside the oversized box rather than the cell.
// The explicit min-w-0 below is what keeps that from happening, whichever ladder
// class the field happens to carry.
//
// px-1 rather than px-2: the padding is breathing room for the hover/focus
// border, and 7px a side was coming straight off the digits' width.
//
const INPUT_CLASS = `
  cell-control
  w-full
  min-w-0
  bg-transparent
  rounded-control
  px-1
  responsiveTextTable
  !text-[var(--ink)]
  border border-transparent
  outline-none
  hover:border-[var(--line-strong)]
  hover:bg-[var(--bg-card)]
  focus:ring-2
  focus:ring-[var(--brand-soft)]
  focus:border-[var(--brand)]
  focus:bg-[var(--bg-card)]
  shadow-none
  transition-colors
`;

// Height comes from .cell-control in INPUT_CLASS above — this is an <input>,
// which never wraps, so it takes the band's fixed height rather than a
// min-height. It was a hardcoded 26px, 2px off every other in-cell control.
const INPUT_STYLE = { fontVariantNumeric: 'tabular-nums' };

export const Input = function Input({ props, handleChange, month, name, styles, addCur, placeholder }) {
  const inputRef = useRef(null);

  // Put the caret back where the user left it after React re-renders. This ran
  // for `description` only, on the assumption that a figure did not need it —
  // but a figure is reformatted on every keystroke, so it needs it MORE.
  // See @utils/numericCaret for why a figure is restored by digit count.
  const rememberCaret = useNumericCaret();

  const value = props.column.id === 'description'
    ? props.getValue()
    : addCur
    ? addComma(props.getValue())
    : showAmount(props.getValue());

  // Measured on hover rather than on render: a table can hold hundreds of these
  // and only the one under the pointer needs an answer, so nothing is laid out
  // or measured until you point at a cell. scrollWidth > clientWidth is the
  // element telling us its own text does not fit.
  const [clipped, setClipped] = useState(false);
  const checkClipped = () => {
    const el = inputRef.current;
    if (el) setClipped(el.scrollWidth > el.clientWidth + 1);
  };

  const field = (
    <input
      ref={inputRef}
      type="text"
      value={value}
      name={name}
      placeholder={placeholder}
      onMouseEnter={checkClipped}
      /* Radix opens a tooltip on focus as well as hover, which would drop the
         full value on top of the field the moment you click in to edit it.
         Suppress it while editing; the next hover measures again. */
      onFocus={() => setClipped(false)}
      onChange={(e) => {
        // description is free text and is written back verbatim, so a raw offset
        // survives. A figure is reformatted, so it goes back by digit count.
        rememberCaret(e, name === 'description' ? 'raw' : 'value');
        handleChange(e, props.row.original.id, month);
      }}
      /* text-ellipsis on the FREE-TEXT column only. An <input> clips its overflow
         with no mark, so a cut alloy spec read as corrupt data rather than a long
         value — the ellipsis says "there is more" and the tooltip says what.
         It must never reach a figure: `text-overflow: ellipsis` also reserves room
         for the "…" glyph, so on a narrow numeric cell it starts eating digits to
         make space and "0.57" renders as "0….". A number gets a column wide
         enough instead. */
      className={cn(styles, INPUT_CLASS, name === 'description' && 'text-ellipsis')}
      style={INPUT_STYLE}
    />
  );

  // Only the free-text column can outgrow its cell by enough to need this. A
  // figure is never revealed this way: a truncated number reads as a smaller
  // valid number, so those columns are sized to fit instead (see COLUMN_CONFIGS).
  if (name !== 'description') return field;

  return (
    <Tltip
      direction="top"
      show={clipped}
      /* Passed as JSX, not a string: Tltip title-cases plain-text tooltips, and
         an alloy spec has to read back exactly as it was typed. */
      tltpText={
        <span className="block max-w-[420px] break-words bg-[var(--tooltip-bg)] text-[var(--tooltip-ink)] border border-[var(--tooltip-border)] shadow-pop rounded-lg px-2 py-1 responsiveTextTable font-normal">
          {value}
        </span>
      }
    >
      {field}
    </Tltip>
  );
};

export default Input;
