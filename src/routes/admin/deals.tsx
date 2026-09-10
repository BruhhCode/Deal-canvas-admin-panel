import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { DealBadge } from '@/components/DealBadge'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { DealForm } from '@/components/admin/DealForm'
import { errorMessage, runAction } from '@/components/admin/FormField'
import { toUsd, useCurrency } from '@/lib/currency'
import {
  brandName,
  deleteDeal,
  discountPct,
  setDealStatus,
  useBrands,
  useDataStatus,
  useDeals,
} from '@/lib/data'
import type { Deal } from '@/types/catalog'

export const Route = createFileRoute('/admin/deals')({
  component: DealsTab,
})

function DealsTab() {
  const deals = useDeals()
  const brands = useBrands()
  const { loaded } = useDataStatus()
  const { format } = useCurrency()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Deal | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Deal | null>(null)

  const rows = useMemo(
    () =>
      deals.filter((d) =>
        (d.title + brandName(brands, d.brand))
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [deals, brands, q],
  )

  function togglePause(d: Deal) {
    return runAction(
      () => setDealStatus(d.id, d.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED'),
      'Failed to update deal status.',
    )
  }

  function expire(d: Deal) {
    return runAction(
      () => setDealStatus(d.id, 'EXPIRED'),
      'Failed to expire deal.',
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search deals..."
          aria-label="Search deals"
          className="w-full max-w-sm rounded-sm border bg-card px-3 py-2 text-sm outline-none focus:border-clay"
        />
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
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
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
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.1em]">
                    <button
                      type="button"
                      onClick={() => setEditing(d)}
                      className="text-muted-foreground hover:text-clay"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={d.status === 'EXPIRED'}
                      onClick={() => togglePause(d)}
                      className="text-muted-foreground hover:text-clay disabled:pointer-events-none disabled:opacity-40"
                    >
                      {d.status === 'PAUSED' ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      disabled={d.status === 'EXPIRED'}
                      onClick={() => expire(d)}
                      className="text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
                    >
                      Expire
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(d)}
                      className="text-muted-foreground hover:text-destructive"
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
                  colSpan={9}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded ? 'No deals match your search.' : 'Loading deals...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add deal' : 'Edit deal'}
          onClose={() => setEditing(null)}
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
