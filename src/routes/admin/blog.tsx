import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { Modal } from '@/components/admin/Modal'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { BlogPostForm } from '@/components/admin/BlogPostForm'
import { StatusToggle } from '@/components/admin/StatusToggle'
import { useUndoableDelete } from '@/components/admin/useUndoableDelete'
import { timeAgo, useLiveNow } from '@/lib/time'
import { deleteBlogPost, updateBlogPost, useBlogPosts, useDataStatus } from '@/lib/data'
import type { BlogPost } from '@/types/catalog'

export const Route = createFileRoute('/admin/blog')({
  component: BlogTab,
})

const pillClass =
  'rounded-full border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-clay focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-1'

function BlogTab() {
  const posts = useBlogPosts()
  const { loaded, error } = useDataStatus()
  useLiveNow()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<BlogPost | 'new' | null>(null)
  const [deleting, setDeleting] = useState<BlogPost | null>(null)
  const { isHidden, scheduleDelete } = useUndoableDelete(
    deleteBlogPost,
    'Failed to delete blog post.',
  )

  const rows = useMemo(
    () =>
      posts
        .filter((p) => !isHidden(p.slug))
        .filter((p) =>
          (p.title + p.category).toLowerCase().includes(q.toLowerCase()),
        )
        .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '')),
    [posts, isHidden, q],
  )

  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        The site's <code>/blog</code> editorial content. Only{' '}
        <code>PUBLISHED</code> posts are visible there — drafts stay
        admin-only.
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posts..."
            aria-label="Search blog posts"
            className={`${pillClass} w-48 pl-8`}
          />
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          + Add post
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load blog posts: {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-cream text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last updated</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.slug}>
                <td className="px-4 py-3">
                  <p>{p.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    /blog/{p.slug}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.published_at?.slice(0, 10)}
                </td>
                <td className="px-4 py-3">
                  <StatusToggle
                    active={p.status === 'PUBLISHED'}
                    activeLabel="PUBLISHED"
                    inactiveLabel="DRAFT"
                    onToggle={(next) =>
                      updateBlogPost(p.slug, { status: next ? 'PUBLISHED' : 'DRAFT' })
                    }
                    errorFallback="Failed to update post status."
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
                      className="flex h-11 w-11 items-center justify-center rounded-sm border hover:border-clay hover:text-clay"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${p.title}`}
                      onClick={() => setDeleting(p)}
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
                  colSpan={6}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  {loaded ? 'No posts match your search.' : 'Loading blog posts...'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add blog post' : 'Edit blog post'}
          onClose={() => setEditing(null)}
          size="xl"
        >
          <BlogPostForm
            post={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete blog post"
          description={`This will permanently remove "${deleting.title}".`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            scheduleDelete(deleting.slug, deleting.title)
            setDeleting(null)
          }}
        />
      ) : null}
    </>
  )
}
