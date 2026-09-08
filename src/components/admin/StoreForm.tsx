import { useState } from 'react'
import { FormField, errorMessage, inputClass } from './FormField'
import { NetworkSelect } from './NetworkSelect'
import { NETWORKS } from '@/types/catalog'
import type { Store } from '@/types/catalog'
import { createStore, updateStore } from '@/lib/data'

export function StoreForm({
  store,
  onDone,
  onCancel,
}: {
  store?: Store
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(store?.name ?? '')
  const [slug, setSlug] = useState(store?.slug ?? '')
  const [description, setDescription] = useState(store?.description ?? '')
  const [network, setNetwork] = useState<string>(store?.network ?? NETWORKS[0])
  const [domain, setDomain] = useState(store?.domain ?? '')
  const [campaign, setCampaign] = useState(store?.campaign ?? '')
  const [storeId, setStoreId] = useState(store?.store_id ?? '')
  const [subId, setSubId] = useState(store?.sub_id ?? 'home')
  const [shipsTo, setShipsTo] = useState(store?.ships_to ?? 'US')
  const [storeWideOffer, setStoreWideOffer] = useState(
    store?.store_wide_offer ?? '',
  )
  const [featured, setFeatured] = useState(store?.featured ?? false)
  const [sponsored, setSponsored] = useState(store?.sponsored ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (
      !name.trim() ||
      !slug.trim() ||
      !network.trim() ||
      !domain.trim() ||
      !campaign.trim() ||
      !storeId.trim() ||
      !subId.trim() ||
      !shipsTo.trim()
    ) {
      setError(
        'Name, slug, network, domain, campaign, store ID, sub-ID and ships-to are required.',
      )
      return
    }

    const fields = {
      name,
      network,
      description: description.trim() || null,
      domain,
      campaign,
      store_id: storeId,
      sub_id: subId,
      ships_to: shipsTo,
      store_wide_offer: storeWideOffer.trim() || null,
      featured,
      sponsored,
    }

    setSaving(true)
    try {
      if (store) {
        await updateStore(store.slug, fields)
      } else {
        await createStore({ slug, ...fields })
      }
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save store.'))
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

      <FormField label="Description (optional)">
        <textarea
          className={`${inputClass} min-h-16 resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Affiliate network">
          <NetworkSelect value={network} onChange={setNetwork} />
        </FormField>
        <FormField label="Domain">
          <input
            className={inputClass}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
        <FormField label="Sub-ID">
          <input
            className={inputClass}
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Ships to">
          <input
            className={inputClass}
            value={shipsTo}
            onChange={(e) => setShipsTo(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Storewide offer (optional)">
          <input
            className={inputClass}
            value={storeWideOffer}
            onChange={(e) => setStoreWideOffer(e.target.value)}
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
          {saving ? 'Saving...' : store ? 'Save changes' : 'Add store'}
        </button>
      </div>
    </form>
  )
}
