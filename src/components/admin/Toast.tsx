import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastVariant = 'success' | 'error'

type ToastAction = {
  label: string
  onClick: () => void
}

type ToastOptions = {
  variant?: ToastVariant
  action?: ToastAction
  // Errors stay up longer (and don't auto-dismiss the Undo window) since
  // they need to actually be read, not just glanced at.
  durationMs?: number
}

type Toast = {
  id: number
  message: string
  variant: ToastVariant
  action?: ToastAction
}

type ToastContextValue = {
  show: (message: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Admin panel previously surfaced every error via window.alert() -- a
// blocking native dialog with no visual consistency with the rest of the
// UI and no way to attach an action (e.g. "Undo"). This is the shared
// replacement: a non-blocking, ARIA-live stack mounted once in the layout.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = nextId.current++
      const variant = options?.variant ?? 'success'
      setToasts((prev) => [...prev, { id, message, variant, action: options?.action }])
      const duration = options?.durationMs ?? (variant === 'error' ? 6000 : 4000)
      window.setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-sm border px-4 py-3 text-sm shadow-card ${
              t.variant === 'error'
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-clay/30 bg-card text-foreground'
            }`}
          >
            <span>{t.message}</span>
            <div className="flex shrink-0 items-center gap-3">
              {t.action ? (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick()
                    dismiss(t.id)
                  }}
                  className="text-xs font-semibold uppercase tracking-[0.1em] text-clay hover:underline"
                >
                  {t.action.label}
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast() must be used within <ToastProvider>')
  return ctx
}
