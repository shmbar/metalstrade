import Tltip from '../../../components/tlTip';
import { getTtl } from '../../../utils/languages';
import Image from 'next/image';
import { RotateCcw } from "lucide-react";

const Filters = (ln, resetTable, filterOn) => {
    return (
        <div>
            {filterOn && (
                <Tltip direction='bottom' tltpText={getTtl('Reset Table', ln)}>
                    <button
                        onClick={() => resetTable()}
                        className="w-8 h-8 inline-flex items-center justify-center rounded  cursor-pointer  focus:outline-none"
                    >
                        <RotateCcw className="w-4 h-4" strokeWidth={2} />
                    </button>
                </Tltip>
            )}
        </div>
    );
}

export default Filters;
