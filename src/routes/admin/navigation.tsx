import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { NavItemForm } from '@/components/admin/NavItemForm'
import { StatusToggle } from '@/components/admin/StatusToggle'
import { errorMessage } from '@/components/admin/FormField'
import { timeAgo, useLiveNow } from '@/lib/time'
import { deleteNavItem, updateNavItem, useDataStatus, useNavItems } from '@/lib/data'
import type { NavItem } from '@/types/catalog'

export const Route = createFileRoute('/admin/navigation')({
  component: NavigationTab,
})

function NavigationTab() {
  const navItems = useNavItems()
  const { loaded, error } = useDataStatus()
  useLiveNow()
  const [editing, setEditing] = useState<NavItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<NavItem | null>(null)

  const rows = [...navItems].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Controls the links shown in the public site's header. Changes appear
        the next time a shopper loads a page — there's no realtime push for
        navigation. Uncheck "Visible" to hide a link without deleting it.
      </p>

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          + Add nav item
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load navigation: {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Link</th>
              <th className="px-4 py-3">Visible</th>
              <th className="px-4 py-3">Last updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((n) => (
              <tr key={n.slug}>
                <td className="px-4 py-3 text-muted-foreground">
                  {n.sort_order}
                </td>
                <td className="px-4 py-3">{n.label}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {n.href}
                </td>
                <td className="px-4 py-3">
                  <StatusToggle
                    active={n.visible}
                    activeLabel="VISIBLE"
                    inactiveLabel="HIDDEN"
                    onToggle={(next) => updateNavItem(n.slug, { visible: next })}
                    errorFallback="Failed to update visibility."
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(n.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label={`Edit ${n.label}`}
                      onClick={() => setEditing(n)}
                      className="rounded-sm border p-1.5 hover:border-clay hover:text-clay"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${n.label}`}
                      onClick={() => setDeleting(n)}
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
                  colSpan={6}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded ? 'No nav items yet.' : 'Loading navigation...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add nav item' : 'Edit nav item'}
          onClose={() => setEditing(null)}
          size="xl"
        >
          <NavItemForm
            item={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete nav item"
          description={`This will permanently remove "${deleting.label}" from the site header.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteNavItem(deleting.slug)
              setDeleting(null)
            } catch (err) {
              window.alert(errorMessage(err, 'Failed to delete nav item.'))
            }
          }}
        />
      ) : null}
    </>
  )
}
