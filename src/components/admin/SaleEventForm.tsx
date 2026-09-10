import { useState } from 'react'
import { FormField, errorMessage, inputClass, selectClass } from './FormField'
import type { SaleEvent, SaleTimeWindow, Store } from '@/types/catalog'
import { createSaleEvent, updateSaleEvent } from '@/lib/data'

const windows: SaleTimeWindow[] = [
  'today',
  'tomorrow',
  'this-week',
  'next-week',
  'this-month',
]

export function SaleEventForm({
  event,
  stores,
  onDone,
  onCancel,
}: {
  event?: SaleEvent
  stores: Store[]
  onDone: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [timeWindow, setTimeWindow] = useState<SaleTimeWindow>(
    (event?.window ?? 'today') as SaleTimeWindow,
  )
  const [discount, setDiscount] = useState(event?.discount ?? '')
  const [code, setCode] = useState(event?.code ?? '')
  const [store, setStore] = useState(event?.store ?? stores[0].slug)
  const [detail, setDetail] = useState(event?.detail ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !discount.trim() || !store || !detail.trim()) {
      setError('Title, discount, store and detail are required.')
      return
    }

    const input = {
      title,
      window: timeWindow,
      discount,
      code: code.trim() || null,
      store,
      detail,
    }

    setSaving(true)
    try {
      if (event) {
        await updateSaleEvent(event.id, input)
      } else {
        await createSaleEvent(input)
      }
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save sale.'))
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
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Window">
          <select
            className={selectClass}
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as SaleTimeWindow)}
          >
            {windows.map((w) => (
              <option key={w} value={w}>
                {w.replace('-', ' ')}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Store">
          <select
            className={selectClass}
            value={store}
            onChange={(e) => setStore(e.target.value)}
          >
            {stores.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Discount label">
          <input
            className={inputClass}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
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

      <FormField label="Detail">
        <textarea
          className={`${inputClass} min-h-20 resize-y`}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
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
          {saving ? 'Saving...' : event ? 'Save changes' : 'Add sale'}
        </button>
      </div>
    </form>
  )
}
