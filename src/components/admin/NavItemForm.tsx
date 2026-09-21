import { useState } from 'react'
import { FormField, errorMessage, inputClass } from './FormField'
import type { NavItem } from '@/types/catalog'
import { createNavItem, slugify, updateNavItem } from '@/lib/data'

export function NavItemForm({
  item,
  onDone,
  onCancel,
}: {
  item?: NavItem
  onDone: () => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(item?.label ?? '')
  const [slug, setSlug] = useState(item?.slug ?? '')
  const [href, setHref] = useState(item?.href ?? '')
  const [sortOrder, setSortOrder] = useState(item?.sort_order ?? 0)
  const [visible, setVisible] = useState(item?.visible ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!label.trim() || !slug.trim() || !href.trim()) {
      setError('Label, slug and link are required.')
      return
    }

    const input = { slug, label, href, sort_order: sortOrder, visible }

    setSaving(true)
    try {
      if (item) {
        await updateNavItem(item.slug, input)
      } else {
        await createNavItem(input)
      }
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save nav item.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <FormField label="Label (shown in the header)">
        <input
          className={inputClass}
          value={label}
          onChange={(e) => {
            setLabel(e.target.value)
            if (!item) setSlug(slugify(e.target.value))
          }}
          required
        />
      </FormField>

      <FormField label="Slug">
        <input
          className={inputClass}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
      </FormField>

      <FormField label="Link (e.g. /shop, /deals, /pages/about-us, or a full URL)">
        <input
          className={inputClass}
          value={href}
          onChange={(e) => setHref(e.target.value)}
          required
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Order (lower shows first)">
          <input
            type="number"
            className={inputClass}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </FormField>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          Visible in the site header
        </label>
      </div>

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
          {saving ? 'Saving...' : item ? 'Save changes' : 'Add nav item'}
        </button>
      </div>
    </form>
  )
}
