import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { ProductForm } from '@/components/admin/ProductForm'
import { ImportFeedModal } from '@/components/admin/ImportFeedModal'
import { errorMessage } from '@/components/admin/FormField'
import { toUsd, useCurrency } from '@/lib/currency'
import {
  bestOffer,
  brandName,
  deleteProduct,
  freshnessLabel,
  productDiscount,
  useBrands,
  useDataStatus,
  useProducts,
  useStores,
} from '@/lib/data'
import { categoryName } from '@/types/catalog'
import type { ProductWithOffers } from '@/types/catalog'

export const Route = createFileRoute('/admin/products')({
  component: ProductsTab,
})

function ProductsTab() {
  const products = useProducts()
  const brands = useBrands()
  const stores = useStores()
  const { loaded, error } = useDataStatus()
  const { format } = useCurrency()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<ProductWithOffers | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ProductWithOffers | null>(null)
  const [importing, setImporting] = useState(false)

  const rows = useMemo(
    () =>
      products
        .filter((p) =>
          (p.name + brandName(brands, p.brand))
            .toLowerCase()
            .includes(q.toLowerCase()),
        )
        .slice(0, 30),
    [products, brands, q],
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products..."
          aria-label="Search products"
          className="w-full max-w-sm rounded-sm border bg-card px-3 py-2 text-sm outline-none focus:border-clay"
        />
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
            className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:border-clay"
          >
            Import feed
          </button>
          <button
            type="button"
            disabled
            title="Not available yet"
            className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] opacity-50"
          >
            Bulk update
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load products: {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stores</th>
              <th className="px-4 py-3">Best price</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Freshness</th>
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
                  <td className="px-4 py-3 text-muted-foreground">
                    {freshnessLabel(p)}
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
                  colSpan={8}
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
        <Modal title="Import product feed" onClose={() => setImporting(false)}>
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
