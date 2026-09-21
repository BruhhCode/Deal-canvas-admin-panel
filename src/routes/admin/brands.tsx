import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { Pagination, usePagination } from '@/components/admin/Pagination'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { BrandForm } from '@/components/admin/BrandForm'
import { errorMessage } from '@/components/admin/FormField'
import { CATEGORIES, categoryName } from '@/types/catalog'
import type { Brand } from '@/types/catalog'
import { timeAgo, useLiveNow } from '@/lib/time'
import {
  deleteBrand,
  useBrands,
  useDataStatus,
  useDeals,
  useProducts,
} from '@/lib/data'

export const Route = createFileRoute('/admin/brands')({
  component: BrandsTab,
})

const SORTS = {
  name: 'Name (A–Z)',
  updated: 'Recently updated',
  products: 'Most products',
} as const
type SortKey = keyof typeof SORTS

// Compact, pill-shaped filter controls — matches the search bar's height so
// the whole filter row reads as one connected group (same pattern as
// admin/products.tsx).
const pillClass =
  'rounded-full border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-clay'

function BrandsTab() {
  const brands = useBrands()
  const products = useProducts()
  const deals = useDeals()
  const { loaded } = useDataStatus()
  useLiveNow() // re-render periodically so "Last updated" cells stay current
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<SortKey>('updated')
  const [editing, setEditing] = useState<Brand | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Brand | null>(null)

  const productCount = (slug: string) =>
    products.filter((p) => p.brand === slug).length

  const rows = useMemo(() => {
    const filtered = brands.filter((b) => {
      if (category && b.category !== category) return false
      if (q && !b.name.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'updated':
          return b.updated_at.localeCompare(a.updated_at)
        case 'products':
          return productCount(b.slug) - productCount(a.slug)
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })
  }, [brands, q, category, sort, products])

  const { page, pageSize, pageCount, pagedRows, totalCount, setPage, setPageSize } =
    usePagination(rows)

  const affectedCount = deleting
    ? products.filter((p) => p.brand === deleting.slug).length +
      deals.filter((d) => d.brand === deleting.slug).length
    : 0

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search brands..."
              aria-label="Search brands"
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
            aria-label="Sort brands"
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
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          + Add brand
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Network</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Deals</th>
              <th className="px-4 py-3">Last updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pagedRows.map((b) => (
              <tr key={b.slug}>
                <td className="px-4 py-3">
                  {b.name}
                  {b.featured ? (
                    <span className="ml-2 rounded-full border border-clay/30 bg-clay/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-clay">
                      Featured
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {b.category ? categoryName(b.category) : '—'}
                </td>
                <td className="px-4 py-3">{b.network}</td>
                <td className="px-4 py-3">{productCount(b.slug)}</td>
                <td className="px-4 py-3">
                  {deals.filter((d) => d.brand === b.slug).length}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(b.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Edit ${b.name}`}
                      onClick={() => setEditing(b)}
                      className="rounded-sm border p-1.5 hover:border-clay hover:text-clay"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${b.name}`}
                      onClick={() => setDeleting(b)}
                      className="rounded-sm border p-1.5 hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded
                    ? 'No brands match your search.'
                    : 'Loading brands...'}
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
          title={editing === 'new' ? 'Add brand' : 'Edit brand'}
          onClose={() => setEditing(null)}
          size="xl"
        >
          <BrandForm
            brand={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete brand"
          description={
            affectedCount > 0
              ? `This will permanently remove "${deleting.name}". ${affectedCount} product/deal record${
                  affectedCount === 1 ? '' : 's'
                } currently reference this brand and will be left referencing a removed brand.`
              : `This will permanently remove "${deleting.name}".`
          }
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteBrand(deleting.slug)
              setDeleting(null)
            } catch (err) {
              window.alert(errorMessage(err, 'Failed to delete brand.'))
            }
          }}
        />
      ) : null}
    </>
  )
}
