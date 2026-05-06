import { addComma } from '../../../../app/(root)/cashflow/funcs';
import { cn } from '../../../../lib/utils';
import { memo } from 'react';

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

export const Input = memo(function Input({ props, handleChange, month, name, styles, addCur }) {
  const value = props.column.id === 'description'
    ? props.getValue()
    : addCur
    ? addComma(props.getValue())
    : showAmount(props.getValue());

  return (
    <input
      type="text"
      value={value}
      name={name}
      onChange={(e) => handleChange(e, props.row.index, month)}
      className={cn(styles, INPUT_CLASS)}
      style={INPUT_STYLE}
    />
  );
}, (prev, next) =>
  prev.props.getValue() === next.props.getValue() &&
  prev.props.row.index === next.props.row.index &&
  prev.month === next.month &&
  prev.name === next.name &&
  prev.addCur === next.addCur
);

export default Input;