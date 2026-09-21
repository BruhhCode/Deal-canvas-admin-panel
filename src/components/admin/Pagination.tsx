import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZES = [10, 20, 50, 100] as const

// Shared paging logic for admin tables — filters/sorts happen upstream
// (each tab computes its own `rows`), this just slices a page out of
// whatever list it's handed and keeps `page` in range as that list's
// length changes (e.g. a new search narrows it below the current page).
export function usePagination<T>(rows: T[]) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const clampedPage = Math.min(page, pageCount)

  const pagedRows = useMemo(
    () => rows.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [rows, clampedPage, pageSize],
  )

  return {
    page: clampedPage,
    pageSize,
    pageCount,
    pagedRows,
    totalCount: rows.length,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
  }
}

const pillClass =
  'rounded-full border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-clay'

export function Pagination({
  page,
  pageCount,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageCount: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  if (totalCount === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Showing {from}–{to} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <select
          aria-label="Rows per page"
          className={pillClass}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-full border p-1.5 hover:border-clay hover:text-clay disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-14 text-center text-xs text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="rounded-full border p-1.5 hover:border-clay hover:text-clay disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
