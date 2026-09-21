import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Eye, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { errorMessage, runAction, selectClass } from '@/components/admin/FormField'
import { timeAgo, useLiveNow } from '@/lib/time'
import {
  deleteContactMessage,
  setContactMessageStatus,
  useContactMessages,
  useDataStatus,
} from '@/lib/data'
import type { ContactMessage, ContactMessageStatus } from '@/types/catalog'

export const Route = createFileRoute('/admin/contact')({
  component: ContactTab,
})

const STATUSES: ContactMessageStatus[] = ['NEW', 'READ', 'RESOLVED']

function ContactTab() {
  const messages = useContactMessages()
  const { loaded, error } = useDataStatus()
  useLiveNow()
  const [statusFilter, setStatusFilter] = useState<ContactMessageStatus | ''>('')
  const [viewing, setViewing] = useState<ContactMessage | null>(null)
  const [deleting, setDeleting] = useState<ContactMessage | null>(null)

  const rows = useMemo(
    () =>
      messages.filter((m) => !statusFilter || m.status === statusFilter),
    [messages, statusFilter],
  )

  function changeStatus(m: ContactMessage, status: ContactMessageStatus) {
    return runAction(
      () => setContactMessageStatus(m.id, status),
      'Failed to update message status.',
    )
  }

  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Messages submitted through the public site's contact form. New
        messages start as <code>NEW</code> — mark them <code>READ</code> or{' '}
        <code>RESOLVED</code> as you work through them.
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select
          aria-label="Filter by status"
          className="rounded-full border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-clay"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ContactMessageStatus | '')
          }
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load contact messages: {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <p>{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </td>
                <td className="px-4 py-3">{m.subject || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    className={`${selectClass} w-auto py-1`}
                    value={m.status}
                    onChange={(e) =>
                      changeStatus(m, e.target.value as ContactMessageStatus)
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(m.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`View message from ${m.name}`}
                      onClick={() => setViewing(m)}
                      className="rounded-sm border p-1.5 hover:border-clay hover:text-clay"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete message from ${m.name}`}
                      onClick={() => setDeleting(m)}
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
                  {loaded ? 'No messages match this filter.' : 'Loading messages...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {viewing ? (
        <Modal title="Message" onClose={() => setViewing(null)} size="xl">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{viewing.name}</p>
                <p className="text-muted-foreground">{viewing.email}</p>
              </div>
              <StatusBadge status={viewing.status} />
            </div>
            {viewing.subject ? (
              <p>
                <span className="editorial-eyebrow">Subject</span>
                <br />
                {viewing.subject}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap rounded-sm border bg-cream p-4">
              {viewing.message}
            </p>
            <p className="text-xs text-muted-foreground">
              Received {timeAgo(viewing.created_at)}
            </p>
          </div>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete message"
          description={`This will permanently remove the message from "${deleting.name}".`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteContactMessage(deleting.id)
              setDeleting(null)
            } catch (err) {
              window.alert(errorMessage(err, 'Failed to delete message.'))
            }
          }}
        />
      ) : null}
    </>
  )
}
