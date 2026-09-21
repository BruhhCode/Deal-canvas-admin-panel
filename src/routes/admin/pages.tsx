import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { PageForm } from '@/components/admin/PageForm'
import { StatusToggle } from '@/components/admin/StatusToggle'
import { errorMessage } from '@/components/admin/FormField'
import { timeAgo, useLiveNow } from '@/lib/time'
import { deletePage, updatePage, useDataStatus, usePages } from '@/lib/data'
import type { Page } from '@/types/catalog'

export const Route = createFileRoute('/admin/pages')({
  component: PagesTab,
})

const pillClass =
  'rounded-full border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-clay'

function PagesTab() {
  const pages = usePages()
  const { loaded, error } = useDataStatus()
  useLiveNow()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Page | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Page | null>(null)

  const rows = useMemo(
    () =>
      pages
        .filter((p) => (p.title + p.slug).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [pages, q],
  )

  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Simple CMS pages, rendered at <code>/pages/&lt;slug&gt;</code> on the
        public site. Only <code>PUBLISHED</code> pages are visible there —
        drafts stay admin-only.
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages..."
            aria-label="Search pages"
            className={`${pillClass} w-48 pl-8`}
          />
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          + Add page
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load pages: {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.slug}>
                <td className="px-4 py-3">{p.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  /pages/{p.slug}
                </td>
                <td className="px-4 py-3">
                  <StatusToggle
                    active={p.status === 'PUBLISHED'}
                    activeLabel="PUBLISHED"
                    inactiveLabel="DRAFT"
                    onToggle={(next) =>
                      updatePage(p.slug, { status: next ? 'PUBLISHED' : 'DRAFT' })
                    }
                    errorFallback="Failed to update page status."
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(p.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Edit ${p.title}`}
                      onClick={() => setEditing(p)}
                      className="rounded-sm border p-1.5 hover:border-clay hover:text-clay"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${p.title}`}
                      onClick={() => setDeleting(p)}
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
                  colSpan={5}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded ? 'No pages match your search.' : 'Loading pages...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add page' : 'Edit page'}
          onClose={() => setEditing(null)}
          size="xl"
        >
          <PageForm
            page={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete page"
          description={`This will permanently remove "${deleting.title}".`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deletePage(deleting.slug)
              setDeleting(null)
            } catch (err) {
              window.alert(errorMessage(err, 'Failed to delete page.'))
            }
          }}
        />
      ) : null}
    </>
  )
}
