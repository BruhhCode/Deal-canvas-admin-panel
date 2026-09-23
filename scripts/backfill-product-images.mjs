#!/usr/bin/env node
// One-off backfill: processes images for products already in the database
// (as opposed to seed.js, which processes images for products being
// imported from a CSV right now) — run this once after
// add-image-columns.sql, or any time later to pick up products that were
// added since (e.g. through the admin UI's own Import Feed, which does not
// do image processing itself).
//
// Usage:
//   npm run backfill:images -- --dry-run --limit 10   (safe: no Storage/DB writes)
//   npm run backfill:images -- --limit 10              (real, first 10 only)
//   npm run backfill:images                            (real, everything)
//   npm run backfill:images -- --force                 (reprocess every product,
//                                                         even ones already done)
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env — see
// scripts/lib/env.mjs. This writes to your live database and Storage
// bucket — always try --dry-run first, then a small --limit, before a full run.

import { requireServiceRoleClient } from './lib/env.mjs'
import {
  ensurePublicBucket,
  processProductImage,
  runWithConcurrency,
} from './lib/image-pipeline.mjs'

const PRODUCT_IMAGES_BUCKET = 'product-images'
const IMAGE_CONCURRENCY = 4
const PAGE_SIZE = 1000 // PostgREST's default max-rows cap — must page past it.

const force = process.argv.includes('--force')
const dryRun = process.argv.includes('--dry-run')
const limit = parseLimitArg(process.argv)

function parseLimitArg(argv) {
  const i = argv.indexOf('--limit')
  if (i === -1) return null
  const n = Number(argv[i + 1])
  if (!Number.isFinite(n) || n <= 0) {
    console.error('--limit requires a positive number, e.g. --limit 10')
    process.exit(1)
  }
  return n
}

const supabase = requireServiceRoleClient()

async function fetchAllProducts() {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('products')
      .select('slug, image, images, image_source_url')
      .order('slug')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return rows
}

async function main() {
  if (dryRun) {
    console.log('--- DRY RUN: downloading + converting only, no Storage or DB writes ---')
  } else {
    await ensurePublicBucket(supabase, PRODUCT_IMAGES_BUCKET)
  }

  const allProducts = await fetchAllProducts()
  const eligible = allProducts.filter((p) => {
    if (!p.image) return false
    if (force) return true
    return !p.image_source_url
  })
  const alreadyProcessed = allProducts.length - eligible.length
  const truncated = limit != null && eligible.length > limit
  const candidates = limit != null ? eligible.slice(0, limit) : eligible

  console.log(
    `${allProducts.length} products total, ${eligible.length} eligible, ` +
      `${candidates.length} will be processed this run` +
      (truncated ? ` (--limit ${limit}; ${eligible.length - limit} more eligible after this run)` : '') +
      (force ? ' [--force: reprocessing all]' : ` [${alreadyProcessed} already processed, skipped]`),
  )

  const summary = { processed: 0, wouldProcess: 0, failed: 0, failures: [] }
  const tasks = candidates.map((p) => async () => {
    const main = await processProductImage(supabase, PRODUCT_IMAGES_BUCKET, p.slug, p.image, { dryRun })
    const patch = { image: main.url, image_source_url: main.sourceUrl }
    let anyUpload = main.wouldUpload

    const sourceGallery = Array.isArray(p.images) ? p.images : []
    if (sourceGallery.length) {
      const gallery = await Promise.all(
        sourceGallery.map((url) =>
          processProductImage(supabase, PRODUCT_IMAGES_BUCKET, p.slug, url, { dryRun }),
        ),
      )
      patch.images = gallery.map((g) => g.url)
      patch.images_source_urls = sourceGallery
      anyUpload = anyUpload || gallery.some((g) => g.wouldUpload)
    }

    if (dryRun) {
      return { wouldUpload: anyUpload, patch }
    }

    const { error } = await supabase.from('products').update(patch).eq('slug', p.slug)
    if (error) throw error
    return { wouldUpload: false, patch }
  })

  await runWithConcurrency(tasks, IMAGE_CONCURRENCY, (i, outcome) => {
    const slug = candidates[i].slug
    if (!outcome.ok) {
      summary.failed++
      summary.failures.push({ slug, error: outcome.error.message })
      console.warn(`  [image] ${slug}: FAILED — ${outcome.error.message} (left unchanged)`)
      return
    }
    if (dryRun) {
      summary.wouldProcess++
      console.log(
        `  [image] ${slug}: would set image -> ${outcome.result.patch.image}` +
          (outcome.result.patch.images ? ` (+${outcome.result.patch.images.length} gallery)` : '') +
          (outcome.result.wouldUpload ? ' [new upload]' : ' [already uploaded, would just update the row]'),
      )
      return
    }
    summary.processed++
    console.log(`  [image] ${slug}: processed -> ${outcome.result.patch.image}`)
  })

  console.log(`\n--- ${dryRun ? 'Dry-run' : 'Backfill'} summary ---`)
  console.log(dryRun ? `Would process: ${summary.wouldProcess}` : `Processed: ${summary.processed}`)
  console.log(`Already processed (skipped): ${alreadyProcessed}`)
  if (truncated) console.log(`Remaining eligible (not reached, due to --limit): ${eligible.length - limit}`)
  console.log(`Failed: ${summary.failed}`)
  if (summary.failures.length) {
    console.log('Failures:')
    for (const f of summary.failures) console.log(`  - ${f.slug}: ${f.error}`)
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
