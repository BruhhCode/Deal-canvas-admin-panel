#!/usr/bin/env node
// Deal Canvas — Supabase seed script
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/seed.js path/to/products-import.csv [--reset]
//
// IMPORTANT: use the service_role key (not the anon key) — this script
// bypasses RLS to insert seed data. Never ship the service_role key to
// the browser/client; run this only from your local machine or a CI job.
//
// Re-runnable and non-destructive by default: brands/stores/products/deals/
// coupons/sale_events upsert on their slug/id; offers upsert on
// (product_slug, store, product_url) — the unique index defined in the site
// repo's supabase/schema.sql. Nothing is ever deleted unless you pass
// --reset, which additionally removes offers no longer present in the CSV
// for the product_slugs being imported (never the whole table).
//
// NOTE: this was previously written with CommonJS require() calls, which
// cannot run under this package's "type": "module" — it was effectively
// broken (a hard ReferenceError, not just stale), and out of sync with the
// current schema (old product_id-keyed rows, no gender/availability
// normalization, no images gallery, no multi-store offer merging, and it
// deleted-then-reinserted every offer for a product on every run). Rewritten
// as ESM and brought in line with today's schema and the admin UI's Import
// Feed parsing (src/components/admin/ImportFeedModal.tsx).

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { brandsForDb, storesForDb, deals, coupons, saleEvents } from './static-data.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.')
  process.exit(1)
}

const reset = process.argv.includes('--reset')
const csvPath = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'))
if (!csvPath) {
  console.error('Usage: node scripts/seed.js path/to/products-import.csv [--reset]')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------------------------------------------------------------
// CSV parsing — RFC4180-aware (quoted fields may contain commas/newlines),
// same parser as the admin UI's Import Feed modal
// (src/components/admin/ImportFeedModal.tsx): retailer image URLs
// routinely embed commas in their own transform params, so a naive
// line.split(',') breaks on real feeds.
// ---------------------------------------------------------------
function parseCsvRows(text) {
  const rows = []
  let row = []
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

function parseCsv(text) {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim())
  return rows.slice(1).map((cols) => {
    const row = {}
    header.forEach((h, idx) => (row[h] = (cols[idx] ?? '').trim()))
    return row
  })
}

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function slugFromUrl(url) {
  const last = url.split('/').filter(Boolean).pop()
  return last ? slugify(last) : slugify(url)
}

// Same normalization as ImportFeedModal.tsx — products.gender and
// offers.availability have CHECK constraints; feed data commonly uses
// different casing/wording ("In Stock", "Women/Unisex", "Coming Soon").
function normalizeGender(raw) {
  const g = (raw ?? '').trim().toLowerCase()
  if (!g) return 'unisex'
  if (/kid|baby|boy|girl|unisex/.test(g)) return 'unisex'
  const hasWomen = /women/.test(g)
  const hasMen = /\bmen\b/.test(g)
  if (hasWomen && hasMen) return 'unisex'
  if (hasWomen) return 'women'
  if (hasMen) return 'men'
  return 'unisex'
}

function normalizeAvailability(raw) {
  const a = (raw ?? '').trim().toLowerCase()
  if (!a) return 'IN STOCK'
  if (/out|discontinued|coming|preorder|backorder/.test(a)) return 'OUT OF STOCK'
  if (/low|limited/.test(a)) return 'LOW STOCK'
  return 'IN STOCK'
}

// Rows sharing the same product_url are combined into one product with
// multiple store offers, same as the admin UI's bulk import.
function buildProductsAndOffers(rows) {
  const bySlug = new Map()
  for (const row of rows) {
    if (!row.brand_slug || !row.store_slug || !row.product_url) continue
    const slug = slugFromUrl(row.product_url)
    const offer = {
      store: row.store_slug,
      price: Number(row.price) || 0,
      original_price: Number(row.original_price) || 0,
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
      images: (row.images ?? '')
        .split('\n')
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
  return Array.from(bySlug.values())
}

// ---------------------------------------------------------------
// Batched upsert helper (Supabase/Postgres can choke on very large single
// requests — chunk everything to be safe)
// ---------------------------------------------------------------
async function upsertBatched(table, rows, conflictKey, batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflictKey })
    if (error) {
      console.error(`Error upserting into ${table} (rows ${i}-${i + chunk.length}):`, error.message)
      throw error
    }
    console.log(`  upserted ${Math.min(i + batchSize, rows.length)}/${rows.length} into ${table}`)
  }
}

// ---------------------------------------------------------------
// Offers — upsert on (product_slug, store, product_url), the unique index
// the site repo's supabase/schema.sql defines
// (offers_product_slug_store_url_key) and its own scripts/seed-supabase.ts
// already relies on. Previously this deleted every existing offer for a
// product_slug in this CSV, then re-inserted — meaning a currently-correct
// offer briefly didn't exist at all mid-run, and any offer row not
// mentioned here (e.g. hand-edited in the admin UI) was destroyed even if
// nothing about it needed to change. Upserting on the natural key means an
// unchanged offer is untouched, and a changed one updates in place.
//
// Offers genuinely removed from the source (e.g. a store dropped a product)
// are only cleaned up when --reset is passed — never by default — and even
// then only among the product_slugs in *this* CSV, not the whole table.
// ---------------------------------------------------------------
async function upsertOffers(products) {
  const offerRows = products.flatMap((p) => p.offers.map((o) => ({ ...o, product_slug: p.slug })))
  await upsertBatched('offers', offerRows, 'product_slug,store,product_url')

  if (!reset) return

  const slugs = products.map((p) => p.slug)
  const existingKeys = new Set()
  for (let i = 0; i < slugs.length; i += 200) {
    const { data, error } = await supabase
      .from('offers')
      .select('product_slug, store, product_url')
      .in('product_slug', slugs.slice(i, i + 200))
    if (error) throw error
    for (const r of data) existingKeys.add(`${r.product_slug}::${r.store}::${r.product_url}`)
  }

  const newKeys = new Set(offerRows.map((o) => `${o.product_slug}::${o.store}::${o.product_url}`))
  const stale = [...existingKeys]
    .filter((k) => !newKeys.has(k))
    .map((k) => {
      const [product_slug, store, product_url] = k.split('::')
      return { product_slug, store, product_url }
    })

  if (!stale.length) return

  const quote = (v) => `"${v.replace(/"/g, '\\"')}"`
  for (let i = 0; i < stale.length; i += 100) {
    const chunk = stale.slice(i, i + 100)
    const filter = chunk
      .map(
        (s) =>
          `and(product_slug.eq.${s.product_slug},store.eq.${s.store},product_url.eq.${quote(s.product_url)})`,
      )
      .join(',')
    const { error } = await supabase.from('offers').delete().or(filter)
    if (error) throw error
  }
  console.log(`  --reset: removed ${stale.length} offer(s) no longer in the source CSV`)
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main() {
  const csvText = fs.readFileSync(path.resolve(csvPath), 'utf8')
  const rows = parseCsv(csvText)
  const products = buildProductsAndOffers(rows)
  const offerCount = products.reduce((s, p) => s + p.offers.length, 0)

  console.log(`Parsed ${rows.length} CSV rows -> ${products.length} products, ${offerCount} offers`)

  console.log('Seeding brands...')
  await upsertBatched('brands', brandsForDb, 'slug')

  console.log('Seeding stores...')
  await upsertBatched('stores', storesForDb, 'slug')

  console.log('Seeding products...')
  const productRows = products.map(({ offers: _offers, ...fields }) => fields)
  await upsertBatched('products', productRows, 'slug')

  console.log('Seeding offers...')
  await upsertOffers(products)

  console.log('Seeding deals...')
  await upsertBatched('deals', deals, 'id')

  console.log('Seeding coupons...')
  await upsertBatched('coupons', coupons, 'id')

  console.log('Seeding sale_events...')
  await upsertBatched('sale_events', saleEvents, 'id')

  console.log('\nDone.')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
