import { useState } from 'react'
import { FormField, errorMessage, inputClass } from './FormField'
import { useToast } from './Toast'
import type { Banner, BannerPlacement } from '@/types/catalog'
import { createBanner, updateBanner } from '@/lib/data'

export function BannerForm({
  banner,
  placement,
  onDone,
  onCancel,
}: {
  banner?: Banner
  placement: BannerPlacement
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const [imageUrl, setImageUrl] = useState(banner?.image_url ?? '')
  const [alt, setAlt] = useState(banner?.alt ?? '')
  const [title, setTitle] = useState(banner?.title ?? '')
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? '')
  const [href, setHref] = useState(banner?.href ?? '')
  const [sortOrder, setSortOrder] = useState(banner?.sort_order ?? 0)
  const [visible, setVisible] = useState(banner?.visible ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!imageUrl.trim()) {
      setError('Image URL is required.')
      return
    }

    const input = {
      placement,
      image_url: imageUrl.trim(),
      alt: alt.trim(),
      title: placement === 'promo' ? title.trim() || null : null,
      subtitle: placement === 'promo' ? subtitle.trim() || null : null,
      href: href.trim() || null,
      sort_order: sortOrder,
      visible,
    }

    setSaving(true)
    try {
      if (banner) {
        await updateBanner(banner.id, input)
      } else {
        await createBanner(input)
      }
      toast.show(banner ? 'Banner updated' : 'Banner created')
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save banner.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <FormField label="Image URL">
        <input
          className={inputClass}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          required
        />
      </FormField>

      {imageUrl.trim() ? (
        <div className="overflow-hidden rounded-sm border bg-cream">
          <img
            src={imageUrl}
            alt=""
            className="h-32 w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      ) : null}

      <FormField label="Alt text (for screen readers — leave blank if purely decorative)">
        <input
          className={inputClass}
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
        />
      </FormField>

      {placement === 'promo' ? (
        <>
          <FormField label="Title">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <FormField label="Subtitle">
            <input
              className={inputClass}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </FormField>
        </>
      ) : null}

      <FormField label="Link (optional — where clicking the banner goes, e.g. /deals or /shop?view=sale)">
        <input
          className={inputClass}
          value={href}
          onChange={(e) => setHref(e.target.value)}
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
          Visible on the site
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
          {saving ? 'Saving...' : banner ? 'Save changes' : 'Add banner'}
        </button>
      </div>
    </form>
  )
}
