import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { FaChevronDown } from 'react-icons/fa';

const Lines = ({ linesPerPage,  setNumOfLinesToshow, drpSelection}) => {
	return (
		<div>
			<Menu as="div" className="relative inline-block">
				<Menu.Button
					className="inline-flex w-full justify-center border border-slate-300 rounded-md px-4 py-2 text-sm font-medium text-gray-400
								hover:border-slate-400"
				>
					{linesPerPage}
					<FaChevronDown
						className="ml-2 -mr-1 mt-0.5 h-4 w-4 text-gray-300"
						aria-hidden="true"
					/>
				</Menu.Button>

				<Transition
					as={Fragment}
					enter="transition ease-out duration-100"
					enterFrom="transform opacity-0 scale-95"
					enterTo="transform opacity-100 scale-100"
					leave="transition ease-in duration-75"
					leaveFrom="transform opacity-100 scale-100"
					leaveTo="transform opacity-0 scale-95"
				>
					<Menu.Items className={`absolute right-0 ${linesPerPage>5 ? 'bottom-10': 'mt-0.5'} w-[4.2rem] origin-top-right rounded-md 
					bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
						<div className="px-1 py-1 ">
							{drpSelection.map((x, i) => {
								return (
									<Menu.Item key={i}>
										<button
											className={`${
												linesPerPage === x
													? 'bg-slate-400 text-white'
													: 'text-gray-900'
											} group flex w-full items-center rounded-md px-2 py-2 text-sm mt-0.5
														${linesPerPage !== x ? ' hover:bg-slate-200' : null}`}
											onClick={() => setNumOfLinesToshow(x)}
										>
											{x}
										</button>
									</Menu.Item>
								);
							})}
						</div>
					</Menu.Items>
				</Transition>
			</Menu>
		</div>
	);
};

export default Lines;