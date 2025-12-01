import React from 'react';
import { HiMiniViewColumns } from 'react-icons/hi2';
import ChkBox from '@components/checkbox.js'
import { useState, useCallback } from 'react';
import Tooltip from '@components/tooltip';

const Item = ({ value, handleToggleCols }) => {
	
	return (
		<div
			className='whitespace-nowrap text-left py-2 items-center flex hover:bg-slate-100 w-full rounded-lg px-2 cursor-pointer'
		>
			<ChkBox checked={value.showcol} size='h-5 w-5' onChange={()=>handleToggleCols(value)} />
			<span className='ml-2 text-sm'>{value.header}</span>
		</div>
	);
};


const ColFilter = ({ cols, setCols }) => {
	const [open, setOpen] = useState(false)



	const handleToggleCols = useCallback(
    (value) => {
      setCols((prevCols) => {
        return prevCols.map((col) => {
          if (col.field === value.field) {
            return { ...col, showcol: !col.showcol };
          }
          return col;
        });
      });
    },
    [setCols]
  );

	let filtRows = cols.map((value, indx) => {
		return (
			<Item key={indx} value={value} handleToggleCols={handleToggleCols}/>
		)
	});


	const Example = () => {
		return (
			<div className="relative">

				<button onClick={() => setOpen(!open)}
					className="group hover:bg-slate-200 text-slate-700 justify-center w-10 h-10 inline-flex
				 items-center text-sm rounded-full hover:drop-shadow-md focus:outline-none"
				>
					<HiMiniViewColumns className="scale-[1.4] text-gray-500" />
					<Tooltip txt='Columns' />
				</button>


				{open &&
					<div className="right-0 absolute z-10 mt-3 transform px-2 sm:px-0">
						<div className="overflow-auto max-h-96 2xl:max-h-full 2xl:overflow-hidden rounded-lg shadow-lg bg-white py-4 px-2 w-full
						">
							<div className='pb-1 text-md pl-2'>Columns</div>
							<div>{filtRows}</div>
						</div>

					</div>
				}
				{open ? (<div className='fixed top-0 right-0 bottom-0 left-0' onClick={() => setOpen(false)} />) : null}
			</div>

		);
	};

	return (
		<div>
			<Example />
		</div>
	);
};

export default ColFilter;
