import { useContext } from "react";
import { FaSearch } from "react-icons/fa";
import { TiDeleteOutline } from "react-icons/ti";
import ColFilter from "./ColumnsFilter";
import { getTtl } from '@utils/languages';
import { SettingsContext } from "@contexts/useSettingsContext";
import { usePathname } from 'next/navigation'

const Header = ({ data, cb, cb1, type, excellReport,
	globalFilter, setGlobalFilter, table, }) => {

	const { ln } = useContext(SettingsContext);
	const pathname = usePathname()

	return (
		<div className="justify-between flex p-3 flex-wrap bg-gray-50 border rounded-t-xl">
			<div className='flex items-center gap-5 w-full sm:w-auto'>
				{pathname !== '/accounting' &&
					<div className="flex items-center relative md:max-w-64 w-full sm:w-auto md:w-64">
						<input className='input border-slate-300 shadow-sm pr-8' placeholder={getTtl('Search', ln)}
							value={globalFilter ?? ''}
							onChange={e => setGlobalFilter(e.target.value)} type='text' />

						{globalFilter === '' ?
							<FaSearch className="scale-140 text-slate-400 font-bold absolute right-2 " />
							:
							<TiDeleteOutline className="scale-150 text-slate-400 font-bold absolute right-2 cursor-pointer "
								onClick={() => setGlobalFilter('')} />
						}

					</div>
				}
				<div className={`${type === 'stock' ? 'w-[10rem]' : 'w-[7rem]'}`}>
					{cb}
				</div>

			</div>

			<div className='self-center justify-content flex'>
				<div className="flex items-center justify-center space-x-1 flex-wrap">
					{type === 'stock' &&
						<div className='flex items-center gap-1'>
							<p className='text-[0.85rem] font-medium text-gray-500'>{getTtl('Weight', ln)}:</p>
							<div className='w-[10rem]'>{cb1}</div>
						</div>
					}
					{excellReport}
					<ColFilter table={table} />
				</div>
			</div>

		</div>

	)
}

export default Header;