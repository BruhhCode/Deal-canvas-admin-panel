import { useState } from 'react'
import { FormField, errorMessage, inputClass, selectClass } from './FormField'
import { CATEGORIES } from '@/types/catalog'
import type { Brand, ProductWithOffers } from '@/types/catalog'
import { createProduct, slugify, updateProduct } from '@/lib/data'
import type { OfferInput } from '@/lib/data'
import { fromUsd, toUsd } from '@/lib/currency'

const AVAILABILITY = ['IN STOCK', 'LOW STOCK', 'OUT OF STOCK']

function emptyOffer(): OfferInput {
  return {
    store: '',
    price: 0,
    original_price: 0,
    currency: 'USD',
    availability: 'IN STOCK',
    product_url: '',
    coupon_code: null,
    shipping: 'Standard',
    updated_hours_ago: 0,
    sponsored: false,
  }
}

const listToText = (list: string[] | null | undefined) =>
  (list ?? []).join(', ')
const textToList = (text: string) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

// Image URLs can't safely go through the comma-separated helpers above: Nike/
// Adidas CDN URLs embed their own transform params with commas in the URL
// itself (e.g. ".../f_auto,c_scale,w_1.0,.../shoe.png"), so splitting on every
// comma shreds a single URL into several broken fragments. URLs essentially
// never contain newlines, so one-per-line is used for this field instead.
const listToLines = (list: string[] | null | undefined) =>
  (list ?? []).join('\n')
const linesToList = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

export function ProductForm({
  product,
  brands,
  storeSlugs,
  onDone,
  onCancel,
}: {
  product?: ProductWithOffers
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
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? '')
  const [gender, setGender] = useState(product?.gender ?? 'unisex')
  const [description, setDescription] = useState(product?.description ?? '')
  const [image, setImage] = useState(product?.image ?? '')
  const [images, setImages] = useState(listToLines(product?.images))
  const [colors, setColors] = useState(listToText(product?.colors))
  const [sizes, setSizes] = useState(listToText(product?.sizes))
  const [tags, setTags] = useState(listToText(product?.tags))
  const [rating, setRating] = useState(product?.rating ?? 0)
  const [reviews, setReviews] = useState(product?.reviews ?? 0)
  const [views, setViews] = useState(product?.views ?? 0)
  const [newIn, setNewIn] = useState(product?.new_in ?? false)
  const [offers, setOffers] = useState<OfferInput[]>(
    product?.offers.length
      ? product.offers.map(({ id: _id, product_slug: _ps, ...rest }) => ({
          ...rest,
          // Stored in the site's base unit (see @/lib/currency) — shown/edited as real USD.
          price: toUsd(rest.price),
          original_price: toUsd(rest.original_price),
        }))
      : [emptyOffer()],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateOffer(i: number, patch: Partial<OfferInput>) {
    setOffers((prev) =>
      prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanOffers = offers
      .filter((o) => o.store && o.price > 0 && o.product_url)
      // Convert the USD amounts entered in the form back to the site's
      // stored base unit (see @/lib/currency) before writing to Supabase.
      .map((o) => ({
        ...o,
        price: fromUsd(o.price),
        original_price: fromUsd(o.original_price),
      }))
    if (!name.trim() || !slug.trim() || !brand || cleanOffers.length === 0) {
      setError(
        'Name, slug, brand and at least one valid offer (store, price, URL) are required.',
      )
      return
    }

    const input = {
      name,
      slug,
      source_id: product?.source_id ?? slug,
      brand,
      category,
      subcategory,
      gender,
      description,
      image,
      images: linesToList(images),
      colors: textToList(colors),
      sizes: textToList(sizes),
      tags: textToList(tags),
      rating,
      reviews,
      views,
      new_in: newIn,
      offers: cleanOffers,
    }

    setSaving(true)
    try {
      if (product) {
        await updateProduct(product.slug, input)
      } else {
        await createProduct(input)
      }
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save product.'))
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
          onChange={(e) => {
            setName(e.target.value)
            if (!product) setSlug(slugify(e.target.value))
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

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Subcategory">
          <input
            className={inputClass}
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Gender">
          <select
            className={selectClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            {['men', 'women', 'unisex'].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Description">
        <textarea
          className={`${inputClass} min-h-20 resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </FormField>

      <FormField label="Main image URL">
        <input
          className={inputClass}
          value={image}
          onChange={(e) => setImage(e.target.value)}
          required
        />
      </FormField>

      <FormField label="Additional image URLs (one per line, optional)">
        <textarea
          className={`${inputClass} min-h-20 resize-y`}
          value={images}
          onChange={(e) => setImages(e.target.value)}
          placeholder={'https://example.com/image-1.jpg\nhttps://example.com/image-2.jpg'}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Colors (comma-separated)">
          <input
            className={inputClass}
            value={colors}
            onChange={(e) => setColors(e.target.value)}
          />
        </FormField>
        <FormField label="Sizes (comma-separated)">
          <input
            className={inputClass}
            value={sizes}
            onChange={(e) => setSizes(e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Tags (comma-separated)">
        <input
          className={inputClass}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Rating">
          <input
            type="number"
            min={0}
            max={5}
            step="0.1"
            className={inputClass}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          />
        </FormField>
        <FormField label="Reviews">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={reviews}
            onChange={(e) => setReviews(Number(e.target.value))}
          />
        </FormField>
        <FormField label="Views">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={views}
            onChange={(e) => setViews(Number(e.target.value))}
          />
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={newIn}
          onChange={(e) => setNewIn(e.target.checked)}
        />
        Mark as new arrival
      </label>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Store offers
        </p>
        <div className="space-y-3">
          {offers.map((offer, i) => (
            <div key={i} className="space-y-2 rounded-sm border p-3">
              <div className="grid grid-cols-3 gap-2">
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
                  className={inputClass}
                  value={offer.price || ''}
                  onChange={(e) =>
                    updateOffer(i, { price: Number(e.target.value) })
                  }
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Original price"
                  className={inputClass}
                  value={offer.original_price || ''}
                  onChange={(e) =>
                    updateOffer(i, { original_price: Number(e.target.value) })
                  }
                />
              </div>
              <input
                placeholder="Product URL"
                className={inputClass}
                value={offer.product_url}
                onChange={(e) =>
                  updateOffer(i, { product_url: e.target.value })
                }
              />
              <div className="grid grid-cols-4 gap-2">
                <input
                  placeholder="Currency"
                  className={inputClass}
                  value={offer.currency}
                  onChange={(e) => updateOffer(i, { currency: e.target.value })}
                />
                <select
                  className={selectClass}
                  value={offer.availability}
                  onChange={(e) =>
                    updateOffer(i, { availability: e.target.value })
                  }
                >
                  {AVAILABILITY.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Shipping"
                  className={inputClass}
                  value={offer.shipping}
                  onChange={(e) => updateOffer(i, { shipping: e.target.value })}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Updated (h ago)"
                  className={inputClass}
                  value={offer.updated_hours_ago}
                  onChange={(e) =>
                    updateOffer(i, {
                      updated_hours_ago: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <input
                  placeholder="Coupon code (optional)"
                  className={`${inputClass} max-w-xs`}
                  value={offer.coupon_code ?? ''}
                  onChange={(e) =>
                    updateOffer(i, { coupon_code: e.target.value || null })
                  }
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={offer.sponsored}
                    onChange={(e) =>
                      updateOffer(i, { sponsored: e.target.checked })
                    }
                  />
                  Sponsored
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setOffers((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="rounded-sm border px-2 py-1 text-xs uppercase tracking-[0.1em] hover:border-destructive hover:text-destructive"
                >
                  Remove
                </button>
              </div>
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
