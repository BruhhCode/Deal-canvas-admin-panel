/**
 * Real "time since last update" — replaces the old `updated_hours_ago` field,
 * which was a plain number typed by hand into a form (defaulting to 0 on
 * every new product/CSV row) and never changed itself, so every product
 * looked equally "fresh" regardless of when it was actually touched. Every
 * table has a genuine `updated_at` timestamptz column already; the DB has no
 * trigger that bumps it on UPDATE, so every write in data.ts must set it
 * explicitly (see updateProduct/updateBrand/etc.) for this to reflect reality.
 */
import { useEffect, useState } from 'react'

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 5) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/**
 * Ticks on an interval so components displaying `timeAgo(...)` re-render and
 * stay current while the page is open, instead of freezing at whatever the
 * label said on the last data load. The returned value is unused by callers
 * — it exists only to change on every tick and trigger a re-render.
 */
export function useLiveNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
