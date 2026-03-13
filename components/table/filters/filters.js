import Tltip from '../../../components/tlTip';
import { getTtl } from '../../../utils/languages';
import Image from 'next/image';

const Filters = (ln, filterOn, setFilterOn) => {
    const setFilter = () => {
        setFilterOn(!filterOn);
    };

    return (
        <div>
            <Tltip direction='bottom' tltpText={getTtl('Filters', ln)}>
                <button
                    onClick={setFilter}
                    className="group text-[var(--chathams-blue)] justify-center w-8 h-8 inline-flex items-center text-sm rounded-full hover:drop-shadow-md focus:outline-none transition-colors"
                >
                    <Image
                        src="/logo/filter.svg"
                        alt="Filter"
                        width={16}
                        height={16}
                        className="w-4 h-4 object-cover"
                        priority
                    />
                </button>
            </Tltip>
        </div>
    );
};

export default Filters;
