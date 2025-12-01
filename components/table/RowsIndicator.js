import { Menu, Transition, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Fragment } from 'react';
import { HiMiniChevronUpDown } from "react-icons/hi2";
import { useContext } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages';

const RowsIndicator = ({ table }) => {
	const { ln } = useContext(SettingsContext);

	const setClickHandler = (x) => {
		table.setPageSize(x)
	}

	return (
		<div className="py-1 px-1 md:px-4 self-center flex items-center space-x-2 m-auto md:m-0">
			<span className="text-gray-600 text-sm">{getTtl('Rows per page', ln)}:</span>
			<Menu as="div" className="relative inline-block">
				<MenuButton
					className="inline-flex w-full justify-center border border-slate-300 rounded-md px-4 py-1 text-xs font-medium text-gray-500
								hover:border-slate-400"
				>
					<span className='items-center flex pt-[2px]'>{table.getState().pagination.pageSize}</span>
					<HiMiniChevronUpDown
						className="ml-2 -mr-1 mt-0.5 h-4 w-4 text-gray-400"
						aria-hidden="true"
					/>
				</MenuButton>

				<Transition
					as={Fragment}
					enter="transition ease-out duration-100"
					enterFrom="transform opacity-0 scale-95"
					enterTo="transform opacity-100 scale-100"
					leave="transition ease-in duration-75"
					leaveFrom="transform opacity-100 scale-100"
					leaveTo="transform opacity-0 scale-95"
				>
					<MenuItems className={`absolute right-0 bottom-10 w-[4.2rem] origin-top-right rounded-md 
					bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50`}>
						<div className="px-1 py-1 ">
							{[5, 10, 20, 30, 50, 100, 500].map((x, i) => {
								return (
									<MenuItem key={i}>
										<button
											className={`${table.getState().pagination.pageSize === x
												? 'bg-slate-400 text-white'
												: 'text-gray-600'
												} flex w-full items-center rounded-md px-2 py-2 text-sm mt-0.5 justify-center
														${table.getState().pagination.pageSize !== x ? ' hover:bg-slate-200' : null}`}
											onClick={() => setClickHandler(x)}
										>
											{x}
										</button>
									</MenuItem>
								);
							})}
						</div>
					</MenuItems>
				</Transition>
			</Menu>
		</div>
	);
};

export default RowsIndicator;