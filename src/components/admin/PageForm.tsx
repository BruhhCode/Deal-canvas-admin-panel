import { useState } from 'react'
import { FormField, errorMessage, inputClass, selectClass } from './FormField'
import type { Page, PageStatus } from '@/types/catalog'
import { createPage, slugify, updatePage } from '@/lib/data'

const STATUSES: PageStatus[] = ['DRAFT', 'PUBLISHED']

export function PageForm({
  page,
  onDone,
  onCancel,
}: {
  page?: Page
  onDone: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(page?.title ?? '')
  const [slug, setSlug] = useState(page?.slug ?? '')
  const [content, setContent] = useState(page?.content ?? '')
  const [metaDescription, setMetaDescription] = useState(
    page?.meta_description ?? '',
  )
  const [status, setStatus] = useState<PageStatus>(page?.status ?? 'DRAFT')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !slug.trim() || !content.trim()) {
      setError('Title, slug and content are required.')
      return
    }

    const input = {
      slug,
      title,
      content,
      meta_description: metaDescription.trim() || null,
      status,
    }

    setSaving(true)
    try {
      if (page) {
        await updatePage(page.slug, input)
      } else {
        await createPage(input)
      }
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save page.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <FormField label="Title">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (!page) setSlug(slugify(e.target.value))
          }}
          required
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Slug (page will be at /pages/<slug>)">
          <input
            className={inputClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Status">
          <select
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as PageStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Meta description (optional, for search engines)">
        <input
          className={inputClass}
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
        />
      </FormField>

      <FormField label="Content (separate paragraphs with a blank line)">
        <textarea
          className={`${inputClass} min-h-48 resize-y`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </FormField>

      <div className="flex justify-end gap-2 border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:border-clay"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-60"
        >
          {saving ? 'Saving...' : page ? 'Save changes' : 'Add page'}
        </button>
      </div>
    </form>
  )
}
