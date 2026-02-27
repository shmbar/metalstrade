import { HiChevronLeft } from 'react-icons/hi';
import { HiChevronRight } from 'react-icons/hi';
import { HiChevronDoubleRight } from 'react-icons/hi';
import { HiChevronDoubleLeft } from 'react-icons/hi';


export const Paginator = ({table}) => {
	const currentPage = table.getState().pagination.pageIndex;
	const pageCount = table.getPageCount();

	// Generate page numbers to display
	const getPageNumbers = () => {
		const pages = [];
		const maxVisible = 5;
		let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
		let end = Math.min(pageCount, start + maxVisible);
		
		if (end - start < maxVisible) {
			start = Math.max(0, end - maxVisible);
		}
		
		for (let i = start; i < end; i++) {
			pages.push(i);
		}
		return pages;
	};

	return (
		<div className="self-center">
			<nav className="flex items-center gap-3">
				{/* Previous Button */}
				<button
					onClick={() => table.getCanPreviousPage() && table.previousPage()}
					disabled={!table.getCanPreviousPage()}
					className={`text-[0.72rem] font-medium text-[#005b9f] hover:text-[var(--endeavour)]
						${!table.getCanPreviousPage() ? 'cursor-not-allowed' : 'cursor-pointer'}`}
				>
					Previous
				</button>

				{/* Page Numbers */}
				<div className="flex items-center gap-1">
					{getPageNumbers().map((pageIndex) => (
						<button
							key={pageIndex}
							onClick={() => table.setPageIndex(pageIndex)}
							className={`min-w-[2rem] h-8 text-[0.72rem]  font-medium rounded-md border transition-all
								${currentPage === pageIndex 
									? 'bg-[var(--endeavour)] text-white border-[var(--endeavour)]' 
									: 'bg-white text-[var(--port-gore)] border-gray-200 hover:border-[var(--endeavour)]'}`}
						>
							{pageIndex + 1}
						</button>
					))}
				</div>

				{/* Next Button */}
				<button
					onClick={() => table.getCanNextPage() && table.nextPage()}
					disabled={!table.getCanNextPage()}
					className={`text-[0.72rem] font-medium text-[#005b9f] hover:text-[var(--endeavour)] transition-colors
						${!table.getCanNextPage() ? ' cursor-not-allowed' : 'cursor-pointer'}`}
				>
					Next
				</button>
			</nav>
		</div>
	)
}
