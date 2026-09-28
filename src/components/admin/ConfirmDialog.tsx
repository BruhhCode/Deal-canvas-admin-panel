import { useEffect, useId, useRef } from 'react'
import { useFocusTrap } from './useFocusTrap'

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    // Cancel gets initial focus, not the destructive action -- a reflexive
    // Enter press right after opening a delete confirmation (very plausible
    // right after clicking a Trash icon) should never delete by accident.
    cancelRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-card"
      >
        <h2 id={titleId} className="text-lg">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-sm border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:border-clay"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-sm bg-destructive px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-destructive-foreground"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
