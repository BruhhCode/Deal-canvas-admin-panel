import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { SaleEventForm } from '@/components/admin/SaleEventForm'
import { errorMessage } from '@/components/admin/FormField'
import {
  deleteSaleEvent,
  storeName,
  useDataStatus,
  useSaleEvents,
  useStores,
} from '@/lib/data'
import type { SaleEvent } from '@/types/catalog'

export const Route = createFileRoute('/admin/sales')({
  component: SalesTab,
})

function SalesTab() {
  const saleEvents = useSaleEvents()
  const stores = useStores()
  const { loaded } = useDataStatus()
  const [editing, setEditing] = useState<SaleEvent | 'new' | null>(null)
  const [deleting, setDeleting] = useState<SaleEvent | null>(null)

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setEditing('new')}
          disabled={stores.length === 0}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          + Add sale
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {saleEvents.map((e) => (
          <div key={e.id} className="rounded-lg border bg-card p-5">
            <p className="editorial-eyebrow">
              {e.time_window.replace('-', ' ')}
            </p>
            <h3 className="mt-2 text-lg">{e.title}</h3>
            <p className="mt-1 text-sm text-clay">{e.discount}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {e.code ? `Code ${e.code} · ` : ''}store{' '}
              {storeName(stores, e.store)}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(e)}
                className="rounded-sm border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] hover:border-clay"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleting(e)}
                className="rounded-sm border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] hover:border-destructive hover:text-destructive"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {saleEvents.length === 0 ? (
          <p className="col-span-full py-6 text-center text-muted-foreground">
            {loaded ? 'No sale events yet.' : 'Loading sale events...'}
          </p>
        ) : null}
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add sale' : 'Edit sale'}
          onClose={() => setEditing(null)}
        >
          <SaleEventForm
            event={editing === 'new' ? undefined : editing}
            stores={stores}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete sale"
          description={`This will permanently remove "${deleting.title}".`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteSaleEvent(deleting.id)
              setDeleting(null)
            } catch (err) {
              window.alert(errorMessage(err, 'Failed to delete sale.'))
            }
          }}
        />
      ) : null}
    </>
  )
}
