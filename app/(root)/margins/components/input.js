import { addComma } from '@app/(root)/cashflow/funcs';
import { cn } from '@lib/utils';


let showAmount = (nStr) => {
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1,$2');
    }

    x2 = x2.length > 3 ? x2.substring(0, 3) : x2
    return (x1 + x2);
}

export const Input = ({ props, handleChange, month, name, styles, addCur }) => {

    return (
        <div>
            <input
                type='text'
                value={props.column.id === 'description' ? props.getValue() :
                    addCur ? addComma(props.getValue()) : showAmount(props.getValue())}
                name={name}
                onChange={(e) => handleChange(e, props.row.index, month)}
                className={cn('input h-8 text-xs', styles)}
            />
        </div>
    )
}

export default Input