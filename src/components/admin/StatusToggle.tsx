import { useState } from 'react'
import { errorMessage } from './FormField'

// Same visual language as StatusBadge/DealBadge, but as a clickable button —
// used wherever a status is a simple two-state (active/inactive) field the
// admin should be able to flip without opening the full Edit modal.
export function StatusToggle({
  active,
  activeLabel,
  inactiveLabel,
  onToggle,
  errorFallback,
}: {
  active: boolean
  activeLabel: string
  inactiveLabel: string
  onToggle: (next: boolean) => Promise<void>
  errorFallback: string
}) {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    try {
      await onToggle(!active)
    } catch (err) {
      window.alert(errorMessage(err, errorFallback))
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={`Toggle status (currently ${active ? activeLabel : inactiveLabel})`}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-70 disabled:opacity-50 ${
        active
          ? 'border-clay/30 bg-clay/10 text-clay'
          : 'border-border bg-muted text-muted-foreground'
      }`}
    >
      {pending ? '...' : active ? activeLabel : inactiveLabel}
    </button>
  )
}
