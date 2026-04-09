import { addComma } from '../../../../app/(root)/cashflow/funcs';
import { cn } from '../../../../lib/utils';

let showAmount = (nStr) => {
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

export const Input = ({ props, handleChange, month, name, styles, addCur }) => {
  return (
    <input
      type="text"
      value={
        props.column.id === 'description'
          ? props.getValue()
          : addCur
          ? addComma(props.getValue())
          : showAmount(props.getValue())
      }
      name={name}
      onChange={(e) => handleChange(e, props.row.index, month)}
      className={cn(
        styles,
        `
        w-full
        bg-[#f8fbff]
        rounded-lg
        px-2
        text-[0.68rem] xl:text-[0.72rem] 2xl:text-[0.75rem] 3xl:text-[0.8125rem]
        !text-[#1F2937]
        border border-[#d8e8f5]
        outline-none
        focus:ring-1
        focus:ring-[var(--endeavour)]
        focus:border-[var(--endeavour)]
        shadow-none
        transition
        `
      )}
      style={{ minHeight: '26px', fontFamily: "var(--font-poppins), 'Geist', sans-serif" }}
    />
  );
};

export default Input;