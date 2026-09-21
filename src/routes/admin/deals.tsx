import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { DealBadge } from '@/components/DealBadge'
import { Modal } from '@/components/admin/Modal'
import { Pagination, usePagination } from '@/components/admin/Pagination'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { DealForm } from '@/components/admin/DealForm'
import { errorMessage } from '@/components/admin/FormField'
import { toUsd, useCurrency } from '@/lib/currency'
import { timeAgo, useLiveNow } from '@/lib/time'
import {
  brandName,
  deleteDeal,
  discountPct,
  useBrands,
  useDataStatus,
  useDeals,
} from '@/lib/data'
import { CATEGORIES } from '@/types/catalog'
import type { Deal } from '@/types/catalog'

export const Route = createFileRoute('/admin/deals')({
  component: DealsTab,
})

const SORTS = {
  title: 'Title (A–Z)',
  'price-asc': 'Price (low to high)',
  'price-desc': 'Price (high to low)',
  updated: 'Recently updated',
} as const
type SortKey = keyof typeof SORTS

// Compact, pill-shaped filter controls — matches the search bar's height so
// the whole filter row reads as one connected group (same pattern as
// admin/products.tsx).
const pillClass =
  'rounded-full border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-clay'

function DealsTab() {
  const deals = useDeals()
  const brands = useBrands()
  const { loaded } = useDataStatus()
  const { format } = useCurrency()
  useLiveNow() // re-render periodically so "Last updated" cells stay current
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState<SortKey>('updated')
  const [editing, setEditing] = useState<Deal | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Deal | null>(null)

  const rows = useMemo(() => {
    const filtered = deals.filter((d) => {
      if (category && d.category !== category) return false
      if (brand && d.brand !== brand) return false
      if (
        q &&
        !(d.title + brandName(brands, d.brand)).toLowerCase().includes(q.toLowerCase())
      )
        return false
      return true
    })

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'updated':
          return (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
        case 'title':
        default:
          return a.title.localeCompare(b.title)
      }
    })
  }, [deals, brands, q, category, brand, sort])

  const { page, pageSize, pageCount, pagedRows, totalCount, setPage, setPageSize } =
    usePagination(rows)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search deals..."
              aria-label="Search deals"
              className={`${pillClass} w-48 pl-8`}
            />
          </div>
          <select
            aria-label="Filter by category"
            className={pillClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORIES).map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by brand"
            className={pillClass}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort deals"
            className={pillClass}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {Object.entries(SORTS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          disabled={brands.length === 0}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          + Add deal
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Disc.</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Network</th>
              <th className="px-4 py-3">Clicks</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-3">{d.product}</td>
                <td className="px-4 py-3">{brandName(brands, d.brand)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {format(toUsd(d.price))}
                </td>
                <td className="px-4 py-3">{discountPct(d)}%</td>
                <td className="px-4 py-3 font-mono text-xs">{d.code ?? '—'}</td>
                <td className="px-4 py-3 text-xs">{d.network}</td>
                <td className="px-4 py-3">
                  {d.clicks.toLocaleString('en-US')}
                </td>
                <td className="px-4 py-3">
                  <DealBadge badge={d.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(d.updated_at)}
                </td>
                <td className="px-4 py-3">
                  {/* Just Edit + Delete — pause/resume/expire and every other
                      field move into the Edit modal's Status dropdown
                      (DealForm) instead of living as separate row actions. */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(d)}
                      className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] hover:border-clay hover:text-clay"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(d)}
                      className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] hover:border-destructive hover:text-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded ? 'No deals match your search.' : 'Loading deals...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add deal' : 'Edit deal'}
          onClose={() => setEditing(null)}
          size="xl"
        >
          <DealForm
            deal={editing === 'new' ? undefined : editing}
            brands={brands}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete deal"
          description={`This will permanently remove "${deleting.title}".`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteDeal(deleting.id)
              setDeleting(null)
            } catch (err) {
              window.alert(errorMessage(err, 'Failed to delete deal.'))
            }
          }}
        />
      ) : null}
    </>
  )
}
