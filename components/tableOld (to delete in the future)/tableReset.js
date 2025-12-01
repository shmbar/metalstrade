import Tooltip from '@components/tooltip';
import { MdLayersClear } from 'react-icons/md';

const TableReset = ({resetTable}) => {
  return (
    <div>
            <button onClick={resetTable}
                className="group hover:bg-slate-200 text-slate-700 justify-center w-10 h-10 inline-flex
     items-center text-sm rounded-full  hover:drop-shadow-md focus:outline-none"
            >
                <MdLayersClear className="scale-[1.5] text-gray-500 " />
                <Tooltip txt='Reset' />
            </button>
        </div>
  )
}

export default  TableReset;
