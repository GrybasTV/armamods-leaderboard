import { useState, useMemo } from 'react';

export function usePagination(totalItems: number, itemsPerPage: number = 24) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => 
    Math.ceil(totalItems / itemsPerPage), 
    [totalItems, itemsPerPage]
  );

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    currentPage,
    totalPages,
    goToPage,
    setCurrentPage,
    itemsPerPage
  };
}
