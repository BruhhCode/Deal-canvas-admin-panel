import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const SIZES = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
} as const

export function Modal({
  title,
  onClose,
  children,
  size = 'md',
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: keyof typeof SIZES
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const field = dialogRef.current?.querySelector<HTMLElement>(
      'input, select, textarea',
    )
    field?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-10">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${SIZES[size]} rounded-lg border bg-card p-6 shadow-card`}
      >
        <div className="mb-5 flex items-center justify-between border-b pb-4">
          <h2 id={titleId} className="text-xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-sm p-1 text-muted-foreground hover:text-clay"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
