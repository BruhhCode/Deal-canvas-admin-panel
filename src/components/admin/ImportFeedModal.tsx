import { useState } from 'react'
import { errorMessage, selectClass } from './FormField'
import {
  bulkCreateBrands,
  bulkCreateStores,
  bulkImportProducts,
  slugify,
} from '@/lib/data'
import type { BrandInput, OfferInput, ProductInput, StoreInput } from '@/lib/data'
import { fromUsd } from '@/lib/currency'
import { NETWORKS } from '@/types/catalog'
import type { Brand, Store } from '@/types/catalog'

type CsvRow = Record<string, string>

const REQUIRED_COLUMNS = [
  'product_name',
  'brand_slug',
  'category_slug',
  'subcategory',
  'gender',
  'store_slug',
  'price',
  'original_price',
  'availability',
  'product_url',
  'image_url',
]

// Optional gallery images for the product detail page (image_url above is the
// single image shown on cards/listings). Semicolon-separated, not comma —
// image CDN URLs (Nike/Adidas etc.) embed commas in their own transform
// params, so a comma-separated list would shred a URL that contains one
// (see ProductForm.tsx's identical fix for the single-product form).
const IMAGES_COLUMN = 'images'

// Parses CSV honoring RFC4180 quoting: quoted fields may contain commas,
// newlines and escaped ("") double quotes. A naive `line.split(',')` breaks
// on real product feeds because image CDN URLs (e.g. `w_280,h_280,...`) and
// some product names contain literal commas inside quoted fields.
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const n = text.length

  while (i < n) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }
    if (char === '\r') {
      i += 1
      continue
    }
    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += 1
      continue
    }
    field += char
    i += 1
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0))
}

function parseCsv(text: string): CsvRow[] {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim())
  return rows.slice(1).map((cols) => {
    const row: CsvRow = {}
    header.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim()
    })
    return row
  })
}

function slugFromUrl(url: string): string {
  const last = url.split('/').filter(Boolean).pop()
  return last ? slugify(last) : slugify(url)
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// products.gender has a CHECK constraint accepting only 'men', 'women' and
// 'unisex' — there is no 'kids' value in the schema. Feed data commonly has
// different casing, compound values ("Women/Unisex") and kids/baby rows
// that would otherwise violate the constraint, so those map to 'unisex'.
function normalizeGender(raw: string): string {
  const g = raw.trim().toLowerCase()
  if (!g) return 'unisex'
  if (/kid|baby|boy|girl|unisex/.test(g)) return 'unisex'
  const hasWomen = /women/.test(g)
  const hasMen = /\bmen\b/.test(g)
  if (hasWomen && hasMen) return 'unisex'
  if (hasWomen) return 'women'
  if (hasMen) return 'men'
  return 'unisex'
}

// offers.availability has a CHECK constraint accepting only these three
// values; feed data commonly uses different casing/wording (e.g. "In
// Stock", "Coming Soon").
function normalizeAvailability(raw: string): string {
  const a = raw.trim().toLowerCase()
  if (!a) return 'IN STOCK'
  if (/out|discontinued|coming|preorder|backorder/.test(a)) return 'OUT OF STOCK'
  if (/low|limited/.test(a)) return 'LOW STOCK'
  return 'IN STOCK'
}

type ParsedFeed = {
  rowCount: number
  products: ProductInput[]
  unknownBrands: string[]
  unknownStores: string[]
  unknownStoreDomains: Map<string, string>
}

function buildFeed(
  rows: CsvRow[],
  brands: Brand[],
  stores: Store[],
): ParsedFeed {
  const brandSlugs = new Set(brands.map((b) => b.slug))
  const storeSlugs = new Set(stores.map((s) => s.slug))
  const unknownBrands = new Set<string>()
  const unknownStores = new Set<string>()
  const unknownStoreDomains = new Map<string, string>()

  const bySlug = new Map<string, ProductInput>()

  for (const row of rows) {
    if (!row.brand_slug || !row.store_slug || !row.product_url) continue
    if (!brandSlugs.has(row.brand_slug)) unknownBrands.add(row.brand_slug)
    if (!storeSlugs.has(row.store_slug)) {
      unknownStores.add(row.store_slug)
      if (!unknownStoreDomains.has(row.store_slug)) {
        unknownStoreDomains.set(row.store_slug, domainFromUrl(row.product_url))
      }
    }

    const slug = slugFromUrl(row.product_url)
    const offer: OfferInput = {
      store: row.store_slug,
      // CSVs carry real USD; offers.price/original_price are stored in the
      // site's base unit (see @/lib/currency).
      price: fromUsd(Number(row.price) || 0),
      original_price: fromUsd(Number(row.original_price) || 0),
      currency: 'USD',
      availability: normalizeAvailability(row.availability),
      product_url: row.product_url,
      coupon_code: null,
      shipping: 'Standard',
      updated_hours_ago: 0,
      sponsored: false,
    }

    const existing = bySlug.get(slug)
    if (existing) {
      existing.offers.push(offer)
      continue
    }

    bySlug.set(slug, {
      slug,
      source_id: slug,
      name: row.product_name,
      brand: row.brand_slug,
      category: row.category_slug,
      subcategory: row.subcategory || '',
      gender: normalizeGender(row.gender),
      description: `${row.product_name} from ${row.brand_slug}.`,
      image: row.image_url,
      images: (row[IMAGES_COLUMN] ?? '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean),
      colors: [],
      sizes: [],
      tags: [],
      rating: 0,
      reviews: 0,
      views: 0,
      new_in: false,
      offers: [offer],
    })
  }

  return {
    rowCount: rows.length,
    products: Array.from(bySlug.values()),
    unknownBrands: Array.from(unknownBrands).sort(),
    unknownStores: Array.from(unknownStores).sort(),
    unknownStoreDomains,
  }
}

export function ImportFeedModal({
  brands,
  stores,
  onDone,
  onCancel,
}: {
  brands: Brand[]
  stores: Store[]
  onDone: () => void
  onCancel: () => void
}) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [feed, setFeed] = useState<ParsedFeed | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [autoCreate, setAutoCreate] = useState(true)
  const [newNetwork, setNewNetwork] = useState<string>(NETWORKS[0])
  const [result, setResult] = useState<{
    productCount: number
    offerCount: number
    brandCount: number
    storeCount: number
  } | null>(null)

  async function handleFile(file: File) {
    setParseError(null)
    setImportError(null)
    setResult(null)
    setFileName(file.name)

    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length === 0) {
      setFeed(null)
      setParseError('The file has no data rows.')
      return
    }
    const header = Object.keys(rows[0])
    const missingColumns = REQUIRED_COLUMNS.filter((c) => !header.includes(c))
    if (missingColumns.length > 0) {
      setFeed(null)
      setParseError(
        `Missing expected column${missingColumns.length === 1 ? '' : 's'}: ${missingColumns.join(', ')}`,
      )
      return
    }

    setFeed(buildFeed(rows, brands, stores))
  }

  async function handleImport() {
    if (!feed) return
    setImporting(true)
    setImportError(null)
    try {
      if (autoCreate) {
        const newBrands: BrandInput[] = feed.unknownBrands.map((slug) => ({
          slug,
          name: titleCase(slug),
          description: null,
          category: null,
          network: newNetwork,
          featured: false,
        }))
        const newStores: StoreInput[] = feed.unknownStores.map((slug) => ({
          slug,
          name: titleCase(slug),
          description: null,
          network: newNetwork,
          domain: feed.unknownStoreDomains.get(slug) ?? '',
          campaign: '',
          store_id: '',
          sub_id: '',
          ships_to: '',
          store_wide_offer: null,
          featured: false,
          sponsored: false,
        }))
        await bulkCreateBrands(newBrands)
        await bulkCreateStores(newStores)
      }
      const outcome = await bulkImportProducts(feed.products)
      setResult({
        ...outcome,
        brandCount: autoCreate ? feed.unknownBrands.length : 0,
        storeCount: autoCreate ? feed.unknownStores.length : 0,
      })
    } catch (err) {
      setImportError(errorMessage(err, 'Import failed.'))
    } finally {
      setImporting(false)
    }
  }

  const hasUnknowns =
    feed && (feed.unknownBrands.length > 0 || feed.unknownStores.length > 0)
  const canImport = feed && (autoCreate || !hasUnknowns)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a CSV with columns:{' '}
        <code className="text-xs">{REQUIRED_COLUMNS.join(', ')}</code>. Rows
        sharing the same product URL are combined into one product with multiple
        store offers. An optional <code className="text-xs">images</code>{' '}
        column adds gallery images to the product page — separate multiple
        URLs with a semicolon (<code className="text-xs">;</code>), not a
        comma, since image URLs often contain commas of their own.
      </p>
      <p className="text-sm text-muted-foreground">
        Doubles as bulk update: a row whose <code className="text-xs">product_url</code>{' '}
        matches a product you already imported updates it in place (name,
        price, images, offers — everything is replaced with what's in this
        file) instead of erroring or creating a duplicate.
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
        className="block w-full text-sm"
      />

      {parseError ? (
        <p className="text-sm text-destructive">{parseError}</p>
      ) : null}

      {feed && !result ? (
        <div className="space-y-3 rounded-sm border p-4 text-sm">
          <p>
            <span className="font-semibold">{fileName}</span> — parsed{' '}
            {feed.rowCount} rows into {feed.products.length} product
            {feed.products.length === 1 ? '' : 's'} (
            {feed.products.reduce((s, p) => s + p.offers.length, 0)} offers).
          </p>
          {feed.unknownBrands.length > 0 ? (
            <p className={autoCreate ? '' : 'text-destructive'}>
              Unknown brand slug{feed.unknownBrands.length === 1 ? '' : 's'} (
              {feed.unknownBrands.length}){autoCreate ? ' — will be created:' : ':'}{' '}
              {feed.unknownBrands.join(', ')}
            </p>
          ) : null}
          {feed.unknownStores.length > 0 ? (
            <p className={autoCreate ? '' : 'text-destructive'}>
              Unknown store slug{feed.unknownStores.length === 1 ? '' : 's'} (
              {feed.unknownStores.length}){autoCreate ? ' — will be created:' : ':'}{' '}
              {feed.unknownStores.join(', ')}
            </p>
          ) : null}
          {hasUnknowns ? (
            <div className="space-y-2 border-t pt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoCreate}
                  onChange={(e) => setAutoCreate(e.target.checked)}
                />
                Automatically create missing brands and stores
              </label>
              {autoCreate ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Network for new brands/stores:
                  </span>
                  <select
                    className={selectClass}
                    value={newNetwork}
                    onChange={(e) => setNewNetwork(e.target.value)}
                  >
                    {NETWORKS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Or add these manually in the Brands/Stores tabs first, then
                  re-upload.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {importError ? (
        <p className="text-sm text-destructive">{importError}</p>
      ) : null}

      {result ? (
        <p className="rounded-sm border border-clay/30 bg-clay/10 p-4 text-sm text-clay">
          {result.brandCount > 0 || result.storeCount > 0
            ? `Created ${result.brandCount} brand${result.brandCount === 1 ? '' : 's'} and ${result.storeCount} store${result.storeCount === 1 ? '' : 's'}. `
            : ''}
          Imported {result.productCount} product
          {result.productCount === 1 ? '' : 's'} and {result.offerCount} offer
          {result.offerCount === 1 ? '' : 's'}.
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t pt-4">
        <button
          type="button"
          onClick={result ? onDone : onCancel}
          className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:border-clay"
        >
          {result ? 'Close' : 'Cancel'}
        </button>
        {!result ? (
          <button
            type="button"
            disabled={!canImport || importing}
            onClick={handleImport}
            className="rounded-sm bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-60"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
