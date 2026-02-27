import { Menu, Transition, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Fragment } from 'react';
import { HiMiniChevronUpDown } from "react-icons/hi2";
import { useContext } from 'react';
import { SettingsContext } from "../../contexts/useSettingsContext";
import { getTtl } from '../../utils/languages';

const RowsIndicator = ({ table }) => {
	const { ln } = useContext(SettingsContext);

	const setClickHandler = (x) => {
		table.setPageSize(x)
	}

	return (
		<div className="py-1 px-1 md:px-4 self-center flex items-center space-x-2 m-auto md:m-0">
			<span className="text-[#005b9f] text-[0.72rem]">Rows:</span>
			<Menu as="div" className="relative inline-block">
				<MenuButton
					className="inline-flex w-full justify-center border border-[#005b9f]/50 rounded-lg px-4 py-1 text-[0.72rem] font-medium text-[var(--port-gore)]
									hover:border-[var(--endeavour)] transition-colors"
				>
					<span className='items-center flex pt-[2px] text-[#005b9f]'>{table.getState().pagination.pageSize}</span>
					<HiMiniChevronUpDown
						className="ml-2 -mr-1 mt-0.5 h-4 w-4 text-[#005b9f]"
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
					<MenuItems className={`absolute right-0 bottom-10 w-[4.2rem] origin-top-right rounded-lg 
					bg-white shadow-lg ring-1 ring-[var(--selago)] focus:outline-none z-50`}>
						<div className="px-1 py-1 ">
							{[5, 10, 20, 30, 50, 100, 500].map((x, i) => {
								return (
									<MenuItem key={i}>
										<button
											className={`${table.getState().pagination.pageSize === x
												? 'bg-gradient-to-r from-[var(--endeavour)] to-[var(--chathams-blue)] text-white'
												: 'text-[var(--port-gore)]'
												} flex w-full items-center rounded-lg px-2 py-1.5 text-[0.72rem] mt-0.5 justify-center
														${table.getState().pagination.pageSize !== x ? ' hover:bg-[var(--selago)]' : null}`}
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
