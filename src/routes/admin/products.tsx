import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { ProductForm } from '@/components/admin/ProductForm'
import { ImportFeedModal } from '@/components/admin/ImportFeedModal'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { errorMessage } from '@/components/admin/FormField'
import { toUsd, useCurrency } from '@/lib/currency'
import { timeAgo, useLiveNow } from '@/lib/time'
import {
  bestOffer,
  brandName,
  deleteProduct,
  productDiscount,
  productLastUpdated,
  productStatus,
  useBrands,
  useDataStatus,
  useProducts,
  useStores,
} from '@/lib/data'
import { CATEGORIES, categoryName } from '@/types/catalog'
import type { ProductWithOffers } from '@/types/catalog'

export const Route = createFileRoute('/admin/products')({
  component: ProductsTab,
})

const SORTS = {
  name: 'Name (A–Z)',
  'price-asc': 'Price (low to high)',
  'price-desc': 'Price (high to low)',
  updated: 'Recently updated',
} as const
type SortKey = keyof typeof SORTS

// Compact, pill-shaped filter controls — matches the search bar's height so
// the whole filter row reads as one connected group instead of the old
// full-width form-style dropdowns, which towered over the search input.
const pillClass =
  'rounded-full border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-clay'

function ProductsTab() {
  const products = useProducts()
  const brands = useBrands()
  const stores = useStores()
  const { loaded, error } = useDataStatus()
  const { format } = useCurrency()
  useLiveNow() // re-render periodically so "Last updated" cells stay current
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
  const [editing, setEditing] = useState<ProductWithOffers | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ProductWithOffers | null>(null)
  const [importing, setImporting] = useState(false)

  const rows = useMemo(() => {
    const filtered = products.filter((p) => {
      if (category && p.category !== category) return false
      if (brand && p.brand !== brand) return false
      if (
        q &&
        !(p.name + brandName(brands, p.brand)).toLowerCase().includes(q.toLowerCase())
      )
        return false
      return true
    })

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return (bestOffer(a)?.price ?? Infinity) - (bestOffer(b)?.price ?? Infinity)
        case 'price-desc':
          return (bestOffer(b)?.price ?? -Infinity) - (bestOffer(a)?.price ?? -Infinity)
        case 'updated':
          return (productLastUpdated(b) ?? '').localeCompare(productLastUpdated(a) ?? '')
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    return sorted.slice(0, 30)
  }, [products, brands, q, category, brand, sort])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
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
            aria-label="Sort products"
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing('new')}
            disabled={brands.length === 0}
            className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:border-clay disabled:pointer-events-none disabled:opacity-50"
          >
            Add product
          </button>
          <button
            type="button"
            onClick={() => setImporting(true)}
            title="Also updates existing products — re-import a CSV containing a product you already added and it's updated in place, not duplicated"
            className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:border-clay"
          >
            Import / bulk update
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load products: {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stores</th>
              <th className="px-4 py-3">Best price</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => {
              const best = bestOffer(p)
              return (
                <tr key={p.slug}>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">{brandName(brands, p.brand)}</td>
                  <td className="px-4 py-3">{categoryName(p.category)}</td>
                  <td className="px-4 py-3">{p.offers.length}</td>
                  <td className="px-4 py-3">
                    {best ? format(toUsd(best.price)) : '—'}
                  </td>
                  <td className="px-4 py-3">{productDiscount(p)}%</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={productStatus(p)} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {timeAgo(productLastUpdated(p))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEditing(p)}
                        className="rounded-sm border p-1.5 hover:border-clay hover:text-clay"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => setDeleting(p)}
                        className="rounded-sm border p-1.5 hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded
                    ? 'No products match your search.'
                    : 'Loading products...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add product' : 'Edit product'}
          onClose={() => setEditing(null)}
          size="xl"
        >
          <ProductForm
            product={editing === 'new' ? undefined : editing}
            brands={brands}
            storeSlugs={stores.map((s) => s.slug)}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {importing ? (
        <Modal title="Import product feed" onClose={() => setImporting(false)} size="xl">
          <ImportFeedModal
            brands={brands}
            stores={stores}
            onDone={() => setImporting(false)}
            onCancel={() => setImporting(false)}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete product"
          description={`This will permanently remove "${deleting.name}" and its offers.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteProduct(deleting.slug)
              setDeleting(null)
            } catch (err) {
              window.alert(errorMessage(err, 'Failed to delete product.'))
            }
          }}
        />
      ) : null}
    </>
  )
}
