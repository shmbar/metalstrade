import ColFilter from './ColumnsFilter';
import ExcelExport from './ExcelExport';
import TableReset from './tableReset';

const Header = ({ cols, data, name, searchValue, onChange, resetTable, setCols, cb, cb1, type, excellReport }) => {

	return (
		<div className="justify-between flex p-3 flex-wrap bg-gray-50 border-b ">
			<div className='flex gap-5'>
				<input className='input border-slate-300 shadow-sm' placeholder='Search' value={searchValue}
					onChange={onChange} />
				<div className={`${type === 'stock' ? 'w-[20rem]' : 'w-[10rem]'}`}>{cb}</div>

			</div>
			<div className='self-center justify-content flex'>
				<div className="flex items-center justify-center space-x-1">
					<div className='flex items-center gap-1'>
						<p className={`${type === 'stock' ? 'flex' : 'hidden'} text-[0.85rem] font-medium text-gray-500`}>WEIGHT:</p>
						<div className={`${type === 'stock' ? 'w-[10rem]' : 'hidden'}`}>{cb1}</div>
					</div>

					<TableReset resetTable={resetTable} />
					{excellReport}
					<ColFilter cols={cols} setCols={setCols} />
				</div>
			</div>
		</div>

	)
}

export default Header;