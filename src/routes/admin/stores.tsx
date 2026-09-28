import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { Pagination, usePagination } from '@/components/admin/Pagination'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { StoreForm } from '@/components/admin/StoreForm'
import { StatusToggle } from '@/components/admin/StatusToggle'
import { useToast } from '@/components/admin/Toast'
import { useUndoableDelete } from '@/components/admin/useUndoableDelete'
import { errorMessage } from '@/components/admin/FormField'
import { timeAgo, useLiveNow } from '@/lib/time'
import {
  deleteStore,
  productsByStore,
  setStoreAvailability,
  storeStatus,
  useDataStatus,
  useProducts,
  useStores,
} from '@/lib/data'
import { NETWORKS } from '@/types/catalog'
import type { Store } from '@/types/catalog'

export const Route = createFileRoute('/admin/stores')({
  component: StoresTab,
})

// Compact, pill-shaped filter controls — same pattern as admin/products.tsx.
const pillClass =
  'rounded-full border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-clay focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-1'

function StoresTab() {
  const stores = useStores()
  const products = useProducts()
  const { loaded } = useDataStatus()
  useLiveNow() // re-render periodically so "Last updated" cells stay current
  const [network, setNetwork] = useState('')
  const [editing, setEditing] = useState<Store | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Store | null>(null)
  const [togglingStore, setTogglingStore] = useState<{
    store: Store
    next: boolean
  } | null>(null)
  const toast = useToast()
  const { isHidden, scheduleDelete } = useUndoableDelete(
    deleteStore,
    'Failed to delete store.',
  )

  const rows = useMemo(
    () =>
      stores
        .filter((s) => !isHidden(s.slug))
        .filter((s) => !network || s.network === network)
        .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '')),
    [stores, isHidden, network],
  )

  const { page, pageSize, pageCount, pagedRows, totalCount, setPage, setPageSize } =
    usePagination(rows)

  const affectedProductCount = deleting
    ? productsByStore(products, deleting.slug).length
    : 0

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select
          aria-label="Filter by network"
          className={pillClass}
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
        >
          <option value="">All networks</option>
          {NETWORKS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          + Add store
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Network</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Store ID</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pagedRows.map((st) => (
              <tr key={st.slug}>
                <td className="px-4 py-3">
                  {st.name}
                  {st.featured ? (
                    <span className="ml-2 rounded-full border border-clay/30 bg-clay/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-clay">
                      Featured
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{st.network}</td>
                <td className="px-4 py-3">{st.campaign}</td>
                <td className="px-4 py-3">{st.store_id}</td>
                <td className="px-4 py-3">
                  {productsByStore(products, st.slug).length}
                </td>
                <td className="px-4 py-3">
                  <StatusToggle
                    active={storeStatus(st, products) !== 'OUT OF STOCK'}
                    activeLabel={
                      storeStatus(st, products) === 'LOW STOCK' ? 'LOW STOCK' : 'ACTIVE'
                    }
                    inactiveLabel="OUT OF STOCK"
                    onToggle={async (next) => {
                      setTogglingStore({ store: st, next })
                    }}
                    errorFallback="Failed to update store availability."
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(st.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Edit ${st.name}`}
                      onClick={() => setEditing(st)}
                      className="flex h-11 w-11 items-center justify-center rounded-sm border hover:border-clay hover:text-clay"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${st.name}`}
                      onClick={() => setDeleting(st)}
                      className="flex h-11 w-11 items-center justify-center rounded-sm border hover:border-destructive hover:text-destructive"
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
                  colSpan={8}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded
                    ? stores.length === 0
                      ? 'No stores yet.'
                      : 'No stores match your filters.'
                    : 'Loading stores...'}
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
          title={editing === 'new' ? 'Add store' : 'Edit store'}
          onClose={() => setEditing(null)}
          size="xl"
        >
          <StoreForm
            store={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {togglingStore ? (
        <ConfirmDialog
          title={togglingStore.next ? 'Mark store active' : 'Mark store out of stock'}
          description={`This will set every offer at "${togglingStore.store.name}" (${
            productsByStore(products, togglingStore.store.slug).length
          } product${
            productsByStore(products, togglingStore.store.slug).length === 1 ? '' : 's'
          }) to ${togglingStore.next ? 'in stock' : 'out of stock'}.`}
          onCancel={() => setTogglingStore(null)}
          onConfirm={async () => {
            try {
              await setStoreAvailability(
                togglingStore.store.slug,
                togglingStore.next ? 'IN STOCK' : 'OUT OF STOCK',
              )
              setTogglingStore(null)
            } catch (err) {
              toast.show(errorMessage(err, 'Failed to update store availability.'), {
                variant: 'error',
              })
            }
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete store"
          description={
            affectedProductCount > 0
              ? `This will permanently remove "${deleting.name}". ${affectedProductCount} product offer${
                  affectedProductCount === 1 ? '' : 's'
                } currently point at this store and will be left referencing a removed store.`
              : `This will permanently remove "${deleting.name}" from the catalogue.`
          }
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            scheduleDelete(deleting.slug, deleting.name)
            setDeleting(null)
          }}
        />
      ) : null}
    </>
  )
}
