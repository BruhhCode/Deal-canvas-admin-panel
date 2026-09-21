import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { FaqForm } from '@/components/admin/FaqForm'
import { errorMessage } from '@/components/admin/FormField'
import { timeAgo, useLiveNow } from '@/lib/time'
import { deleteFaq, useDataStatus, useFaqs } from '@/lib/data'
import type { Faq } from '@/types/catalog'

export const Route = createFileRoute('/admin/faq')({
  component: FaqTab,
})

const pillClass =
  'rounded-full border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-clay'

function FaqTab() {
  const faqs = useFaqs()
  const { loaded, error } = useDataStatus()
  useLiveNow()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Faq | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Faq | null>(null)

  const sections = useMemo(
    () => Array.from(new Set(faqs.map((f) => f.section))).sort(),
    [faqs],
  )

  const rows = useMemo(
    () =>
      faqs
        .filter((f) =>
          (f.section + f.question).toLowerCase().includes(q.toLowerCase()),
        )
        .sort((a, b) =>
          a.section === b.section
            ? a.sort_order - b.sort_order
            : a.section.localeCompare(b.section),
        ),
    [faqs, q],
  )

  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Every question shown on the public site's FAQ page, grouped by
        section. Add a new section name directly on the "Add FAQ" form — it
        appears automatically once a question uses it.
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search FAQs..."
            aria-label="Search FAQs"
            className={`${pillClass} w-48 pl-8`}
          />
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          + Add FAQ
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load FAQs: {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Last updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((f) => (
              <tr key={f.id}>
                <td className="px-4 py-3 text-muted-foreground">
                  {f.section}
                </td>
                <td className="px-4 py-3">{f.question}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(f.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Edit ${f.question}`}
                      onClick={() => setEditing(f)}
                      className="rounded-sm border p-1.5 hover:border-clay hover:text-clay"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${f.question}`}
                      onClick={() => setDeleting(f)}
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
                  colSpan={4}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded ? 'No FAQs match your search.' : 'Loading FAQs...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add FAQ' : 'Edit FAQ'}
          onClose={() => setEditing(null)}
          size="xl"
        >
          <FaqForm
            faq={editing === 'new' ? undefined : editing}
            sections={sections}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete FAQ"
          description={`This will permanently remove "${deleting.question}".`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteFaq(deleting.id)
              setDeleting(null)
            } catch (err) {
              window.alert(errorMessage(err, 'Failed to delete FAQ.'))
            }
          }}
        />
      ) : null}
    </>
  )
}
