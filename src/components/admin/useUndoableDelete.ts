import { useCallback, useRef, useState } from 'react'
import { errorMessage } from './FormField'
import { useToast } from './Toast'

const UNDO_WINDOW_MS = 5000

// Deletes across the admin panel used to be immediate and permanent the
// moment ConfirmDialog's Delete button was pressed -- unforgiving for a
// catalog with hundreds of rows and no other safety net. This defers the
// actual network call by UNDO_WINDOW_MS behind a toast with an Undo action;
// the row disappears from the UI immediately (via `isHidden`) so it still
// *feels* deleted, but nothing is sent to Supabase until the window elapses.
export function useUndoableDelete(deleteFn: (key: string) => Promise<void>, errorFallback: string) {
  const toast = useToast()
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const isHidden = useCallback((key: string) => hidden.has(key), [hidden])

  const scheduleDelete = useCallback(
    (key: string, label: string) => {
      setHidden((prev) => new Set(prev).add(key))

      const timer = setTimeout(async () => {
        timers.current.delete(key)
        try {
          await deleteFn(key)
        } catch (err) {
          setHidden((prev) => {
            const next = new Set(prev)
            next.delete(key)
            return next
          })
          toast.show(errorMessage(err, errorFallback), { variant: 'error' })
        }
      }, UNDO_WINDOW_MS)
      timers.current.set(key, timer)

      toast.show(`${label} deleted`, {
        action: {
          label: 'Undo',
          onClick: () => {
            const t = timers.current.get(key)
            if (t) clearTimeout(t)
            timers.current.delete(key)
            setHidden((prev) => {
              const next = new Set(prev)
              next.delete(key)
              return next
            })
          },
        },
      })
    },
    [deleteFn, errorFallback, toast],
  )

  return { isHidden, scheduleDelete }
}
