import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { BannerForm } from '@/components/admin/BannerForm'
import { StatusToggle } from '@/components/admin/StatusToggle'
import { useUndoableDelete } from '@/components/admin/useUndoableDelete'
import { timeAgo, useLiveNow } from '@/lib/time'
import { deleteBanner, updateBanner, useBanners, useDataStatus } from '@/lib/data'
import type { Banner, BannerPlacement } from '@/types/catalog'

export const Route = createFileRoute('/admin/banners')({
  component: BannersTab,
})

function BannerSection({
  placement,
  title,
  description,
  banners,
  loaded,
}: {
  placement: BannerPlacement
  title: string
  description: string
  banners: Banner[]
  loaded: boolean
}) {
  const [editing, setEditing] = useState<Banner | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Banner | null>(null)
  const { isHidden, scheduleDelete } = useUndoableDelete(
    deleteBanner,
    'Failed to delete banner.',
  )

  const rows = useMemo(
    () =>
      banners
        .filter((b) => !isHidden(b.id))
        .sort((a, b) => a.sort_order - b.sort_order),
    [banners, isHidden],
  )

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          + Add banner
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Preview</th>
              {placement === 'promo' ? <th className="px-4 py-3">Title</th> : null}
              <th className="px-4 py-3">Link</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3">
                  <img
                    src={b.image_url}
                    alt=""
                    className="h-12 w-20 rounded-sm border object-cover"
                  />
                </td>
                {placement === 'promo' ? (
                  <td className="px-4 py-3">
                    <p>{b.title || '—'}</p>
                    <p className="text-xs text-muted-foreground">{b.subtitle}</p>
                  </td>
                ) : null}
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {b.href || '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{b.sort_order}</td>
                <td className="px-4 py-3">
                  <StatusToggle
                    active={b.visible}
                    activeLabel="VISIBLE"
                    inactiveLabel="HIDDEN"
                    onToggle={(next) => updateBanner(b.id, { visible: next })}
                    errorFallback="Failed to update banner visibility."
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(b.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Edit banner ${b.id}`}
                      onClick={() => setEditing(b)}
                      className="flex h-11 w-11 items-center justify-center rounded-sm border hover:border-clay hover:text-clay"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete banner ${b.id}`}
                      onClick={() => setDeleting(b)}
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
                  colSpan={placement === 'promo' ? 7 : 6}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded ? 'No banners yet.' : 'Loading banners...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add banner' : 'Edit banner'}
          onClose={() => setEditing(null)}
          size="xl"
        >
          <BannerForm
            banner={editing === 'new' ? undefined : editing}
            placement={placement}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete banner"
          description="This will permanently remove this banner from the site."
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            scheduleDelete(deleting.id, 'Banner')
            setDeleting(null)
          }}
        />
      ) : null}
    </section>
  )
}

function BannersTab() {
  const banners = useBanners()
  const { loaded, error } = useDataStatus()
  useLiveNow()

  const heroBanners = useMemo(
    () => banners.filter((b) => b.placement === 'hero'),
    [banners],
  )
  const promoBanners = useMemo(
    () => banners.filter((b) => b.placement === 'promo'),
    [banners],
  )

  return (
    <>
      {error ? (
        <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load banners: {error}
        </p>
      ) : null}

      <BannerSection
        placement="hero"
        title="Hero slides"
        description="The full-bleed rotating background images behind the homepage's search box. Purely visual — no title/subtitle text renders on these."
        banners={heroBanners}
        loaded={loaded}
      />

      <BannerSection
        placement="promo"
        title="Middle banners"
        description="The 3-across banner row further down the homepage, each with its own title, subtitle and link. The site only ever shows the first 3 by Order."
        banners={promoBanners}
        loaded={loaded}
      />
    </>
  )
}
