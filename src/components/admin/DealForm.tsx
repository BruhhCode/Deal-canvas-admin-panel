import { useState } from 'react'
import { FormField, inputClass, selectClass } from './FormField'
import { NetworkSelect } from './NetworkSelect'
import type { Brand, Deal } from '@/types/catalog'
import { createDeal, updateDeal } from '@/lib/data'

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
  const [product, setProduct] = useState(deal?.product ?? '')
  const [brand, setBrand] = useState(deal?.brand ?? brands[0].slug)
  const [price, setPrice] = useState(deal?.price ?? 0)
  const [originalPrice, setOriginalPrice] = useState(deal?.originalPrice ?? 0)
  const [code, setCode] = useState(deal?.code ?? '')
  const [network, setNetwork] = useState(deal?.network ?? networks[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (
      !title.trim() ||
      !product.trim() ||
      !brand ||
      !network ||
      price <= 0 ||
      originalPrice <= 0
    ) {
      setError('Title, product, brand, network and both prices are required.')
      return
    }

    const input = {
      title,
      product,
      brand,
      price,
      originalPrice,
      code: code.trim() || undefined,
      network,
    }

    setSaving(true)
    try {
      if (deal) {
        await updateDeal(deal.id, input)
      } else {
        await createDeal(input)
      }
      onDone()
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
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </FormField>

      <FormField label="Product">
        <input
          className={inputClass}
          value={product}
          onChange={(e) => setProduct(e.target.value)}
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
        <FormField label="Network">
          <NetworkSelect
            value={network}
            networks={networks}
            onChange={setNetwork}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <FormField label="Coupon code (optional)">
        <input
          className={inputClass}
          value={code}
          onChange={(e) => setCode(e.target.value)}
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
          {saving ? 'Saving...' : deal ? 'Save changes' : 'Add deal'}
        </button>
      </div>
    </form>
  )
}
