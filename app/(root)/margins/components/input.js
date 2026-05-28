import { addComma } from '../../../../app/(root)/cashflow/funcs';
import { cn } from '../../../../lib/utils';
import { useRef, useLayoutEffect } from 'react';

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

const INPUT_CLASS = `
  w-full
  bg-[#f8fbff]
  rounded-lg
  px-2
  text-[0.68rem] xl:text-[0.72rem] 2xl:text-[0.75rem] 3xl:text-[0.8125rem]
  !text-[var(--port-gore)]
  border border-[#d8e8f5]
  outline-none
  focus:ring-1
  focus:ring-[var(--endeavour)]
  focus:border-[var(--endeavour)]
  shadow-none
  transition
`;

const INPUT_STYLE = { minHeight: '26px', fontFamily: "var(--font-poppins), 'Poppins', sans-serif" };

export const Input = function Input({ props, handleChange, month, name, styles, addCur }) {
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

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      name={name}
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
};

export default Input;