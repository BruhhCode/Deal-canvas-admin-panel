import { useState } from 'react'
import { FormField, inputClass, selectClass } from './FormField'
import { NetworkSelect } from './NetworkSelect'
import { CATEGORIES } from '@/types/catalog'
import type { Brand, Deal, DealStatus } from '@/types/catalog'
import { createDeal, slugify, updateDeal } from '@/lib/data'

const STATUSES: DealStatus[] = ['ACTIVE', 'PAUSED', 'EXPIRED', 'UPCOMING']

const listToText = (list: string[] | null | undefined) =>
  (list ?? []).join(', ')
const textToList = (text: string) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
const linesToText = (list: string[] | null | undefined) =>
  (list ?? []).join('\n')
const textToLines = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

export function DealForm({
  deal,
  brands,
  networks,
  onDone,
  onCancel,
}: {
  deal?: Deal
  brands: Brand[]
  networks: string[]
  onDone: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(deal?.title ?? '')
  const [slug, setSlug] = useState(deal?.slug ?? '')
  const [product, setProduct] = useState(deal?.product ?? '')
  const [brand, setBrand] = useState(deal?.brand ?? brands[0].slug)
  const [category, setCategory] = useState(
    deal?.category ?? Object.keys(CATEGORIES)[0],
  )
  const [subcategory, setSubcategory] = useState(deal?.subcategory ?? '')
  const [price, setPrice] = useState(deal?.price ?? 0)
  const [originalPrice, setOriginalPrice] = useState(deal?.original_price ?? 0)
  const [code, setCode] = useState(deal?.code ?? '')
  const [dealType, setDealType] = useState(deal?.deal_type ?? 'Store Sale')
  const [status, setStatus] = useState<DealStatus>(deal?.status ?? 'ACTIVE')
  const [network, setNetwork] = useState(deal?.network ?? networks[0])
  const [description, setDescription] = useState(deal?.description ?? '')
  const [image, setImage] = useState(deal?.image ?? '')
  const [merchantUrl, setMerchantUrl] = useState(deal?.merchant_url ?? '')
  const [badges, setBadges] = useState(listToText(deal?.badges))
  const [tags, setTags] = useState(listToText(deal?.tags))
  const [terms, setTerms] = useState(linesToText(deal?.terms))
  const [expiresInHours, setExpiresInHours] = useState(
    deal?.expires_in_hours ?? 72,
  )
  const [campaign, setCampaign] = useState(deal?.campaign ?? '')
  const [subId, setSubId] = useState(deal?.sub_id ?? '')
  const [trackingId, setTrackingId] = useState(deal?.tracking_id ?? '')
  const [featured, setFeatured] = useState(deal?.featured ?? false)
  const [flash, setFlash] = useState(deal?.flash ?? false)
  const [sponsored, setSponsored] = useState(deal?.sponsored ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyTitle(value: string) {
    setTitle(value)
    if (!deal) {
      const s = slugify(value)
      setSlug(s)
      if (!subId) setSubId(`web_${brand}`)
      if (!trackingId)
        setTrackingId(`TRK-${brand.toUpperCase().slice(0, 4)}-${s.slice(0, 6)}`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (
      !title.trim() ||
      !slug.trim() ||
      !product.trim() ||
      !brand ||
      !network ||
      !dealType.trim() ||
      !description.trim() ||
      !image.trim() ||
      !merchantUrl.trim() ||
      !campaign.trim() ||
      !subId.trim() ||
      !trackingId.trim() ||
      price <= 0 ||
      originalPrice <= 0
    ) {
      setError(
        'Please fill in all required fields (marked fields with * are optional).',
      )
      return
    }

    const input = {
      title,
      slug,
      product,
      product_id: deal?.product_id ?? null,
      brand,
      category,
      subcategory: subcategory.trim() || null,
      price,
      original_price: originalPrice,
      code: code.trim() || null,
      deal_type: dealType,
      status,
      network,
      description,
      image,
      merchant_url: merchantUrl,
      badges: textToList(badges),
      tags: textToList(tags),
      terms: textToLines(terms),
      expires_in_hours: expiresInHours,
      campaign,
      sub_id: subId,
      tracking_id: trackingId,
      featured,
      flash,
      sponsored,
    }

    setSaving(true)
    try {
      if (deal) {
        await updateDeal(deal.id, input)
      } else {
        await createDeal(input)
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save deal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <FormField label="Deal title">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => applyTitle(e.target.value)}
          required
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Slug">
          <input
            className={inputClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Product name">
          <input
            className={inputClass}
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
        <FormField label="Subcategory (optional)">
          <input
            className={inputClass}
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Price">
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={price || ''}
            onChange={(e) => setPrice(Number(e.target.value))}
            required
          />
        </FormField>
        <FormField label="Original price">
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={originalPrice || ''}
            onChange={(e) => setOriginalPrice(Number(e.target.value))}
            required
          />
        </FormField>
        <FormField label="Coupon code (optional)">
          <input
            className={inputClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Deal type">
          <input
            className={inputClass}
            value={dealType}
            onChange={(e) => setDealType(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Status">
          <select
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as DealStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Network">
          <NetworkSelect
            value={network}
            networks={networks}
            onChange={setNetwork}
          />
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

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Image URL">
          <input
            className={inputClass}
            value={image}
            onChange={(e) => setImage(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Merchant URL">
          <input
            className={inputClass}
            value={merchantUrl}
            onChange={(e) => setMerchantUrl(e.target.value)}
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Badges (comma-separated)">
          <input
            className={inputClass}
            value={badges}
            onChange={(e) => setBadges(e.target.value)}
          />
        </FormField>
        <FormField label="Tags (comma-separated)">
          <input
            className={inputClass}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Terms (one per line)">
        <textarea
          className={`${inputClass} min-h-20 resize-y`}
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-4 gap-4">
        <FormField label="Expires (hours)">
          <input
            type="number"
            className={inputClass}
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
          />
        </FormField>
        <FormField label="Campaign">
          <input
            className={inputClass}
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Sub-ID">
          <input
            className={inputClass}
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Tracking ID">
          <input
            className={inputClass}
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            required
          />
        </FormField>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
          />
          Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={flash}
            onChange={(e) => setFlash(e.target.checked)}
          />
          Flash sale
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sponsored}
            onChange={(e) => setSponsored(e.target.checked)}
          />
          Sponsored
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
          {saving ? 'Saving...' : deal ? 'Save changes' : 'Add deal'}
        </button>
      </div>
    </form>
  )
}
