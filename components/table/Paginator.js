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
          className="responsiveTextInput font-medium transition-colors"
          style={{
            color: table.getCanPreviousPage() ? 'var(--endeavour)' : 'var(--rock-blue)',
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
                className="min-w-[2rem] h-8 responsiveTextInput font-medium rounded-full border transition-all duration-200"
                style={{
                  backgroundColor: isActive ? 'var(--endeavour)' : 'var(--bg-card)',
                  color: isActive ? 'var(--on-brand)' : 'var(--endeavour)',
                  borderColor: isActive ? 'var(--endeavour)' : 'var(--line-strong)'
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
          className="responsiveTextInput font-medium transition-colors"
          style={{
            color: table.getCanNextPage() ? 'var(--endeavour)' : 'var(--rock-blue)',
            cursor: table.getCanNextPage() ? 'pointer' : 'not-allowed'
          }}
        >
          Next
        </button>

      </nav>
    </div>
  );
};
