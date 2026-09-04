import { useState } from 'react'
import { FormField, inputClass, selectClass } from './FormField'
import { CATEGORIES } from '@/types/catalog'
import type { Brand, Offer, Product } from '@/types/catalog'
import { createProduct, updateProduct } from '@/lib/data'
import type { ProductInput } from '@/lib/data'

function emptyOffer(): Offer {
  return { store: '', price: 0, originalPrice: undefined }
}

export function ProductForm({
  product,
  brands,
  storeSlugs,
  onDone,
  onCancel,
}: {
  product?: Product
  brands: Brand[]
  storeSlugs: string[]
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(product?.name ?? '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [brand, setBrand] = useState(product?.brand ?? brands[0].slug)
  const [category, setCategory] = useState(
    product?.category ?? Object.keys(CATEGORIES)[0],
  )
  const [offers, setOffers] = useState<Offer[]>(
    product?.offers.length ? product.offers : [emptyOffer()],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateOffer(i: number, patch: Partial<Offer>) {
    setOffers((prev) =>
      prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanOffers = offers.filter((o) => o.store && o.price > 0)
    if (!name.trim() || !slug.trim() || !brand || cleanOffers.length === 0) {
      setError('Name, slug, brand and at least one valid offer are required.')
      return
    }

    const input: ProductInput = {
      name,
      slug,
      brand,
      category,
      offers: cleanOffers,
    }
    setSaving(true)
    try {
      if (product) {
        await updateProduct(product.id, input)
      } else {
        await createProduct(input)
      }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <FormField label="Product name">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
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

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Brand">
          <select
            className={selectClass}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </FormField>

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
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Store offers
        </p>
        <div className="space-y-2">
          {offers.map((offer, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2"
            >
              <select
                className={selectClass}
                value={offer.store}
                onChange={(e) => updateOffer(i, { store: e.target.value })}
              >
                <option value="">Select store</option>
                {storeSlugs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Price"
                className={`${inputClass} w-24`}
                value={offer.price || ''}
                onChange={(e) =>
                  updateOffer(i, { price: Number(e.target.value) })
                }
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Was"
                className={`${inputClass} w-24`}
                value={offer.originalPrice ?? ''}
                onChange={(e) =>
                  updateOffer(i, {
                    originalPrice: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  setOffers((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="rounded-sm border px-2 py-2 text-xs uppercase tracking-[0.1em] hover:border-destructive hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOffers((prev) => [...prev, emptyOffer()])}
          className="mt-2 rounded-sm border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] hover:border-clay"
        >
          + Add offer
        </button>
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
          {saving ? 'Saving...' : product ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  )
}
