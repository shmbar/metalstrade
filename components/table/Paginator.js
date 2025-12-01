import { HiChevronLeft } from 'react-icons/hi';
import { HiChevronRight } from 'react-icons/hi';
import { HiChevronDoubleRight } from 'react-icons/hi';
import { HiChevronDoubleLeft } from 'react-icons/hi';


export const Paginator = ({table}) => {


	return (
		<div className="py-1 px-1 md:px-4 self-center m-auto md:m-0">
			<nav className="flex items-center space-x-2">
				<div className="inline-flex items-center gap-2"	>
					<HiChevronDoubleLeft className={`paginator_arrow scale-125
			   ${!table.getCanPreviousPage() ? 'opacity-50' : ''}`}
						onClick={() => table.setPageIndex(0)} />
					<HiChevronLeft className={`paginator_arrow scale-125
			 ${!table.getCanPreviousPage() ? 'opacity-50' : ''}`}
						onClick={() => table.getCanPreviousPage() && table.previousPage()}
					/>
					<span className="text-slate-100  size-8 rounded-full bg-slate-400 items-center justify-center flex select-none">
						{table.getState().pagination.pageIndex + 1}
					</span>
					<HiChevronRight className={`paginator_arrow scale-125 
			${!table.getCanNextPage() ? 'opacity-50' : ''}`}
						onClick={() => table.getCanNextPage() && table.nextPage()}
					/>
					<HiChevronDoubleRight className={`paginator_arrow scale-125
			   ${!table.getCanNextPage() ? 'opacity-50' : ''}`}
						onClick={() => table.setPageIndex(table.getPageCount() - 1)} />

				</div>
			</nav>
		</div>
	)
}
