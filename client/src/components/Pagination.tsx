import type { Pagination as PaginationData } from '../types';

export function Pagination({
  pagination,
  onPageChange,
  onLimitChange,
}: {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const { page, limit, total, totalPages, hasNextPage, hasPrevPage } = pagination;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-ink-200 bg-gradient-to-r from-ink-950 to-data-900/30">
      <p className="text-xs text-ink-600 tabular">
        Showing <span className="font-semibold text-ink-900">{from}–{to}</span> of{' '}
        <span className="font-semibold text-ink-900">{total}</span>
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-ink-600">
          Rows
          <select
            className="h-7 px-1.5 text-xs bg-ink-900 text-white border border-ink-700 rounded hover:border-data-400 outline-none"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {[20, 50, 100].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button type="button" className="btn-secondary h-7 px-2 text-xs" onClick={() => onPageChange(page - 1)} disabled={!hasPrevPage}>
            Previous
          </button>
          <span className="text-xs text-ink-600 tabular px-2">
            {page} / {Math.max(totalPages, 1)}
          </span>
          <button type="button" className="btn-secondary h-7 px-2 text-xs" onClick={() => onPageChange(page + 1)} disabled={!hasNextPage}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
