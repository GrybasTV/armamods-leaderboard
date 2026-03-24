

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  accentColor?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  accentColor = 'from-blue-600 to-blue-700',
  className = ''
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return Array.from({ length: 7 }, (_, i) => i + 1);
    if (currentPage >= totalPages - 3) return Array.from({ length: 7 }, (_, i) => totalPages - 6 + i);
    return Array.from({ length: 7 }, (_, i) => currentPage - 3 + i);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 border border-gray-100 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`
            w-full sm:w-auto px-6 py-3 bg-gradient-to-r ${accentColor} text-white rounded-xl 
            hover:shadow-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed
            hover:-translate-x-1 active:translate-x-0
          `}
        >
          ← Previous
        </button>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {getPageNumbers().map((pageNum) => {
            const isCurrentPage = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`
                  min-w-[48px] h-12 rounded-xl font-bold transition-all text-sm
                  ${isCurrentPage
                    ? `bg-gradient-to-r ${accentColor} text-white shadow-xl scale-110 z-10`
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:scale-105 active:scale-95'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`
            w-full sm:w-auto px-6 py-3 bg-gradient-to-r ${accentColor} text-white rounded-xl 
            hover:shadow-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed
            hover:translate-x-1 active:translate-x-0
          `}
        >
          Next →
        </button>
      </div>

      <div className="text-center mt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Page {currentPage} <span className="mx-2 text-gray-200">/</span> {totalPages}
        </p>
      </div>
    </div>
  );
}
