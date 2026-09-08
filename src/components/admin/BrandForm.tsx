import { useState } from 'react'
import { FormField, inputClass, selectClass } from './FormField'
import { CATEGORIES } from '@/types/catalog'
import type { Brand } from '@/types/catalog'
import { createBrand, slugify, updateBrand } from '@/lib/data'

export function BrandForm({
  brand,
  networks,
  onDone,
  onCancel,
}: {
  brand?: Brand
  networks: string[]
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(brand?.name ?? '')
  const [slug, setSlug] = useState(brand?.slug ?? '')
  const [description, setDescription] = useState(brand?.description ?? '')
  const [category, setCategory] = useState(
    brand?.category ?? Object.keys(CATEGORIES)[0],
  )
  const [network, setNetwork] = useState(
    brand?.network ?? (networks.length ? networks[0] : ''),
  )
  const [featured, setFeatured] = useState(brand?.featured ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !slug.trim() || !network.trim()) {
      setError('Name, slug and network are required.')
      return
    }

    const fields = {
      name,
      description: description.trim() || null,
      category: category || null,
      network,
      featured,
    }

    setSaving(true)
    try {
      if (brand) {
        await updateBrand(brand.slug, fields)
      } else {
        await createBrand({ slug, ...fields })
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brand.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <FormField label="Brand name">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (!brand) setSlug(slugify(e.target.value))
          }}
          required
        />
      </FormField>

      <FormField label="Slug">
        <input
          className={inputClass}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={!!brand}
          required
        />
      </FormField>

      <FormField label="Description (optional)">
        <textarea
          className={`${inputClass} min-h-16 resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Category">
          <select
            className={selectClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.entries(CATEGORIES).map(([categorySlug, categoryName]) => (
              <option key={categorySlug} value={categorySlug}>
                {categoryName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Network">
          <input
            className={inputClass}
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            required
          />
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={featured}
          onChange={(e) => setFeatured(e.target.checked)}
        />
        Featured
      </label>

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
          {saving ? 'Saving...' : brand ? 'Save changes' : 'Add brand'}
        </button>
      </div>
    </form>
  )
}
