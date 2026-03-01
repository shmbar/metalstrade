import { HiChevronLeft } from 'react-icons/hi';
import { HiChevronRight } from 'react-icons/hi';

export const Paginator = ({ table }) => {
  const currentPage = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

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
      <nav className="flex items-center gap-4">

        {/* Previous */}
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="text-[0.75rem] font-medium transition-colors"
          style={{
            color: table.getCanPreviousPage() ? '#1D3D79' : '#005b9f',
            cursor: table.getCanPreviousPage() ? 'pointer' : 'not-allowed'
          }}
        >
          Previous
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-2">
          {getPageNumbers().map((pageIndex) => {
            const isActive = currentPage === pageIndex;

            return (
              <button
                key={pageIndex}
                onClick={() => table.setPageIndex(pageIndex)}
                className="min-w-[2.2rem] h-9 text-[0.75rem] font-medium rounded-lg border transition-all duration-200"
                style={{
                  backgroundColor: isActive ? '#1D3D79' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#1D3D79',   // ✅ WHITE TEXT HERE
                  borderColor: isActive ? '#1D3D79' : '#E5E7EB'
                }}
              >
                {pageIndex + 1}
              </button>
            );
          })}
        </div>

        {/* Next */}
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="text-[0.75rem] font-medium transition-colors"
          style={{
            color: table.getCanNextPage() ? '#1D3D79' : '#005b9f',
            cursor: table.getCanNextPage() ? 'pointer' : 'not-allowed'
          }}
        >
          Next
        </button>

      </nav>
    </div>
  );
};