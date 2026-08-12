import { addComma } from '../../../../app/(root)/cashflow/funcs';
import { cn } from '../../../../lib/utils';
import { useRef, useLayoutEffect, useState } from 'react';
import Tltip from '../../../../components/tlTip';

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
// .responsiveText carries min-w-0; .responsiveTextInput below carries only a
// font-size, which is why this input clipped and the read-only ones didn't.
//
// px-1 rather than px-2: the padding is breathing room for the hover/focus
// border, and 7px a side was coming straight off the digits' width.
//
// text-ellipsis: an <input> clips its overflow at the content box with no mark,
// so a cut alloy spec ("…1.71Mo 1.2\") read as corrupt data rather than as a
// long value. The ellipsis says "there is more"; the tooltip below says what.
// It only takes effect while the field is unfocused — click in and the input
// scrolls through the whole value as normal.
const INPUT_CLASS = `
  w-full
  min-w-0
  bg-transparent
  rounded-control
  px-1
  text-ellipsis
  responsiveTextInput
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

const INPUT_STYLE = { minHeight: '26px', fontVariantNumeric: 'tabular-nums' };

export const Input = function Input({ props, handleChange, month, name, styles, addCur, placeholder }) {
  const inputRef = useRef(null);
  const savedCursor = useRef(null);

  // Restore cursor position after React re-renders the controlled input
  // Only needed for text fields (description) where cursor can jump to end
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && savedCursor.current !== null) {
      input.setSelectionRange(savedCursor.current, savedCursor.current);
      savedCursor.current = null;
    }
  });

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
        if (name === 'description') {
          savedCursor.current = e.target.selectionStart;
        }
        handleChange(e, props.row.original.id, month);
      }}
      className={cn(styles, INPUT_CLASS)}
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
