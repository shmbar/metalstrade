import Tltip from '@components/tlTip';
import { getTtl } from '@utils/languages';
import { AiOutlineClear } from "react-icons/ai";


const Filters = (ln, resetTable, filterOn) => {



    return (
        <div>
            {filterOn && <Tltip direction='bottom' tltpText={getTtl('Reset Table', ln)}>
                <button onClick={() => resetTable()}
                    className="group hover:bg-slate-200 text-slate-700 justify-center w-10 h-10 inline-flex
     items-center text-sm rounded-full  hover:drop-shadow-md focus:outline-none "
                >
                    {
                        <AiOutlineClear className="scale-[1.4] text-gray-500" />
                    }
                </button>
            </Tltip>
            }
        </div>
    );
}


export default Filters;