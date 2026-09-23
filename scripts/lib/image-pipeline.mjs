// Core image-processing pipeline shared by seed.js, backfill-product-images.mjs
// and backfill-brand-logos.mjs: download a hotlinked retailer/logo URL once,
// re-encode it, and upload it to our own Supabase Storage bucket at a
// deterministic path — so re-running any of these scripts against the same
// source URL is a no-op (the upload is skipped once that path already
// exists), instead of re-downloading and re-uploading every time.
import { createHash } from 'node:crypto'
import sharp from 'sharp'

const DOWNLOAD_TIMEOUT_MS = 15_000
// Paths are content-addressed (slug + hash of the source URL) — the object
// at a given path never changes once written, so it's safe to tell
// browsers/CDNs to cache it for a full year instead of Supabase Storage's
// default (much shorter) cache-control.
const CACHE_CONTROL = '31536000'
// A real browser UA — several retailer CDNs (Nordstrom, Farfetch) return
// 403s for the default Node/undici UA even though hotlinking itself isn't
// blocked, since they're filtering on "looks like a bot", not the referer.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export function shortHash(url) {
  return createHash('sha1').update(url).digest('hex').slice(0, 10)
}

// One retry on any failure (network error, timeout, non-2xx) — enough to
// smooth over a transient blip without hammering a retailer that's actually
// blocking us.
export async function downloadImage(url) {
  let lastErr
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'image/*,*/*' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const contentType = res.headers.get('content-type') ?? ''
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length === 0) throw new Error('Empty response body')
      return { buffer, contentType }
    } catch (err) {
      lastErr = err
    } finally {
      clearTimeout(timeout)
    }
  }
  throw new Error(`Failed to download ${url}: ${lastErr?.message ?? lastErr}`)
}

function isSvg(contentType, url) {
  return contentType.includes('svg') || url.toLowerCase().endsWith('.svg')
}

// Skips the network round-trip entirely when the exact deterministic path
// already has an object — the whole reason paths are content-addressed by
// source-URL hash, so every script here is safely re-runnable.
async function objectExists(supabase, bucket, path) {
  const dir = path.split('/').slice(0, -1).join('/')
  const name = path.split('/').pop()
  const { data } = await supabase.storage.from(bucket).list(dir, {
    search: name,
  })
  return Boolean(data?.some((f) => f.name === name))
}

async function uploadIfMissing(supabase, bucket, path, buffer, contentType, { dryRun } = {}) {
  if (await objectExists(supabase, bucket, path)) {
    return { path, skipped: true }
  }
  if (dryRun) {
    return { path, skipped: false, wouldUpload: true }
  }
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: false, cacheControl: CACHE_CONTROL })
  // Another process/run winning the race to create the same deterministic
  // path is not a failure — the content is identical by construction.
  if (error && !/already exists/i.test(error.message)) throw error
  return { path, skipped: false }
}

export async function ensurePublicBucket(supabase, bucket) {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw error
  if (buckets.some((b) => b.name === bucket)) return
  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
  })
  if (createError) throw createError
}

function publicUrl(supabase, bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

// Product photos: two WebP widths (cards use the smaller one today; 960w is
// kept for anything rendering larger / a future <picture> srcset without
// needing to reprocess). Returns the 960w URL as the single URL callers
// write into products.image/images, plus sourceUrl for image_source_url.
//
// dryRun: still downloads and runs the real sharp conversion (so a dry run
// genuinely proves the source is reachable and processable), but never
// calls Storage's upload endpoint — `wouldUpload` on the result says
// whether this source is actually new work or already-processed.
export async function processProductImage(supabase, bucket, slug, sourceUrl, { dryRun = false } = {}) {
  const { buffer } = await downloadImage(sourceUrl)
  const hash = shortHash(sourceUrl)

  const [w480, w960] = await Promise.all([
    sharp(buffer).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer(),
    sharp(buffer).resize({ width: 960, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer(),
  ])

  const path480 = `products/${slug}/${hash}-480.webp`
  const path960 = `products/${slug}/${hash}-960.webp`
  const result480 = await uploadIfMissing(supabase, bucket, path480, w480, 'image/webp', { dryRun })
  const result960 = await uploadIfMissing(supabase, bucket, path960, w960, 'image/webp', { dryRun })

  return {
    url: publicUrl(supabase, bucket, path960),
    url480: publicUrl(supabase, bucket, path480),
    sourceUrl,
    wouldUpload: Boolean(result480.wouldUpload || result960.wouldUpload),
  }
}

// Logos: SVGs are copied through untouched (they're already small and
// resolution-independent); raster icons/favicons are converted to a single
// capped WebP size, since a logo never needs a 960px variant.
export async function processLogo(supabase, bucket, prefix, slug, sourceUrl, { dryRun = false } = {}) {
  const { buffer, contentType } = await downloadImage(sourceUrl)
  const hash = shortHash(sourceUrl)

  if (isSvg(contentType, sourceUrl)) {
    const path = `${prefix}/${slug}-${hash}.svg`
    const result = await uploadIfMissing(supabase, bucket, path, buffer, 'image/svg+xml', { dryRun })
    return { url: publicUrl(supabase, bucket, path), sourceUrl, wouldUpload: Boolean(result.wouldUpload) }
  }

  const webp = await sharp(buffer)
    .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
  const path = `${prefix}/${slug}-${hash}.webp`
  const result = await uploadIfMissing(supabase, bucket, path, webp, 'image/webp', { dryRun })
  return { url: publicUrl(supabase, bucket, path), sourceUrl, wouldUpload: Boolean(result.wouldUpload) }
}

// Tiny concurrency limiter — avoids pulling in a dependency for something
// this small. Runs `tasks` (a list of zero-arg async functions) with at
// most `limit` in flight at once, and never lets one throw abort the rest.
export async function runWithConcurrency(tasks, limit, onResult) {
  let index = 0
  async function worker() {
    while (index < tasks.length) {
      const i = index++
      try {
        const result = await tasks[i]()
        onResult(i, { ok: true, result })
      } catch (err) {
        onResult(i, { ok: false, error: err })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
}
