import { useState } from 'react'
import { FormField, inputClass } from './FormField'
import { NetworkSelect } from './NetworkSelect'
import type { Store } from '@/types/catalog'
import { createStore, updateStore } from '@/lib/data'

export function StoreForm({
  store,
  networks,
  onDone,
  onCancel,
}: {
  store?: Store
  networks: string[]
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(store?.name ?? '')
  const [slug, setSlug] = useState(store?.slug ?? '')
  const [network, setNetwork] = useState(store?.network ?? networks[0])
  const [campaign, setCampaign] = useState(store?.campaign ?? '')
  const [storeId, setStoreId] = useState(store?.storeId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (
      !name.trim() ||
      !slug.trim() ||
      !network.trim() ||
      !campaign.trim() ||
      !storeId.trim()
    ) {
      setError('All fields are required.')
      return
    }

    setSaving(true)
    try {
      if (store) {
        await updateStore(store.slug, { name, network, campaign, storeId })
      } else {
        await createStore({ name, slug, network, campaign, storeId })
      }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <FormField label="Store name">
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
          disabled={!!store}
          required
        />
      </FormField>

      <FormField label="Affiliate network">
        <NetworkSelect
          value={network}
          networks={networks}
          onChange={setNetwork}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Campaign">
          <input
            className={inputClass}
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Store ID">
          <input
            className={inputClass}
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            required
          />
        </FormField>
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
          {saving ? 'Saving...' : store ? 'Save changes' : 'Add store'}
        </button>
      </div>
    </form>
  )
}
