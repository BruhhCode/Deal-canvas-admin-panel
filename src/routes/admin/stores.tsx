import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { StoreForm } from '@/components/admin/StoreForm'
import { errorMessage } from '@/components/admin/FormField'
import {
  deleteStore,
  productsByStore,
  useDataStatus,
  useProducts,
  useStores,
} from '@/lib/data'
import type { Store } from '@/types/catalog'

export const Route = createFileRoute('/admin/stores')({
  component: StoresTab,
})

function StoresTab() {
  const stores = useStores()
  const products = useProducts()
  const { loaded } = useDataStatus()
  const [editing, setEditing] = useState<Store | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Store | null>(null)

  const affectedProductCount = deleting
    ? productsByStore(products, deleting.slug).length
    : 0

  return (
    <>
      <div className="mb-4 flex justify-end">
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
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stores.map((st) => (
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
                <td className="px-4 py-3 text-clay">Active</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Edit ${st.name}`}
                      onClick={() => setEditing(st)}
                      className="rounded-sm border p-1.5 hover:border-clay hover:text-clay"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${st.name}`}
                      onClick={() => setDeleting(st)}
                      className="rounded-sm border p-1.5 hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {stores.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded ? 'No stores yet.' : 'Loading stores...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add store' : 'Edit store'}
          onClose={() => setEditing(null)}
        >
          <StoreForm
            store={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
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
          onConfirm={async () => {
            try {
              await deleteStore(deleting.slug)
              setDeleting(null)
            } catch (err) {
              window.alert(errorMessage(err, 'Failed to delete store.'))
            }
          }}
        />
      ) : null}
    </>
  )
}
