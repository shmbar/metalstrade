import Tltip from '../../../components/tlTip';
import { getTtl } from '../../../utils/languages';
import Image from 'next/image';
import { Filter } from "lucide-react";

const Filters = (ln, filterOn, setFilterOn) => {
    const setFilter = () => {
        setFilterOn(!filterOn);
    };

    return (
        <div>
            <Tltip direction='bottom' tltpText={getTtl('Filters', ln)}>
                <button
                    onClick={setFilter}
                    className="group text-[var(--chathams-blue)] justify-center w-8 h-8 inline-flex items-center responsiveTextTitle rounded-full hover:drop-shadow-md focus:outline-none transition-colors"
                >
                    <Filter className="w-4 h-4" strokeWidth={2} />
                </button>
            </Tltip>
        </div>
    );
};

export default Filters;
