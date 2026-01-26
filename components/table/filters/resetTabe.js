import Tltip from '../../../components/tlTip';
import { getTtl } from '../../../utils/languages';
import Image from 'next/image';

const Filters = (ln, resetTable, filterOn) => {
    return (
        <div>
            {filterOn && (
                <Tltip direction='bottom' tltpText={getTtl('Reset Table', ln)}>
                    <button
                        onClick={() => resetTable()}
                        className="w-8 h-8 inline-flex items-center justify-center rounded  cursor-pointer  focus:outline-none"
                    >
                        <Image
                            src="/logo/reset.svg"
                            alt="Reset Table"
                            width={16}
                            height={16}
                            className="w-4 h-4 object-cover"
                            priority
                        />
                    </button>
                </Tltip>
            )}
        </div>
    );
}

export default Filters;
