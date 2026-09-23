#!/usr/bin/env node
// One-off backfill: downloads each brand's and store's logo once (currently
// hotlinked from cdn.worldvectorlogo.com, icons.duckduckgo.com,
// api.iconify.design — see the site repo's src/data/catalog.ts `brandLogo()`
// / src/data/stores.ts `storeLogo()`) and re-hosts it from our own
// "brand-logos" Storage bucket, writing brands.logo_url / stores.logo_url.
//
// Those source URLs live in the *site* repo's code, not in this database,
// so this script needs a JSON file mapping slug -> current logo URL,
// produced by running `npx tsx scripts/export-logo-map.ts` in the site repo
// and copying the resulting logo-map.json here (see that script for why —
// short version: catalog.ts imports image assets that only resolve through
// Vite, so this admin-panel repo can't just import it directly).
//
// Usage:
//   npm run backfill:logos -- path/to/logo-map.json --dry-run --limit 10
//   npm run backfill:logos -- path/to/logo-map.json --limit 10
//   npm run backfill:logos -- path/to/logo-map.json
//   npm run backfill:logos -- path/to/logo-map.json --force
//
// --limit applies per table (brands and stores each get up to N).
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env — see
// scripts/lib/env.mjs. This writes to your live database and Storage
// bucket — always try --dry-run first, then a small --limit, before a full run.

import fs from 'node:fs'
import path from 'node:path'
import { requireServiceRoleClient } from './lib/env.mjs'
import { ensurePublicBucket, processLogo, runWithConcurrency } from './lib/image-pipeline.mjs'

const LOGO_BUCKET = 'brand-logos'
const CONCURRENCY = 4

const argv = process.argv.slice(2)
const force = argv.includes('--force')
const dryRun = argv.includes('--dry-run')
const limit = parseLimitArg(argv)
const mapPath = findMapPath(argv)

function parseLimitArg(args) {
  const i = args.indexOf('--limit')
  if (i === -1) return null
  const n = Number(args[i + 1])
  if (!Number.isFinite(n) || n <= 0) {
    console.error('--limit requires a positive number, e.g. --limit 10')
    process.exit(1)
  }
  return n
}

// The only positional (non-flag) argument — skips both "--limit" and the
// number right after it, so a numeric --limit value never gets mistaken
// for the JSON path.
function findMapPath(args) {
  const limitIndex = args.indexOf('--limit')
  const skip = new Set(limitIndex === -1 ? [] : [limitIndex, limitIndex + 1])
  return args.find((a, i) => !skip.has(i) && !a.startsWith('--'))
}

if (!mapPath) {
  console.error(
    'Usage: node scripts/backfill-brand-logos.mjs path/to/logo-map.json [--dry-run] [--limit N] [--force]',
  )
  process.exit(1)
}

const supabase = requireServiceRoleClient()

async function processEntity(table, prefix, slug, logoUrl) {
  const result = await processLogo(supabase, LOGO_BUCKET, prefix, slug, logoUrl, { dryRun })
  if (dryRun) return result

  const { error } = await supabase
    .from(table)
    .update({ logo_url: result.url, logo_source_url: result.sourceUrl })
    .eq('slug', slug)
  if (error) throw error
  return result
}

async function backfillTable(table, prefix, logoMap) {
  const { data: rows, error } = await supabase.from(table).select('slug, logo_source_url')
  if (error) throw error

  const eligible = rows.filter((r) => {
    if (!logoMap[r.slug]) return false
    return force || !r.logo_source_url
  })
  const alreadyProcessed = rows.length - eligible.length
  const truncated = limit != null && eligible.length > limit
  const candidates = limit != null ? eligible.slice(0, limit) : eligible

  console.log(
    `${table}: ${rows.length} total, ${Object.keys(logoMap).length} with a known logo URL, ` +
      `${candidates.length} will be processed this run` +
      (truncated ? ` (--limit ${limit}; ${eligible.length - limit} more eligible after this run)` : '') +
      (force ? ' [--force]' : ` [${alreadyProcessed} already processed, skipped]`),
  )

  const summary = { processed: 0, wouldProcess: 0, failed: 0, failures: [] }
  const tasks = candidates.map((r) => () => processEntity(table, prefix, r.slug, logoMap[r.slug]))

  await runWithConcurrency(tasks, CONCURRENCY, (i, outcome) => {
    const slug = candidates[i].slug
    if (!outcome.ok) {
      summary.failed++
      summary.failures.push({ slug, error: outcome.error.message })
      console.warn(`  [${table}] ${slug}: FAILED — ${outcome.error.message}`)
      return
    }
    if (dryRun) {
      summary.wouldProcess++
      console.log(
        `  [${table}] ${slug}: would set logo_url -> ${outcome.result.url}` +
          (outcome.result.wouldUpload ? ' [new upload]' : ' [already uploaded, would just update the row]'),
      )
      return
    }
    summary.processed++
    console.log(`  [${table}] ${slug}: processed -> ${outcome.result.url}`)
  })

  return summary
}

async function main() {
  const raw = fs.readFileSync(path.resolve(mapPath), 'utf8')
  const logoMap = JSON.parse(raw)
  if (!logoMap.brands || !logoMap.stores) {
    console.error('logo-map.json must have the shape { brands: {...}, stores: {...} }')
    process.exit(1)
  }

  if (dryRun) {
    console.log('--- DRY RUN: downloading + converting only, no Storage or DB writes ---')
  } else {
    await ensurePublicBucket(supabase, LOGO_BUCKET)
  }

  const brandSummary = await backfillTable('brands', 'brands', logoMap.brands)
  const storeSummary = await backfillTable('stores', 'stores', logoMap.stores)

  console.log(`\n--- ${dryRun ? 'Dry-run' : 'Logo backfill'} summary ---`)
  for (const [label, summary] of [
    ['Brands', brandSummary],
    ['Stores', storeSummary],
  ]) {
    console.log(
      `${label}: ${dryRun ? `would process ${summary.wouldProcess}` : `processed ${summary.processed}`}, failed ${summary.failed}`,
    )
    for (const f of summary.failures) console.log(`  - ${f.slug}: ${f.error}`)
  }
}

main().catch((err) => {
  console.error('Logo backfill failed:', err)
  process.exit(1)
})
