// Deal Canvas — Supabase seed script
//
// Usage:
//   npm install @supabase/supabase-js
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node seed.js path/to/products-import.csv
//
// IMPORTANT: use the service_role key (not the anon key) — this script
// bypasses RLS to insert seed data. Never ship the service_role key to
// the browser/client; run this only from your local machine or a CI job.

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const {
  brandsForDb,
  storesForDb,
  deals,
  coupons,
  saleEvents,
} = require('./static-data')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const csvPath = process.argv[2]

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.')
  process.exit(1)
}
if (!csvPath) {
  console.error('Usage: node seed.js path/to/products-import.csv')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------
// Columns: product_name,brand_slug,category_slug,subcategory,gender,
//          store_slug,price,original_price,availability,product_url,image_url
// No quoted fields with embedded commas in this dataset, so a plain split works.
function parseCsv(text) {
  const lines = text.trim().split('\n')
  const header = lines[0].split(',')
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const cols = line.split(',')
    const row = {}
    header.forEach((h, idx) => (row[h.trim()] = cols[idx]?.trim()))
    rows.push(row)
  }
  return rows
}

// Extract the unique slug from a product_url like
// "https://www.nike.com/p/nike-1-air-runner" -> "nike-1-air-runner"
function slugFromUrl(url) {
  const parts = url.split('/')
  return parts[parts.length - 1]
}

function buildProductsAndOffers(rows) {
  const products = []
  const offers = []

  for (const row of rows) {
    const slug = slugFromUrl(row.product_url)
    const id = slug // stable, unique, human-readable — matches the app's URL structure

    products.push({
      id,
      slug,
      name: row.product_name,
      brand: row.brand_slug,
      category: row.category_slug,
      subcategory: row.subcategory,
      gender: row.gender,
      // Not present in the import CSV — defaulted here. Replace with real
      // copy/data once available; these are placeholders, not final content.
      description: `${row.product_name} from ${row.brand_slug}.`,
      image: row.image_url,
      images: null,
      colors: [],
      sizes: [],
      tags: [],
      rating: 0,
      reviews: 0,
      views: 0,
      new_in: false,
    })

    offers.push({
      product_id: id,
      store: row.store_slug,
      price: Number(row.price),
      original_price: Number(row.original_price),
      currency: 'USD',
      availability: row.availability,
      product_url: row.product_url,
      coupon_code: null,
      shipping: 'Standard',
      updated_hours_ago: 0,
      sponsored: false,
    })
  }

  return { products, offers }
}

// ---------------------------------------------------------------
// Batched insert helper (Supabase/Postgres can choke on very large
// single inserts — chunk everything to be safe)
// ---------------------------------------------------------------
async function insertBatched(table, rows, batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(chunk)
    if (error) {
      console.error(
        `Error inserting into ${table} (rows ${i}-${i + chunk.length}):`,
        error.message,
      )
      throw error
    }
    console.log(
      `  inserted ${Math.min(i + batchSize, rows.length)}/${rows.length} into ${table}`,
    )
  }
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
async function main() {
  const csvText = fs.readFileSync(path.resolve(csvPath), 'utf8')
  const rows = parseCsv(csvText)
  const { products, offers } = buildProductsAndOffers(rows)

  console.log(
    `Parsed ${rows.length} CSV rows -> ${products.length} products, ${offers.length} offers`,
  )

  console.log('Seeding brands...')
  await insertBatched('brands', brandsForDb)

  console.log('Seeding stores...')
  await insertBatched('stores', storesForDb)

  console.log('Seeding products...')
  await insertBatched('products', products)

  console.log('Seeding offers...')
  await insertBatched('offers', offers)

  console.log('Seeding deals...')
  await insertBatched('deals', deals)

  console.log('Seeding coupons...')
  await insertBatched('coupons', coupons)

  console.log('Seeding sale_events...')
  await insertBatched('sale_events', saleEvents)

  console.log('Done.')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
