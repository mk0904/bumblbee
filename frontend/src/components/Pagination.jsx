import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function usePages(items, pageSize) {
  const [requestedPage, setPage] = useState(0);
  const total = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, total - 1);
  return {
    items: items.slice(page * pageSize, (page + 1) * pageSize),
    page,
    total,
    previous: () => setPage(Math.max(0, page - 1)),
    next: () => setPage(Math.min(total - 1, page + 1)),
  };
}
export function Pagination({ pages, label = 'Records' }) {
  if (pages.total <= 1) return null;
  return (
    <nav className="pagination" aria-label={`${label} pages`}>
      <span>
        {label} · {pages.page + 1} / {pages.total}
      </span>
      <div>
        <button
          className="icon-button"
          aria-label={`Previous ${label.toLowerCase()} page`}
          disabled={pages.page === 0}
          onClick={pages.previous}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          className="icon-button"
          aria-label={`Next ${label.toLowerCase()} page`}
          disabled={pages.page === pages.total - 1}
          onClick={pages.next}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
